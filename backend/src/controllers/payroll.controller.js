/**
 * ============================================================
 * PAYROLL CONTROLLER — Secure RBAC Payroll & Attendance Module
 * ============================================================
 *
 * PERMISSION MATRIX:
 * ┌──────────────────────────┬───────┬─────────┬──────────┐
 * │ Action                   │ ADMIN │ MANAGER │ EMPLOYEE │
 * ├──────────────────────────┼───────┼─────────┼──────────┤
 * │ Set basic salary         │  ✅   │   ❌    │    ❌    │
 * │ Generate payroll (one)   │  ✅   │   ✅    │    ❌    │
 * │ Generate payroll (bulk)  │  ✅   │   ✅    │    ❌    │
 * │ Edit bonus/incentives    │  ✅   │   ❌    │    ❌    │
 * │ Mark as paid             │  ✅   │   ❌    │    ❌    │
 * │ Delete salary record     │  ✅   │   ❌    │    ❌    │
 * │ View all salaries        │  ✅   │   ✅    │    ❌    │
 * │ View own salary          │  ✅   │   ✅    │    ✅    │
 * │ Download payslip         │  ✅   │   ✅    │  own only│
 * └──────────────────────────┴───────┴─────────┴──────────┘
 *
 * SECURITY: Backend validates role on EVERY request.
 *           Frontend role-hide is for UX, not security.
 * ============================================================
 */

const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// ─── Helper: Get attendance stats for an employee in a month/year ───
async function getAttendanceStats(employeeId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const [presentDays, absentDays, leaveDays] = await Promise.all([
    Attendance.countDocuments({ employee: employeeId, status: 'PRESENT', date: { $gte: startOfMonth, $lte: endOfMonth } }),
    Attendance.countDocuments({ employee: employeeId, status: 'ABSENT', date: { $gte: startOfMonth, $lte: endOfMonth } }),
    Attendance.countDocuments({ employee: employeeId, status: 'LEAVE', date: { $gte: startOfMonth, $lte: endOfMonth } }),
  ]);

  return {
    presentDays,
    absentDays,
    leaveDays,
    totalWorkingDays: presentDays + absentDays + leaveDays,
  };
}

// ─── Helper: Log unauthorized access attempt ───
function logUnauthorized(req, action) {
  console.warn(
    `⛔ UNAUTHORIZED ACCESS ATTEMPT | Action: ${action} | User: ${req.user?.id} | Role: ${req.user?.role} | IP: ${req.ip} | Time: ${new Date().toISOString()}`
  );
}

/**
 * ============================================================
 * SET BASIC SALARY — ADMIN ONLY
 * ============================================================
 * POST /api/payroll/set-salary
 * Body: { employeeId, basicSalary }
 */
