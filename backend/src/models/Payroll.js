/**
 * ============================================================
 * PAYROLL MODEL — Professional Company-Level Payroll Record
 * ============================================================
 * One document per employee per month.
 * Tracks gross salary breakdown, all deductions, bonuses,
 * attendance snapshot, workflow status, and audit trail.
 *
 * Workflow: Generated → Approved → Paid (then locked)
 * ============================================================
 */
const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema(
  {
    // --- Employee Reference ---
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // --- Period (stored as "YYYY-MM" string for easy querying) ---
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM format'],
    },

    // --- Salary Breakdown ---
    basic:            { type: Number, default: 0, min: 0 },
    hra:              { type: Number, default: 0, min: 0 },
    conveyance:       { type: Number, default: 0, min: 0 },
    specialAllowance: { type: Number, default: 0, min: 0 },
    grossSalary:      { type: Number, default: 0, min: 0 },         // basic + hra + conveyance + special

    // --- Attendance Snapshot ---
    totalWorkingDays: { type: Number, default: 0, min: 0 },         // Working days in month (excl. Sundays)
    presentDays:      { type: Number, default: 0, min: 0 },
    absentDays:       { type: Number, default: 0, min: 0 },
    halfDays:         { type: Number, default: 0, min: 0 },
    leaveDays:        { type: Number, default: 0, min: 0 },

    // --- Deductions ---
    pfDeduction:         { type: Number, default: 0, min: 0 },      // basic × pfPercent / 100
    taxDeduction:        { type: Number, default: 0, min: 0 },      // gross × taxPercent / 100
    attendanceDeduction: { type: Number, default: 0, min: 0 },      // (absent × perDay) + (halfDay × perDay × 0.5)
    totalDeductions:     { type: Number, default: 0, min: 0 },      // pf + tax + attendance

    // --- Additions ---
    bonus:      { type: Number, default: 0, min: 0 },
    incentives: { type: Number, default: 0, min: 0 },

    // --- Final Pay ---
    netSalary: { type: Number, default: 0, min: 0 },                // gross - totalDeductions + bonus + incentives

    // --- Workflow Status ---
    status: {
      type: String,
      enum: ['Generated', 'Approved', 'Paid'],
      default: 'Generated',
    },

    // --- Audit Trail ---
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now },
    approvedAt:  { type: Date },
    paidAt:      { type: Date },

    // --- Payslip Number (sequential within month) ---
    payslipNumber: { type: String, default: '' },

    // --- Notes ---
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

/**
 * Unique compound index — ensures one payroll record per employee per month.
 */
PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

/**
 * Index for fast month-wise queries (dashboard, export)
 */
PayrollSchema.index({ month: 1, status: 1 });

module.exports = mongoose.model('Payroll', PayrollSchema);
