/**
 * ============================================================
 * PAYROLL ROUTES — Secure RBAC Protected
 * ============================================================
 *
 * Middleware chain:
 *   authenticateJWT (auth.middleware) → authorizeRoles (role.middleware) → controller
 *
 * Route Protection Summary:
 * ┌─────────────────────────────────────────────────┬───────────────────────┐
 * │ Route                                           │ Allowed Roles         │
 * ├─────────────────────────────────────────────────┼───────────────────────┤
 * │ POST   /api/payroll/set-salary                  │ ADMIN                 │
 * │ POST   /api/payroll/generate                    │ ADMIN, MANAGER        │
 * │ POST   /api/payroll/generate-all                │ ADMIN, MANAGER        │
 * │ GET    /api/payroll/summary                     │ ADMIN, MANAGER        │
 * │ GET    /api/payroll                             │ ADMIN, MANAGER, EMP   │
 * │ GET    /api/payroll/:id                         │ ADMIN, MANAGER, EMP*  │
 * │ PUT    /api/payroll/:id                         │ ADMIN                 │
 * │ PUT    /api/payroll/:id/pay                     │ ADMIN                 │
 * │ DELETE /api/payroll/:id                         │ ADMIN                 │
 * └─────────────────────────────────────────────────┴───────────────────────┘
 *  * Employee can only see their OWN salary (enforced in controller)
 * ============================================================
 */

const express = require('express');
const router = express.Router();

// ── Middleware ──
const auth = require('../middlewares/auth.middleware');       // JWT verification → req.user
const role = require('../middlewares/role.middleware');         // authorizeRoles(roles[])

// ── Controller ──
const payrollCtrl = require('../controllers/payroll.controller');

// ═══════════════════════════════════════════════════════════
//  ALL routes require authentication
// ═══════════════════════════════════════════════════════════

// Permission shorthand: employees with 'Payroll' are treated as manager-level
const pp = 'Payroll';

// ── ADMIN & MANAGER (or Employee with Payroll permission): Set basic salary ──
router.post(
  '/set-salary',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.setBasicSalary
);

// ── Generate payroll for single employee ──
router.post(
  '/generate',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.generateSalary
);

// ── Generate payroll for ALL active employees ──
router.post(
  '/generate-all',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.generateAllSalaries
);

// ── Payroll summary stats ──
router.get(
  '/summary',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.getPayrollSummary
);

// ── ALL AUTHENTICATED: Get salaries (controller enforces employee-own-only) ──
router.get(
  '/',
  auth,
  role(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  payrollCtrl.getSalaries
);

// ── ALL AUTHENTICATED: Get single salary (controller enforces employee-own-only) ──
router.get(
  '/:id',
  auth,
  role(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  payrollCtrl.getSalaryById
);

// ── Edit bonus/incentives/deductions ──
router.put(
  '/:id',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.updateSalary
);

// ── Mark salary as paid ──
router.put(
  '/:id/pay',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.markAsPaid
);

// ── Delete salary record ──
router.delete(
  '/:id',
  auth,
  role(['ADMIN', 'MANAGER'], pp),
  payrollCtrl.deleteSalary
);

module.exports = router;
