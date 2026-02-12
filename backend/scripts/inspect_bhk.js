const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    const InventoryUnit = require(path.join(__dirname, '..', 'src', 'models', 'InventoryUnit'));

    const agg = await InventoryUnit.aggregate([
      { $group: { _id: { bhk: '$bhk', bhk_type: '$bhk_type', config_type: '$config_type' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    console.log('Sample BHK groupings:');
    agg.forEach(a => console.log(JSON.stringify(a)));

    // Also list distinct bhk values
    const distinct = await InventoryUnit.distinct('bhk');
    console.log('\nDistinct `bhk` values:', distinct);

    // Sample 10 units and print their bhk-related fields
    const sample = await InventoryUnit.find().limit(10).select('bhk bhk_type config_type raw looking_to listing_type');
    console.log('\nSample units:');
    sample.forEach(s => console.log(s.toObject()));

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

run();
