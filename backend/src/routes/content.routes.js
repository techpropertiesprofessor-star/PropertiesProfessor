const express = require('express');
const router = express.Router();

// Example GET endpoint for content
router.get('/', (req, res) => {
  res.json([]); // Return an empty array for now
});

module.exports = router;
