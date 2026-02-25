/**
 * ============================================================
 * SALARY MODEL — Payroll & Attendance RBAC Module
 * ============================================================
 * Stores per-employee salary records per month.
 * Only ADMIN can set/change basicSalary.
 * ADMIN & MANAGER can generate payroll and set bonus/incentives.
 * EMPLOYEE can only view their own records.
 * ============================================================
 */

const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  // ── Employee reference ──
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },

  // ── Pay period ──
  month: {
    type: Number, // 1-12
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },

  // ── Salary breakdown ──
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  bonus: {
    type: Number,
    default: 0,
    min: 0,
  },
  incentives: {
    type: Number,
    default: 0,
    min: 0,
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ── Computed net pay ──
  netPay: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ── Attendance snapshot at time of payroll generation ──
  presentDays: {
    type: Number,
    default: 0,
  },
  absentDays: {
    type: Number,
    default: 0,
  },
  leaveDays: {
    type: Number,
    default: 0,
  },
  totalWorkingDays: {
    type: Number,
    default: 0,
  },

  // ── Payment status ──
  status: {
    type: String,
    enum: ['GENERATED', 'PAID'],
    default: 'GENERATED',
  },
  paidAt: {
    type: Date,
    default: null,
  },

  // ── Audit fields ──
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

// Compound index: one salary record per employee per month/year
SalarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// Pre-save: auto-calculate netPay
SalarySchema.pre('save', function (next) {
  this.netPay = (this.basicSalary || 0) + (this.bonus || 0) + (this.incentives || 0) - (this.deductions || 0);
  next();
});

module.exports = mongoose.model('Salary', SalarySchema);
