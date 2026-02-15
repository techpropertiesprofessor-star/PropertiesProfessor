const express = require('express');
const router = express.Router();
const { addNote, getNotes, getAllNotes } = require('../controllers/personalNote.controller');
const authenticate = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');

// Add a personal note
router.post('/', authenticate, requirePermission('Notes'), addNote);

// Get all personal notes for the logged-in user
router.get('/', authenticate, requirePermission('Notes'), getNotes);

// Get all notes grouped by userId (for managers)
router.get('/all', authenticate, getAllNotes);

module.exports = router;
