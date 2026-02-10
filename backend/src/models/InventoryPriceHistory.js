const mongoose = require('mongoose');

const InventoryPriceHistorySchema = new mongoose.Schema({
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryUnit', required: true },
  price: { type: Number, required: true },
  changedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryPriceHistory', InventoryPriceHistorySchema);
