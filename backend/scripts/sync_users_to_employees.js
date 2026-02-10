// Script to sync all User documents to Employee documents if missing
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

const MONGO_URI = process.env.MONGO_URI;

async function syncUsersToEmployees() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find();
  let created = 0;
  const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CALLER'];
  for (const user of users) {
    const exists = await Employee.findOne({ email: user.email });
    if (!exists) {
      let role = (user.role || '').toUpperCase();
      if (!validRoles.includes(role)) {
        role = 'EMPLOYEE';
      }
      await Employee.create({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role,
        status: 'active'
      });
      created++;
      console.log(`Created Employee for user: ${user.email}`);
    }
  }
  console.log(`Sync complete. ${created} Employee records created.`);
  await mongoose.disconnect();
}

syncUsersToEmployees().catch(err => {
  console.error(err);
  process.exit(1);
});
