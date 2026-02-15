const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const auth = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');

// Get all announcements
router.get('/', auth, requirePermission('Announcements'), announcementController.getAll);
// Create a new announcement
router.post('/', auth, requirePermission('Announcements'), announcementController.create);

module.exports = router;
