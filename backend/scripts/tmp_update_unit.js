const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected');

    const InventoryUnit = require(path.join(__dirname, '..', 'src', 'models', 'InventoryUnit'));

    const unit = await InventoryUnit.findOne();
    if (!unit) {
      console.log('No InventoryUnit found in DB.');
      await mongoose.disconnect();
      return;
    }

    console.log('Found unit:', unit._id.toString());
    console.log('Before:', {
      status: unit.status,
      tenant_name: unit.tenant_name,
      tenant_contact: unit.tenant_contact,
      tenant_start_date: unit.tenant_start_date,
      tenant_end_date: unit.tenant_end_date,
    });

    unit.status = 'booked';
    unit.tenant_name = 'Test Tenant';
    unit.tenant_contact = '+1234567890';
    unit.tenant_start_date = new Date('2026-02-01');
    unit.tenant_end_date = new Date('2026-08-01');

    await unit.save();

    const updated = await InventoryUnit.findById(unit._id);
    console.log('After:', {
      status: updated.status,
      tenant_name: updated.tenant_name,
      tenant_contact: updated.tenant_contact,
      tenant_start_date: updated.tenant_start_date,
      tenant_end_date: updated.tenant_end_date,
    });

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

run();
