/**
 * ============================================================
 * PAYROLL CALCULATION SERVICE
 * ============================================================
 * Core business logic for professional salary computation.
 *
 * Features:
 *   • Calculates gross from salary structure components
 *   • Auto-excludes Sundays from working days
 *   • Pro-rata for mid-month joiners
 *   • Attendance deduction (absent + half-day)
 *   • PF & Tax deductions from percentages
 *   • Safe floating point (2-decimal rounding)
 *   • Never returns negative salary
 *   • Uses MongoDB transactions for data integrity
 *
 * Timezone: Asia/Kolkata (IST)
 * ============================================================
 */
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const SalaryStructure = require('../models/SalaryStructure');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');

// ── Helpers ──────────────────────────────────────────────

/**
 * Round to 2 decimal places (financial rounding)
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Count working days (Mon–Sat) in a given YYYY-MM month.
 * Sundays are auto-excluded per specification.
 */
function getWorkingDaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate(); // e.g. 28/29/30/31
  let workingDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay(); // 0=Sun
    if (day !== 0) workingDays++; // Exclude Sundays only
  }
  return workingDays;
}

/**
 * Count effective working days for an employee (handles mid-month join).
 * If employee joined after the 1st of the month, only count from joiningDate.
 */
function getEffectiveWorkingDays(yearMonth, joiningDate) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  // Determine effective start date within the month
  let startDay = 1;
  if (joiningDate) {
    const jd = new Date(joiningDate);
    // If joining date falls in this month, start from joining day
    if (jd.getFullYear() === year && jd.getMonth() === month - 1 && jd.getDate() > 1) {
      startDay = jd.getDate();
    }
    // If joining is after this month entirely, 0 working days
    if (jd > monthEnd) return 0;
  }

  let workingDays = 0;
  for (let d = startDay; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) workingDays++;
  }
  return workingDays;
}

/**
 * Fetch attendance counts for an employee in a given YYYY-MM month.
 * Returns { presentDays, absentDays, halfDays, leaveDays }
 */
async function getAttendanceStats(employeeId, yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

  const records = await Attendance.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
  });

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;

  records.forEach((r) => {
    switch (r.status) {
      case 'PRESENT':  presentDays++; break;
      case 'ABSENT':   absentDays++;  break;
      case 'HALF_DAY': halfDays++;    break;
      case 'LEAVE':    leaveDays++;   break;
      default:         break;
    }
  });

  return { presentDays, absentDays, halfDays, leaveDays };
}

// ── Main Payroll Generator ────────────────────────────────

/**
 * generateMonthlyPayroll(employeeId, month, options)
 *
 * @param {String} employeeId  — Mongoose ObjectId
 * @param {String} month       — "YYYY-MM" format
 * @param {Object} options     — { bonus, incentives, notes, generatedBy }
 * @returns {Object}           — saved Payroll document
 *
 * Uses MongoDB transaction for atomicity.
 */
