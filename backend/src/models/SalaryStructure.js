/**
 * ============================================================
 * SALARY STRUCTURE MODEL
 * ============================================================
 * Defines the salary components for an employee.
 * Admin creates a structure, then assigns it to employees.
 * 
 * Gross = basic + hra + conveyance + specialAllowance
 * Deductions are calculated as percentages during payroll generation.
 * ============================================================
 */
const mongoose = require('mongoose');

const SalaryStructureSchema = new mongoose.Schema(
  {
    // --- Salary components (monthly amounts in ₹) ---
    basic:            { type: Number, required: true, min: 0 },
    hra:              { type: Number, default: 0, min: 0 },         // House Rent Allowance
    conveyance:       { type: Number, default: 0, min: 0 },         // Travel / Conveyance
    specialAllowance: { type: Number, default: 0, min: 0 },         // Special / Other Allowance

    // --- Deduction percentages ---
    pfPercent:  { type: Number, default: 0, min: 0, max: 100 },     // Provident Fund %
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },     // Tax / TDS %

    // --- Metadata ---
    label: { type: String, trim: true },                             // Optional friendly name e.g. "Senior Dev Package"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/**
 * Virtual: grossSalary — convenience getter
 */
SalaryStructureSchema.virtual('grossSalary').get(function () {
  return (this.basic || 0) + (this.hra || 0) + (this.conveyance || 0) + (this.specialAllowance || 0);
});

// Include virtuals in JSON
SalaryStructureSchema.set('toJSON', { virtuals: true });
SalaryStructureSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SalaryStructure', SalaryStructureSchema);
