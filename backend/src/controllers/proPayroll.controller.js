/**
 * ============================================================
 * PROFESSIONAL PAYROLL CONTROLLER — Company-Level RBAC
 * ============================================================
 * Handles all payroll API endpoints with strict role-based access.
 *
 * Roles:
 *   ADMIN   → Full access (create structure, generate, approve, pay, export, delete)
 *   MANAGER → Mark attendance, generate payroll, view salary, download payslips
 *   EMPLOYEE→ View own attendance, view own salary, download own payslip
 *
 * Endpoints:
 *   Salary Structure:
 *     POST   /api/pro-payroll/salary-structure          → Create structure (ADMIN)
 *     GET    /api/pro-payroll/salary-structures          → List all (ADMIN, MANAGER)
 *     PUT    /api/pro-payroll/salary-structure/:id       → Update structure (ADMIN)
 *     DELETE /api/pro-payroll/salary-structure/:id       → Delete structure (ADMIN)
 *     POST   /api/pro-payroll/assign-structure           → Assign to employee (ADMIN)
 *
 *   Payroll:
 *     POST   /api/pro-payroll/generate/:employeeId       → Generate single (ADMIN, MANAGER)
 *     POST   /api/pro-payroll/generate-all               → Generate bulk (ADMIN, MANAGER)
 *     POST   /api/pro-payroll/approve/:id                → Approve (ADMIN)
 *     POST   /api/pro-payroll/mark-paid/:id              → Mark paid (ADMIN)
 *     GET    /api/pro-payroll/:employeeId                 → Get payroll history (role-filtered)
 *     GET    /api/pro-payroll/slip/:id                    → Download PDF payslip
 *     GET    /api/pro-payroll/export-excel                → Export Excel (?month=YYYY-MM)
 *     GET    /api/pro-payroll/dashboard                   → Dashboard stats (ADMIN, MANAGER)
 *     DELETE /api/pro-payroll/:id                         → Delete payroll (ADMIN)
 * ============================================================
 */
const Employee = require('../models/Employee');
const SalaryStructure = require('../models/SalaryStructure');
const Payroll = require('../models/Payroll');
const Salary = require('../models/Salary');
const { generateMonthlyPayroll, generateAllPayrolls } = require('../services/payroll.service');
const { generatePayslipPDF } = require('../services/pdf.service');
const { generatePayrollExcel } = require('../services/excel.service');

// ────────────────────────────────────────────────────────
// HELPER: Normalize old Salary records to Payroll format
// ────────────────────────────────────────────────────────
function normalizeSalaryToPayroll(salary) {
  const monthStr = `${salary.year}-${String(salary.month).padStart(2, '0')}`;
  const emp = salary.employee; // populated or ObjectId
  return {
    _id: salary._id,
    employeeId: emp,
    month: monthStr,
    status: 'Paid',
    basic: salary.basicSalary || 0,
    hra: 0,
    conveyance: 0,
    specialAllowance: 0,
    grossSalary: (salary.basicSalary || 0) + (salary.bonus || 0) + (salary.incentives || 0),
    totalWorkingDays: salary.totalWorkingDays || 0,
    presentDays: salary.presentDays || 0,
    absentDays: salary.absentDays || 0,
    halfDays: 0,
    leaveDays: salary.leaveDays || 0,
    pfDeduction: 0,
    taxDeduction: 0,
    attendanceDeduction: 0,
    totalDeductions: salary.deductions || 0,
    bonus: salary.bonus || 0,
    incentives: salary.incentives || 0,
    netSalary: salary.netPay || 0,
    generatedBy: salary.generatedBy,
    approvedBy: null,
    paidBy: salary.paidBy,
    generatedAt: salary.createdAt,
    approvedAt: null,
    paidAt: salary.paidAt,
    notes: salary.notes || '',
    _source: 'salary',
    createdAt: salary.createdAt,
    updatedAt: salary.updatedAt,
  };
}

/**
 * Parse 'YYYY-MM' into { month: Number, year: Number } for old Salary queries
 */
function parseYYYYMM(monthStr) {
  if (!monthStr || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) return null;
  const [y, m] = monthStr.split('-');
  return { month: parseInt(m), year: parseInt(y) };
}

// ────────────────────────────────────────────────────────
// SALARY STRUCTURE CRUD
// ────────────────────────────────────────────────────────

/**
 * POST /salary-structure — Create a new salary structure (ADMIN only)
 */
