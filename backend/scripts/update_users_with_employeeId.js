// Script to update all User documents with the correct employeeId field
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

const MONGO_URI = process.env.MONGO_URI;

async function updateUsersWithEmployeeId() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find();
  let updated = 0;
  for (const user of users) {
    const employee = await Employee.findOne({ email: user.email });
    if (employee && (!user.employeeId || String(user.employeeId) !== String(employee._id))) {
      user.employeeId = employee._id;
      await user.save();
      updated++;
      console.log(`Updated user ${user.email} with employeeId ${employee._id}`);
    }
  }
  console.log(`Update complete. ${updated} User records updated.`);
  await mongoose.disconnect();
}

updateUsersWithEmployeeId().catch(err => {
  console.error(err);
  process.exit(1);
});
