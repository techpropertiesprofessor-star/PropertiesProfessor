// Script to update all employees and set a default name if missing
// Usage: node scripts/fix_employee_names.js

const mongoose = require('mongoose');
const Employee = require('../src/models/Employee');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/real-estate-crm';

async function fixEmployeeNames() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const employees = await Employee.find({ $or: [ { name: { $exists: false } }, { name: '' } ] });
  for (const emp of employees) {
    emp.name = emp.email ? emp.email.split('@')[0] : 'Unknown';
    await emp.save();
    console.log(`Updated employee ${emp._id} with name: ${emp.name}`);
  }
  console.log('Done updating employee names.');
  await mongoose.disconnect();
}

fixEmployeeNames().catch(err => {
  console.error('Error updating employee names:', err);
  process.exit(1);
});
