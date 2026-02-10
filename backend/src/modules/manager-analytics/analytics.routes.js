/**
 * Manager Analytics Routes
 * All routes protected by managerOnly middleware
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const auth = require('../../middlewares/auth.middleware');
const managerOnly = require('../../middleware/managerOnly');

// Apply authentication FIRST, then check manager role
router.use(auth);
router.use(managerOnly);

// Individual analytics endpoints
router.get('/task-status', analyticsController.getTaskStatus);
router.get('/employee-load', analyticsController.getEmployeeLoad);
router.get('/leads-funnel', analyticsController.getLeadsFunnel);
router.get('/lead-sources', analyticsController.getLeadSources);
router.get('/inventory-status', analyticsController.getInventoryStatus);
router.get('/call-activity', analyticsController.getCallActivity);
router.get('/kpis', analyticsController.getPerformanceKPIs);
router.get('/alerts', analyticsController.getAlerts);

// Get all analytics at once (for initial dashboard load)
router.get('/all', analyticsController.getAllAnalytics);

module.exports = router;
