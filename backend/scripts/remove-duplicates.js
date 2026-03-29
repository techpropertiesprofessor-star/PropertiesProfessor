const mongoose = require('mongoose');
require('dotenv').config();

async function removeDuplicates() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/properties_professor');
  console.log('Connected to MongoDB');
  
  const Lead = mongoose.model('Lead', new mongoose.Schema({
    phone: String,
    name: String
  }, { timestamps: true, strict: false }));
  
  const duplicates = await Lead.aggregate([
    { $group: { _id: '$phone', count: { $sum: 1 }, docs: { $push: '$_id' }, firstDoc: { $first: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  
  console.log('Duplicate groups found:', duplicates.length);
  
  let deletedCount = 0;
  for (const dup of duplicates) {
    const toDelete = dup.docs.slice(1);
    if (toDelete.length > 0) {
      const result = await Lead.deleteMany({ _id: { $in: toDelete } });
      deletedCount += result.deletedCount;
    }
  }
  
  console.log('Deleted duplicates:', deletedCount);
  await mongoose.disconnect();
  console.log('Done!');
}

removeDuplicates().catch(e => { console.error(e); process.exit(1); });