exports.setBasicSalary = async (req, res, next) => {
  try {
    const { employeeId, basicSalary } = req.body;

    if (!employeeId || basicSalary === undefined || basicSalary === null) {
      return res.status(400).json({ message: 'employeeId and basicSalary are required' });
    }
    if (basicSalary < 0) {
      return res.status(400).json({ message: 'basicSalary cannot be negative' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Update or set the basic salary field on the employee
    employee.basicSalary = basicSalary;
    await employee.save();

    res.json({ message: 'Basic salary updated', employee: { _id: employee._id, name: employee.name, basicSalary: employee.basicSalary } });
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * GENERATE PAYROLL (SINGLE EMPLOYEE) — ADMIN & MANAGER
 * ============================================================
 * POST /api/payroll/generate
 * Body: { employeeId, month, year, bonus?, incentives?, deductions?, notes? }
 */
exports.generateSalary = async (req, res, next) => {
  try {
    const { employeeId, month, year, bonus, incentives, deductions, deductPerAbsent, notes } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ message: 'employeeId, month, and year are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const basicSalary = employee.basicSalary || 0;
    if (basicSalary <= 0) {
      return res.status(400).json({ message: 'Basic salary not set for this employee. Admin must set it first.' });
    }

    // Check if salary already exists for this month
    const existing = await Salary.findOne({ employee: employeeId, month, year });
    if (existing) {
      return res.status(409).json({ message: `Salary already generated for ${month}/${year}. Delete or edit it instead.` });
    }

    // Fetch attendance stats
    const attendance = await getAttendanceStats(employeeId, month, year);

    // ── Auto-calculate deduction based on absent days ──
    // Formula: perDayRate = basicSalary / 30, absentDeduction = perDayRate * absentDays
    let totalDeductions = parseFloat(deductions) || 0;
    let absentDeduction = 0;
    if (deductPerAbsent && attendance.absentDays > 0) {
      const perDayRate = Math.round(basicSalary / 30);
      absentDeduction = perDayRate * attendance.absentDays;
      totalDeductions += absentDeduction;
    }

    const salary = new Salary({
      employee: employeeId,
      month,
      year,
      basicSalary,
      bonus: bonus || 0,
      incentives: incentives || 0,
      deductions: totalDeductions,
      presentDays: attendance.presentDays,
      absentDays: attendance.absentDays,
      leaveDays: attendance.leaveDays,
      totalWorkingDays: attendance.totalWorkingDays,
      generatedBy: req.user.id,
      notes: (notes || '') + (absentDeduction > 0 ? ` | Absent deduction: ₹${absentDeduction} (${attendance.absentDays} days × ₹${Math.round(basicSalary/30)}/day)` : ''),
    });

    await salary.save();

    // Populate employee name for response
    await salary.populate('employee', 'name email role');

    res.status(201).json({ message: 'Salary generated', salary });
  } catch (err) {
    // Handle duplicate key for unique index
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Salary record already exists for this employee/month.' });
    }
    next(err);
  }
};

/**
 * ============================================================
 * GENERATE PAYROLL (BULK — ALL ACTIVE EMPLOYEES) — ADMIN & MANAGER
 * ============================================================
 * POST /api/payroll/generate-all
 * Body: { month, year, notes? }
 */
exports.generateAllSalaries = async (req, res, next) => {
  try {
    const { month, year, notes } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    // Get all active employees with basicSalary set
    const employees = await Employee.find({ status: 'active' });
    const results = { generated: [], skipped: [], errors: [] };

    for (const emp of employees) {
      try {
        // Skip if no basic salary
        if (!emp.basicSalary || emp.basicSalary <= 0) {
          results.skipped.push({ id: emp._id, name: emp.name, reason: 'No basic salary set' });
          continue;
        }

        // Skip if already generated
        const existing = await Salary.findOne({ employee: emp._id, month, year });
        if (existing) {
          results.skipped.push({ id: emp._id, name: emp.name, reason: 'Already generated' });
          continue;
        }

        const attendance = await getAttendanceStats(emp._id, month, year);

        // Auto-deduct per absent day for bulk generation
        let absentDeduction = 0;
        if (attendance.absentDays > 0) {
          const perDayRate = Math.round(emp.basicSalary / 30);
          absentDeduction = perDayRate * attendance.absentDays;
        }

        const salary = new Salary({
          employee: emp._id,
          month,
          year,
          basicSalary: emp.basicSalary,
          bonus: 0,
          incentives: 0,
          deductions: absentDeduction,
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          leaveDays: attendance.leaveDays,
          totalWorkingDays: attendance.totalWorkingDays,
          generatedBy: req.user.id,
          notes: (notes || '') + (absentDeduction > 0 ? ` | Absent deduction: ₹${absentDeduction} (${attendance.absentDays} days)` : ''),
        });

        await salary.save();
        results.generated.push({ id: emp._id, name: emp.name, netPay: salary.netPay });
      } catch (empErr) {
        results.errors.push({ id: emp._id, name: emp.name, error: empErr.message });
      }
    }

    res.status(201).json({
      message: `Bulk payroll complete: ${results.generated.length} generated, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * GET ALL SALARIES — ADMIN & MANAGER see all; EMPLOYEE sees own
 * ============================================================
 * GET /api/payroll
 * Query: ?month=&year=&employeeId=
 *
 * SECURITY: If role === EMPLOYEE, override any employeeId
 *           filter to return ONLY their own records.
 *           This prevents privilege escalation via query params.
 */
exports.getSalaries = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.query;
    const userRole = (req.user.role || '').toUpperCase();
    const filter = {};

    // ── SECURITY: Employee can ONLY see their own salary ──
    if (userRole === 'EMPLOYEE') {
      // Use employeeId from JWT token — never trust query params for employees
      if (!req.user.employeeId) {
        logUnauthorized(req, 'GET_SALARIES — Employee missing employeeId in token');
        return res.status(403).json({ message: 'Access denied: employee profile not linked' });
      }
      filter.employee = req.user.employeeId;
    } else if (employeeId) {
      // Admin/Manager can filter by specific employee
      filter.employee = employeeId;
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const salaries = await Salary.find(filter)
      .populate('employee', 'name email role phone')
      .populate('generatedBy', 'name')
      .populate('paidBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 });

    // Prevent caching
    res.set('Cache-Control', 'no-store');
    res.json(salaries);
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * GET SINGLE SALARY RECORD
 * ============================================================
 * GET /api/payroll/:id
 *
 * SECURITY: Employee can only access their own salary record.
 */
exports.getSalaryById = async (req, res, next) => {
  try {
    const salary = await Salary.findById(req.params.id)
      .populate('employee', 'name email role phone')
      .populate('generatedBy', 'name')
      .populate('paidBy', 'name');

    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    const userRole = (req.user.role || '').toUpperCase();

    // ── SECURITY: Employee can only see their own ──
    if (userRole === 'EMPLOYEE') {
      if (salary.employee._id.toString() !== req.user.employeeId) {
        logUnauthorized(req, `GET_SALARY_BY_ID — Employee ${req.user.id} tried to access salary of ${salary.employee._id}`);
        return res.status(403).json({ message: 'Access denied: you can only view your own salary' });
      }
    }

    res.json(salary);
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * EDIT BONUS / INCENTIVES / DEDUCTIONS — ADMIN ONLY
 * ============================================================
 * PUT /api/payroll/:id
 * Body: { bonus?, incentives?, deductions?, notes? }
 */
exports.updateSalary = async (req, res, next) => {
  try {
    const { bonus, incentives, deductions, notes } = req.body;

    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    if (salary.status === 'PAID') {
      return res.status(400).json({ message: 'Cannot edit a salary that is already marked as PAID' });
    }

    // Only update provided fields
    if (bonus !== undefined) salary.bonus = bonus;
    if (incentives !== undefined) salary.incentives = incentives;
    if (deductions !== undefined) salary.deductions = deductions;
    if (notes !== undefined) salary.notes = notes;

    // netPay recalculated in pre-save hook
    await salary.save();
    await salary.populate('employee', 'name email role');

    res.json({ message: 'Salary updated', salary });
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * MARK SALARY AS PAID — ADMIN ONLY
 * ============================================================
 * PUT /api/payroll/:id/pay
 */
exports.markAsPaid = async (req, res, next) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    if (salary.status === 'PAID') {
      return res.status(400).json({ message: 'Salary is already marked as PAID' });
    }

    salary.status = 'PAID';
    salary.paidAt = new Date();
    salary.paidBy = req.user.id;
    await salary.save();
    await salary.populate('employee', 'name email role');

    // ── Real-time: notify employee and managers ──
    try {
      const { emitToUser, emitToAll } = require('../utils/socket.util');
      const monthStr = `${salary.year}-${String(salary.month).padStart(2, '0')}`;
      emitToUser(salary.employee._id, 'payroll:paid', { payrollId: salary._id, month: monthStr });
      emitToAll('payroll:managerUpdate', { month: monthStr });
    } catch (e) { /* ignore socket errors */ }

    res.json({ message: 'Salary marked as paid', salary });
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * DELETE SALARY RECORD — ADMIN ONLY
 * ============================================================
 * DELETE /api/payroll/:id
 *
 * SECURITY: Only ADMIN can delete. Manager explicitly denied.
 */
exports.deleteSalary = async (req, res, next) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Salary record deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * ============================================================
 * GET PAYROLL SUMMARY STATS — ADMIN & MANAGER
 * ============================================================
 * GET /api/payroll/summary?month=&year=
 */
exports.getPayrollSummary = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const filter = { month, year };

    const salaries = await Salary.find(filter);

    const totalEmployees = salaries.length;
    const totalPayout = salaries.reduce((sum, s) => sum + s.netPay, 0);
    const totalBonus = salaries.reduce((sum, s) => sum + s.bonus, 0);
    const totalIncentives = salaries.reduce((sum, s) => sum + s.incentives, 0);
    const totalDeductions = salaries.reduce((sum, s) => sum + s.deductions, 0);
    const paidCount = salaries.filter(s => s.status === 'PAID').length;
    const pendingCount = salaries.filter(s => s.status === 'GENERATED').length;

    res.json({
      month,
      year,
      totalEmployees,
      totalPayout,
      totalBonus,
      totalIncentives,
      totalDeductions,
      paidCount,
      pendingCount,
    });
  } catch (err) {
    next(err);
  }
};