async function generateMonthlyPayroll(employeeId, month, options = {}) {
  const { bonus = 0, incentives = 0, notes = '', generatedBy } = options;

  // ── Step 0: Validate employee & salary structure ──
  const employee = await Employee.findById(employeeId).populate('salaryStructureId');
  if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 });
  if (employee.status !== 'active') throw Object.assign(new Error('Employee is inactive'), { status: 400 });

  const structure = employee.salaryStructureId;
  if (!structure) throw Object.assign(new Error('No salary structure assigned to this employee. Admin must assign one first.'), { status: 400 });

  // ── Step 1: Gross Salary ──
  const basic = round2(structure.basic || 0);
  const hra = round2(structure.hra || 0);
  const conveyance = round2(structure.conveyance || 0);
  const specialAllowance = round2(structure.specialAllowance || 0);
  const grossSalary = round2(basic + hra + conveyance + specialAllowance);

  // ── Step 2: Working Days ──
  const totalWorkingDays = getWorkingDaysInMonth(month);
  const effectiveWorkingDays = getEffectiveWorkingDays(month, employee.joiningDate);

  // ── Step 3: Per Day Salary ──
  const perDaySalary = effectiveWorkingDays > 0 ? round2(grossSalary / totalWorkingDays) : 0;

  // ── Step 4: Attendance Stats ──
  const attendance = await getAttendanceStats(employeeId, month);

  // ── Step 5: Attendance Deduction ──
  // (absentDays × perDaySalary) + (halfDays × perDaySalary × 0.5)
  const attendanceDeduction = round2(
    (attendance.absentDays * perDaySalary) +
    (attendance.halfDays * perDaySalary * 0.5)
  );

  // ── Step 6: PF & Tax Deductions ──
  const pfDeduction = round2(basic * (structure.pfPercent || 0) / 100);
  const taxDeduction = round2(grossSalary * (structure.taxPercent || 0) / 100);

  // ── Step 7: Total Deductions ──
  const totalDeductions = round2(attendanceDeduction + pfDeduction + taxDeduction);

  // ── Step 8: Net Salary ──
  // gross - totalDeductions + bonus + incentives (never negative)
  const netSalary = round2(Math.max(0, grossSalary - totalDeductions + round2(bonus) + round2(incentives)));

  // ── Pro-rata adjustment for mid-month joiners ──
  // If employee joined mid-month, prorate the gross salary
  let proRataGross = grossSalary;
  if (effectiveWorkingDays < totalWorkingDays && totalWorkingDays > 0) {
    proRataGross = round2(grossSalary * effectiveWorkingDays / totalWorkingDays);
  }

  // Recalculate net if pro-rata applies
  let finalNet = netSalary;
  if (effectiveWorkingDays < totalWorkingDays && totalWorkingDays > 0) {
    const proRataPf = round2(round2(basic * effectiveWorkingDays / totalWorkingDays) * (structure.pfPercent || 0) / 100);
    const proRataTax = round2(proRataGross * (structure.taxPercent || 0) / 100);
    const proRataTotal = round2(attendanceDeduction + proRataPf + proRataTax);
    finalNet = round2(Math.max(0, proRataGross - proRataTotal + round2(bonus) + round2(incentives)));
  }

  // ── Build payroll document ──
  const payrollData = {
    employeeId,
    month,
    basic,
    hra,
    conveyance,
    specialAllowance,
    grossSalary: effectiveWorkingDays < totalWorkingDays ? proRataGross : grossSalary,
    totalWorkingDays,
    presentDays: attendance.presentDays,
    absentDays: attendance.absentDays,
    halfDays: attendance.halfDays,
    leaveDays: attendance.leaveDays,
    pfDeduction: effectiveWorkingDays < totalWorkingDays
      ? round2(round2(basic * effectiveWorkingDays / totalWorkingDays) * (structure.pfPercent || 0) / 100)
      : pfDeduction,
    taxDeduction: effectiveWorkingDays < totalWorkingDays
      ? round2(proRataGross * (structure.taxPercent || 0) / 100)
      : taxDeduction,
    attendanceDeduction,
    totalDeductions: effectiveWorkingDays < totalWorkingDays
      ? round2(attendanceDeduction +
          round2(round2(basic * effectiveWorkingDays / totalWorkingDays) * (structure.pfPercent || 0) / 100) +
          round2(proRataGross * (structure.taxPercent || 0) / 100))
      : totalDeductions,
    bonus: round2(bonus),
    incentives: round2(incentives),
    netSalary: effectiveWorkingDays < totalWorkingDays ? finalNet : netSalary,
    status: 'Generated',
    generatedBy,
    generatedAt: new Date(),
    notes,
  };

  // ── Save with transaction ──
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check duplicate within transaction
    const duplicate = await Payroll.findOne({ employeeId, month }).session(session);
    if (duplicate) {
      await session.abortTransaction();
      throw Object.assign(
        new Error(`Payroll already generated for ${month}. Delete or edit the existing record.`),
        { status: 409 }
      );
    }

    const [payroll] = await Payroll.create([payrollData], { session });
    await session.commitTransaction();

    // Populate for response
    await payroll.populate('employeeId', 'name email designation role');

    return payroll;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * generateAllPayrolls(month, options)
 *
 * Generate payroll for ALL active employees who don't already have one for the month.
 * Returns { generated[], skipped[], errors[] }
 */
async function generateAllPayrolls(month, options = {}) {
  const { notes = '', generatedBy } = options;
  const employees = await Employee.find({ status: 'active' });
  const results = { generated: [], skipped: [], errors: [] };

  for (const emp of employees) {
    try {
      // Skip if no salary structure
      if (!emp.salaryStructureId) {
        results.skipped.push({ id: emp._id, name: emp.name, reason: 'No salary structure assigned' });
        continue;
      }

      // Skip if already generated
      const exists = await Payroll.findOne({ employeeId: emp._id, month });
      if (exists) {
        results.skipped.push({ id: emp._id, name: emp.name, reason: 'Already generated' });
        continue;
      }

      const payroll = await generateMonthlyPayroll(emp._id, month, { notes, generatedBy });
      results.generated.push({ id: emp._id, name: emp.name, netSalary: payroll.netSalary });
    } catch (err) {
      results.errors.push({ id: emp._id, name: emp.name, error: err.message });
    }
  }

  return results;
}

module.exports = {
  generateMonthlyPayroll,
  generateAllPayrolls,
  getWorkingDaysInMonth,
  getAttendanceStats,
  round2,
};
