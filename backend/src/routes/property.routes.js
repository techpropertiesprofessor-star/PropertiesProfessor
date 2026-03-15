const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const InventoryUnit = require('../models/InventoryUnit');
const { hasValidAccess, stripOwnerFields } = require('../controllers/ownerAccess.controller');

// All routes require authentication
router.use(auth);

// GET /api/property/list — lightweight list for property dropdown in lead forms
// Accessible to users with Leads OR Inventory permission
router.get('/list', async (req, res, next) => {
  try {
    const role = (req.user.role || '').toUpperCase();

    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      const Employee = require('../models/Employee');
      const employee = await Employee.findById(req.user.employeeId || req.user.id).select('permissions');
      const perms = employee?.permissions || [];
      if (!perms.includes('Leads') && !perms.includes('Inventory')) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const units = await InventoryUnit.find({})
      .select('unitNumber bhk building_name floor_number status project tower')
      .populate({ path: 'project', select: 'name' })
      .populate({ path: 'tower', select: 'name' })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json(units);
  } catch (err) {
    next(err);
  }
});

// GET /api/property/:id — full property details
// Accessible to users with Leads OR Inventory permission
router.get('/:id', async (req, res, next) => {
  try {
    const role = (req.user.role || '').toUpperCase();

    // ADMIN/MANAGER have full access
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      // For EMPLOYEE/CALLER, check if they have Leads or Inventory permission
      const Employee = require('../models/Employee');
      const employee = await Employee.findById(req.user.employeeId || req.user.id).select('permissions');
      const perms = employee?.permissions || [];
      if (!perms.includes('Leads') && !perms.includes('Inventory')) {
        return res.status(403).json({ message: 'Access denied. Requires Leads or Inventory permission.' });
      }
    }

    const unit = await InventoryUnit.findById(req.params.id)
      .populate({ path: 'project', select: 'name location description' })
      .populate({ path: 'tower', select: 'name description' })
      .populate('priceHistory');

    if (!unit) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Strip owner fields for non-admin/manager users without active access
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      const employeeId = req.user.employeeId || req.user.id;
      const { hasAccess } = await hasValidAccess(unit._id, employeeId);
      if (!hasAccess) {
        return res.json(stripOwnerFields(unit.toObject()));
      }
    }

    res.json(unit);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
