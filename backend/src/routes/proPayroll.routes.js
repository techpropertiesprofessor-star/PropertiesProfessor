/**
 * ============================================================
 * PROFESSIONAL PAYROLL ROUTES — RBAC Protected
 * ============================================================
 * All routes require JWT authentication.
 * Role middleware enforces ADMIN / MANAGER / EMPLOYEE access.
 *
 * Route prefix: /api/pro-payroll
 * ============================================================
 */
const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/proPayroll.controller');

// All routes require authentication
router.use(auth);

// ── Salary Structure (ADMIN & MANAGER — Manager runs everything) ──
router.post('/salary-structure',       role(['ADMIN', 'MANAGER']), ctrl.createSalaryStructure);
router.get('/salary-structures',       role(['ADMIN', 'MANAGER']), ctrl.getSalaryStructures);
router.put('/salary-structure/:id',    role(['ADMIN', 'MANAGER']), ctrl.updateSalaryStructure);
router.delete('/salary-structure/:id', role(['ADMIN', 'MANAGER']), ctrl.deleteSalaryStructure);
router.post('/assign-structure',       role(['ADMIN', 'MANAGER']), ctrl.assignStructure);

// ── Dashboard Stats (ADMIN, MANAGER) ──
router.get('/dashboard',              role(['ADMIN', 'MANAGER']), ctrl.getDashboard);

// ── Excel Export (ADMIN, MANAGER) ──
router.get('/export-excel',           role(['ADMIN', 'MANAGER']), ctrl.exportExcel);

// ── PDF Payslip (ADMIN, MANAGER, EMPLOYEE — controller enforces own-only for employee) ──
router.get('/slip/:id',               role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.downloadSlip);

// ── All Payrolls list (ADMIN, MANAGER) ──
router.get('/all-payrolls',           role(['ADMIN', 'MANAGER']), ctrl.getAllPayrolls);

// ── Payroll Generation (ADMIN, MANAGER) ──
router.post('/generate/:employeeId',  role(['ADMIN', 'MANAGER']), ctrl.generatePayroll);
router.post('/generate-all',          role(['ADMIN', 'MANAGER']), ctrl.generateAllPayroll);

// ── Payroll Workflow (ADMIN & MANAGER — Manager has full power) ──
router.post('/approve/:id',           role(['ADMIN', 'MANAGER']), ctrl.approvePayroll);
router.post('/mark-paid/:id',         role(['ADMIN', 'MANAGER']), ctrl.markPaid);

// ── Employee Payroll History (role-filtered in controller) ──
router.get('/:employeeId',            role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.getPayroll);

// ── Delete Payroll (ADMIN & MANAGER, cannot delete Paid) ──
router.delete('/:id',                 role(['ADMIN', 'MANAGER']), ctrl.deletePayroll);

module.exports = router;
