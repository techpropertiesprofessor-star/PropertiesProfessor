const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');

// Get all announcements
router.get('/', announcementController.getAll);
// Create a new announcement
router.post('/', announcementController.create);

module.exports = router;
