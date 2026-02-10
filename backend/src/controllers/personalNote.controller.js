const PersonalNote = require('../models/PersonalNote');

// Add a new personal note
exports.addNote = async (req, res) => {
  try {
    const { note } = req.body;
    const userId = req.user._id; // assuming authentication middleware sets req.user
    const newNote = await PersonalNote.create({ userId, note });
    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note', details: err.message });
  }
};

// Get all notes for a user
exports.getNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const notes = await PersonalNote.find({ userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes', details: err.message });
  }
};

// Get all notes grouped by userId (for managers)
exports.getAllNotes = async (req, res) => {
  try {
    if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const notes = await PersonalNote.find({}).sort({ createdAt: -1 });
    const groupedNotes = notes.reduce((acc, note) => {
      if (!acc[note.userId]) acc[note.userId] = [];
      acc[note.userId].push(note);
      return acc;
    }, {});
    res.json(groupedNotes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes', details: err.message });
  }
};
