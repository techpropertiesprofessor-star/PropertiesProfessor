const express = require('express');
const router = express.Router();
const calendarEventController = require('../controllers/calendarEvent.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');

// All routes require authentication + Calendar permission
router.use(authMiddleware);
router.use(requirePermission('Calendar'));

// Get events for a month
router.get('/events', calendarEventController.getEvents);

// Get events for a specific date
router.get('/events/date/:date', calendarEventController.getEventsByDate);

// Create a new event
router.post('/events', calendarEventController.createEvent);

// Update an event
router.put('/events/:id', calendarEventController.updateEvent);

// Delete an event
router.delete('/events/:id', calendarEventController.deleteEvent);

module.exports = router;

