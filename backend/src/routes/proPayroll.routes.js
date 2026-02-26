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

// Permission shorthand: employees with 'Payroll Manage' get manager-level access
const pm = 'Payroll Manage';

// ── Salary Structure (ADMIN & MANAGER — or Employee with Payroll Manage) ──
router.post('/salary-structure',       role(['ADMIN', 'MANAGER'], pm), ctrl.createSalaryStructure);
router.get('/salary-structures',       role(['ADMIN', 'MANAGER'], pm), ctrl.getSalaryStructures);
router.put('/salary-structure/:id',    role(['ADMIN', 'MANAGER'], pm), ctrl.updateSalaryStructure);
router.delete('/salary-structure/:id', role(['ADMIN', 'MANAGER'], pm), ctrl.deleteSalaryStructure);
router.post('/assign-structure',       role(['ADMIN', 'MANAGER'], pm), ctrl.assignStructure);

// ── Dashboard Stats (ADMIN, MANAGER, or Employee with Payroll Manage) ──
router.get('/dashboard',              role(['ADMIN', 'MANAGER'], pm), ctrl.getDashboard);

// ── Excel Export (ADMIN, MANAGER, or Employee with Payroll Manage) ──
router.get('/export-excel',           role(['ADMIN', 'MANAGER'], pm), ctrl.exportExcel);

// ── PDF Payslip (ADMIN, MANAGER, EMPLOYEE — controller enforces own-only for employee) ──
router.get('/slip/:id',               role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.downloadSlip);

// ── All Payrolls list (ADMIN, MANAGER, or Employee with Payroll Manage) ──
router.get('/all-payrolls',           role(['ADMIN', 'MANAGER'], pm), ctrl.getAllPayrolls);

// ── Payroll Generation (ADMIN, MANAGER, or Employee with Payroll Manage) ──
router.post('/generate/:employeeId',  role(['ADMIN', 'MANAGER'], pm), ctrl.generatePayroll);
router.post('/generate-all',          role(['ADMIN', 'MANAGER'], pm), ctrl.generateAllPayroll);

// ── Payroll Workflow (ADMIN & MANAGER, or Employee with Payroll Manage) ──
router.post('/approve/:id',           role(['ADMIN', 'MANAGER'], pm), ctrl.approvePayroll);
router.post('/mark-paid/:id',         role(['ADMIN', 'MANAGER'], pm), ctrl.markPaid);

// ── Employee Receipts (EMPLOYEE — only own paid payrolls) ──
router.get('/my-receipts',             role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.getMyReceipts);
router.get('/receipt/:id',             role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.getReceiptById);

// ── Employee Payroll History (role-filtered in controller) ──
router.get('/:employeeId',            role(['ADMIN', 'MANAGER', 'EMPLOYEE']), ctrl.getPayroll);

// ── Delete Payroll (ADMIN & MANAGER, or Employee with Payroll Manage) ──
router.delete('/:id',                 role(['ADMIN', 'MANAGER'], pm), ctrl.deletePayroll);

module.exports = router;
