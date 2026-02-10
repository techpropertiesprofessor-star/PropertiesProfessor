const express = require('express');
const router = express.Router();
const calendarEventController = require('../controllers/calendarEvent.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

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

