const Holiday = require('../models/Holiday');

// Get all holidays
exports.getAll = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

// Add a new holiday
exports.create = async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }
    const holiday = new Holiday({
      name,
      date,
      description,
      createdBy: req.user ? req.user._id : undefined
    });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Holiday for this date already exists' });
    }
    res.status(500).json({ error: 'Failed to create holiday' });
  }
};