exports.createSalaryStructure = async (req, res, next) => {
  try {
    const { basic, hra, conveyance, specialAllowance, pfPercent, taxPercent, label } = req.body;

    if (!basic || basic <= 0) {
      return res.status(400).json({ message: 'Basic salary is required and must be > 0' });
    }

    const structure = await SalaryStructure.create({
      basic,
      hra: hra || 0,
      conveyance: conveyance || 0,
      specialAllowance: specialAllowance || 0,
      pfPercent: pfPercent || 0,
      taxPercent: taxPercent || 0,
      label: label || '',
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Salary structure created', data: structure });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /salary-structures — List all salary structures (ADMIN, MANAGER)
 */
exports.getSalaryStructures = async (req, res, next) => {
  try {
    const structures = await SalaryStructure.find().sort({ createdAt: -1 });
    res.json({ data: structures });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /salary-structure/:id — Update a salary structure (ADMIN only)
 */
exports.updateSalaryStructure = async (req, res, next) => {
  try {
    const { basic, hra, conveyance, specialAllowance, pfPercent, taxPercent, label } = req.body;
    const structure = await SalaryStructure.findByIdAndUpdate(
      req.params.id,
      { basic, hra, conveyance, specialAllowance, pfPercent, taxPercent, label },
      { new: true, runValidators: true }
    );
    if (!structure) return res.status(404).json({ message: 'Salary structure not found' });

    res.json({ message: 'Updated', data: structure });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /salary-structure/:id — Delete a salary structure (ADMIN only)
 */
exports.deleteSalaryStructure = async (req, res, next) => {
  try {
    // Check if any employee is using this structure
    const inUse = await Employee.findOne({ salaryStructureId: req.params.id });
    if (inUse) {
      return res.status(400).json({
        message: `Cannot delete — structure is assigned to ${inUse.name}. Remove assignment first.`,
      });
    }

    const deleted = await SalaryStructure.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Salary structure not found' });

    res.json({ message: 'Salary structure deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /assign-structure — Assign salary structure to employee (ADMIN only)
 * Body: { employeeId, salaryStructureId }
 */
exports.assignStructure = async (req, res, next) => {
  try {
    const { employeeId, salaryStructureId } = req.body;

    if (!employeeId || !salaryStructureId) {
      return res.status(400).json({ message: 'employeeId and salaryStructureId are required' });
    }

    const structure = await SalaryStructure.findById(salaryStructureId);
    if (!structure) return res.status(404).json({ message: 'Salary structure not found' });

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        salaryStructureId,
        basicSalary: structure.basic, // Sync legacy field
      },
      { new: true }
    ).populate('salaryStructureId');

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.json({ message: `Structure "${structure.label || 'Default'}" assigned to ${employee.name}`, data: employee });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// PAYROLL GENERATION
// ────────────────────────────────────────────────────────

/**
 * POST /generate/:employeeId — Generate payroll for a single employee (ADMIN, MANAGER)
 * Body: { month: "YYYY-MM", bonus?, incentives?, notes? }
 */
exports.generatePayroll = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { month, bonus, incentives, notes } = req.body;

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'month is required in YYYY-MM format' });
    }

    const payroll = await generateMonthlyPayroll(employeeId, month, {
      bonus: bonus || 0,
      incentives: incentives || 0,
      notes: notes || '',
      generatedBy: req.user.id,
    });

    // Real-time: notify managers
    try {
      const { emitToAll } = require('../utils/socket.util');
      emitToAll('payroll:managerUpdate', { month });
    } catch (e) { /* ignore */ }

    res.status(201).json({
      message: 'Payroll generated successfully',
      data: payroll,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

/**
 * POST /generate-all — Generate payroll for all active employees (ADMIN, MANAGER)
 * Body: { month: "YYYY-MM", notes? }
 */
exports.generateAllPayroll = async (req, res, next) => {
  try {
    const { month, notes } = req.body;

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'month is required in YYYY-MM format' });
    }

    const results = await generateAllPayrolls(month, {
      notes: notes || '',
      generatedBy: req.user.id,
    });

    // Real-time: notify managers
    try {
      const { emitToAll } = require('../utils/socket.util');
      emitToAll('payroll:managerUpdate', { month });
    } catch (e) { /* ignore */ }

    res.status(201).json({
      message: `Generated: ${results.generated.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// PAYROLL WORKFLOW (Approve → Pay → Lock)
// ────────────────────────────────────────────────────────

/**
 * POST /approve/:id — Approve a generated payroll (ADMIN only)
 */
exports.approvePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    if (payroll.status !== 'Generated') {
      return res.status(400).json({ message: `Cannot approve — current status is "${payroll.status}"` });
    }

    payroll.status = 'Approved';
    payroll.approvedBy = req.user.id;
    payroll.approvedAt = new Date();
    await payroll.save();

    await payroll.populate('employeeId', 'name email designation role');

    // Real-time: notify managers
    try {
      const { emitToAll } = require('../utils/socket.util');
      emitToAll('payroll:managerUpdate', { month: payroll.month });
    } catch (e) { /* ignore */ }

    res.json({ message: 'Payroll approved', data: payroll });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /mark-paid/:id — Mark an approved payroll as Paid (ADMIN only)
 * Once paid, the record is locked — no further edits.
 */
exports.markPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    if (payroll.status !== 'Approved') {
      return res.status(400).json({ message: `Cannot mark as paid — must be "Approved" first, current: "${payroll.status}"` });
    }

    payroll.status = 'Paid';
    payroll.paidBy = req.user.id;
    payroll.paidAt = new Date();
    await payroll.save();

    await payroll.populate('employeeId', 'name email designation role');

    // ── Real-time update: emit to employee and all managers ──
    try {
      const { emitToUser, emitToAll } = require('../utils/socket.util');
      // Notify the employee
      emitToUser(payroll.employeeId._id, 'payroll:paid', { payrollId: payroll._id, month: payroll.month });
      // Notify all managers (for dashboard refresh)
      emitToAll('payroll:managerUpdate', { month: payroll.month });
    } catch (e) { /* ignore socket errors */ }

    res.json({ message: 'Payroll marked as Paid (locked)', data: payroll });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// PAYROLL QUERIES
// ────────────────────────────────────────────────────────

/**
 * GET /:employeeId — Get payroll history for an employee (role-filtered)
 *   ADMIN/MANAGER → can view any employee
 *   EMPLOYEE      → can only view own records
 * Query params: ?month=YYYY-MM (optional filter)
 */
exports.getPayroll = async (req, res, next) => {
  try {
    const requestedEmpId = req.params.employeeId;
    const userRole = (req.user.role || '').toUpperCase();

    // EMPLOYEE without Payroll Manage permission can only view their own payroll
    if (userRole === 'EMPLOYEE') {
      const emp = await Employee.findOne({ email: req.user.email });
      const hasPayrollManage = emp && Array.isArray(emp.permissions) && emp.permissions.includes('Payroll Manage');
      if (!hasPayrollManage && (!emp || emp._id.toString() !== requestedEmpId)) {
        return res.status(403).json({ message: 'Access denied — you can only view your own payroll' });
      }
    }

    const filter = { employeeId: requestedEmpId };
    if (req.query.month) filter.month = req.query.month;

    // ── NEW Payroll model ──
    const newPayrolls = await Payroll.find(filter)
      .populate('employeeId', 'name email designation role')
      .populate('generatedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ month: -1 });

    // ── OLD Salary model ──
    const oldFilter = { employee: requestedEmpId };
    if (req.query.month) {
      const parsed = parseYYYYMM(req.query.month);
      if (parsed) {
        oldFilter.month = parsed.month;
        oldFilter.year = parsed.year;
      }
    }

    const oldSalaries = await Salary.find(oldFilter)
      .populate('employee', 'name email designation role')
      .populate('generatedBy', 'name')
      .populate('paidBy', 'name')
      .sort({ year: -1, month: -1 });

    const normalizedOld = oldSalaries.map(normalizeSalaryToPayroll);

    // Deduplicate by month (prefer new system)
    const monthSet = new Set(newPayrolls.map(p => p.month));
    const merged = [
      ...newPayrolls,
      ...normalizedOld.filter(r => !monthSet.has(r.month)),
    ];

    merged.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    res.json({ data: merged });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /all-payrolls — Get all payroll records (ADMIN, MANAGER)
 * Query params: ?month=YYYY-MM&status=Generated|Approved|Paid
 */
exports.getAllPayrolls = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.status) filter.status = req.query.status;

    // ── NEW Payroll model ──
    const newPayrolls = await Payroll.find(filter)
      .populate('employeeId', 'name email designation role')
      .populate('generatedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ month: -1, createdAt: -1 });

    // ── OLD Salary model ──
    const oldFilter = {};
    if (req.query.month) {
      const parsed = parseYYYYMM(req.query.month);
      if (parsed) {
        oldFilter.month = parsed.month;
        oldFilter.year = parsed.year;
      }
    }
    // Map status filters
    if (req.query.status) {
      const statusMap = { 'Generated': 'GENERATED', 'Approved': 'GENERATED', 'Paid': 'PAID' };
      if (statusMap[req.query.status]) oldFilter.status = statusMap[req.query.status];
    }

    const oldPayrolls = await Salary.find(oldFilter)
      .populate('employee', 'name email designation role')
      .populate('generatedBy', 'name')
      .populate('paidBy', 'name')
      .sort({ year: -1, month: -1 });

    const normalizedOld = oldPayrolls.map(normalizeSalaryToPayroll);

    // Deduplicate: for same employee + month, prefer new system
    const seen = new Set();
    newPayrolls.forEach(p => {
      const empId = (p.employeeId?._id || p.employeeId || '').toString();
      seen.add(`${empId}_${p.month}`);
    });

    const merged = [
      ...newPayrolls,
      ...normalizedOld.filter(r => {
        const empId = (r.employeeId?._id || r.employeeId || '').toString();
        return !seen.has(`${empId}_${r.month}`);
      }),
    ];

    merged.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    res.json({ data: merged });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// PDF PAYSLIP
// ────────────────────────────────────────────────────────

/**
 * GET /slip/:id — Download PDF payslip
 *   ADMIN/MANAGER → any payslip
 *   EMPLOYEE      → own payslip only
 */
exports.downloadSlip = async (req, res, next) => {
  try {
    let payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'name email designation department role joiningDate uanNumber bankAccountLast4');

    let empData = payroll?.employeeId;
    let isOldModel = false;

    // If not found in new model, try old Salary model
    if (!payroll) {
      const salary = await Salary.findById(req.params.id)
        .populate('employee', 'name email designation department role joiningDate uanNumber bankAccountLast4');
      if (salary) {
        payroll = normalizeSalaryToPayroll(salary);
        empData = salary.employee;
        isOldModel = true;
      }
    }

    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    // EMPLOYEE restriction — employees with Payroll Manage can download any
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'EMPLOYEE') {
      const emp = await Employee.findOne({ email: req.user.email });
      const hasPayrollManage = emp && Array.isArray(emp.permissions) && emp.permissions.includes('Payroll Manage');
      if (!hasPayrollManage) {
        const payrollEmpId = isOldModel
          ? (empData?._id || payroll.employeeId)
          : (payroll.employeeId?._id || payroll.employeeId);
        if (!emp || payrollEmpId.toString() !== emp._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    // For old model, empData is already the populated employee object
    const employeeForPdf = isOldModel ? empData : payroll.employeeId;

    const pdfBuffer = await generatePayslipPDF(payroll, employeeForPdf);
    const empName = (employeeForPdf?.name || 'employee').replace(/\s+/g, '_');
    const filename = `payslip_${empName}_${payroll.month}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// EXCEL EXPORT
// ────────────────────────────────────────────────────────

/**
 * GET /export-excel?month=YYYY-MM — Export payroll as Excel (ADMIN, MANAGER)
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'month query param required in YYYY-MM format' });
    }

    // ── NEW Payroll model ──
    const newPayrolls = await Payroll.find({ month })
      .populate('employeeId', 'name email designation role')
      .sort({ createdAt: 1 });

    // ── OLD Salary model ──
    const parsed = parseYYYYMM(month);
    let oldPayrolls = [];
    if (parsed) {
      const oldSalaries = await Salary.find({ month: parsed.month, year: parsed.year })
        .populate('employee', 'name email designation role')
        .sort({ createdAt: 1 });
      oldPayrolls = oldSalaries.map(normalizeSalaryToPayroll);
    }

    // Deduplicate: for same employee + month, prefer new system
    const seen = new Set();
    newPayrolls.forEach(p => {
      const empId = (p.employeeId?._id || p.employeeId || '').toString();
      seen.add(empId);
    });
    const merged = [
      ...newPayrolls,
      ...oldPayrolls.filter(r => {
        const empId = (r.employeeId?._id || r.employeeId || '').toString();
        return !seen.has(empId);
      }),
    ];

    // Always generate Excel — even if no records (sheet will show empty state)
    const buffer = await generatePayrollExcel(merged, month);
    const filename = `payroll_${month}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// DASHBOARD STATS
// ────────────────────────────────────────────────────────

/**
 * GET /dashboard?month=YYYY-MM — Payroll dashboard stats (ADMIN, MANAGER)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const month = req.query.month || getCurrentMonth();

    // ── NEW Payroll model ──
    const payrolls = await Payroll.find({ month });

    // ── OLD Salary model ──
    const parsed = parseYYYYMM(month);
    let oldPayrolls = [];
    if (parsed) {
      const oldSalaries = await Salary.find({ month: parsed.month, year: parsed.year });
      oldPayrolls = oldSalaries.map(normalizeSalaryToPayroll);
    }

    // Deduplicate: for same employeeId+month, prefer new system
    const seen = new Set();
    payrolls.forEach(p => {
      seen.add((p.employeeId || '').toString());
    });
    const uniqueOld = oldPayrolls.filter(r => {
      const empId = (r.employeeId?._id || r.employeeId || '').toString();
      return !seen.has(empId);
    });

    const allPayrolls = [...payrolls, ...uniqueOld];

    const totalSalary = allPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const pendingApprovals = allPayrolls.filter(p => p.status === 'Generated').length;
    const approvedCount = allPayrolls.filter(p => p.status === 'Approved').length;
    const paidCount = allPayrolls.filter(p => p.status === 'Paid').length;
    const totalEmployees = allPayrolls.length;

    // Attendance aggregation for the month
    const totalPresent = allPayrolls.reduce((s, p) => s + (p.presentDays || 0), 0);
    const totalWorkingDaysSum = allPayrolls.reduce((s, p) => s + (p.totalWorkingDays || 0), 0);
    const attendancePercent = totalWorkingDaysSum > 0
      ? Math.round((totalPresent / totalWorkingDaysSum) * 100)
      : 0;

    res.json({
      data: {
        month,
        totalSalary: Math.round(totalSalary * 100) / 100,
        pendingApprovals,
        approvedCount,
        paidCount,
        totalEmployees,
        attendancePercent,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// DELETE PAYROLL (ADMIN only — cannot delete Paid records)
// ────────────────────────────────────────────────────────

/**
 * DELETE /:id — Delete a payroll record (ADMIN only)
 */
exports.deletePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    if (payroll.status === 'Paid') {
      return res.status(400).json({ message: 'Cannot delete a Paid payroll record — it is locked' });
    }

    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────
// EMPLOYEE RECEIPTS — Paid payrolls for the logged-in employee
// ────────────────────────────────────────────────────────

/**
 * GET /my-receipts — Get all Paid payroll receipts for the logged-in employee
 * Only returns records with status === 'Paid'.
 */
exports.getMyReceipts = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) return res.status(404).json({ message: 'Employee record not found' });

    // ── Query NEW Payroll model ──
    const newReceipts = await Payroll.find({ employeeId: emp._id, status: 'Paid' })
      .populate('employeeId', 'name email designation department role joiningDate uanNumber bankAccountLast4')
      .populate('generatedBy', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name')
      .sort({ month: -1 });

    // ── Query OLD Salary model ──
    const oldReceipts = await Salary.find({ employee: emp._id, status: 'PAID' })
      .populate('employee', 'name email designation department role joiningDate uanNumber bankAccountLast4')
      .populate('generatedBy', 'name')
      .populate('paidBy', 'name')
      .sort({ year: -1, month: -1 });

    // Normalize old records to Payroll shape
    const normalizedOld = oldReceipts.map(normalizeSalaryToPayroll);

    // Merge — deduplicate by month string (prefer new system records)
    const monthSet = new Set(newReceipts.map(r => r.month));
    const merged = [
      ...newReceipts,
      ...normalizedOld.filter(r => !monthSet.has(r.month)),
    ];

    // Sort by month descending
    merged.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    res.json({ data: merged });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /receipt/:id — View a single receipt detail (EMPLOYEE own-only)
 */
exports.getReceiptById = async (req, res, next) => {
  try {
    let payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'name email designation department role joiningDate uanNumber bankAccountLast4')
      .populate('generatedBy', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name');

    let isOldModel = false;

    // If not found in new Payroll model, try old Salary model
    if (!payroll) {
      const salary = await Salary.findById(req.params.id)
        .populate('employee', 'name email designation department role joiningDate uanNumber bankAccountLast4')
        .populate('generatedBy', 'name')
        .populate('paidBy', 'name');
      if (salary && salary.status === 'PAID') {
        payroll = normalizeSalaryToPayroll(salary);
        isOldModel = true;
      }
    }

    if (!payroll) return res.status(404).json({ message: 'Receipt not found' });

    // EMPLOYEE without Payroll Manage can only view own receipt
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'EMPLOYEE') {
      const emp = await Employee.findOne({ email: req.user.email });
      const hasPayrollManage = emp && Array.isArray(emp.permissions) && emp.permissions.includes('Payroll Manage');
      if (!hasPayrollManage) {
        const empId = isOldModel
          ? (payroll.employeeId?._id || payroll.employeeId)
          : (payroll.employeeId?._id || payroll.employeeId);
        if (!emp || empId.toString() !== emp._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    if (!isOldModel && payroll.status !== 'Paid') {
      return res.status(400).json({ message: 'Receipt is only available for paid payrolls' });
    }

    res.json({ data: payroll });
  } catch (err) {
    next(err);
  }
};

// ── Utility ──

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
