const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected');

    const InventoryUnit = require(path.join(__dirname, '..', 'src', 'models', 'InventoryUnit'));
    const controller = require(path.join(__dirname, '..', 'src', 'controllers', 'inventory.controller'));

    const unit = await InventoryUnit.findOne();
    if (!unit) {
      console.log('No unit found');
      await mongoose.disconnect();
      return;
    }

    const req = { params: { id: unit._id.toString() }, app: { get: () => null } };

    const outPath = path.join(__dirname, 'unit_output.pdf');
    const res = {
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      send(buffer) {
        fs.writeFileSync(outPath, Buffer.from(buffer));
        console.log('PDF written to', outPath);
      }
    };

    await controller.generateUnitPDF(req, res, (err) => { if (err) console.error('Controller error:', err); });

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

run();
