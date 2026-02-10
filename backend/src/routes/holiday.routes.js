const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holiday.controller');
const authenticate = require('../middlewares/auth.middleware');

// Get all holidays (public)
router.get('/', holidayController.getAll);
// Add a holiday (protected)
router.post('/', authenticate, holidayController.create);

module.exports = router;
