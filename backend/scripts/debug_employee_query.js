const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('../src/models/Employee');

async function debugQuery() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Get ALL employees without filters
    console.log('🔍 ALL Employees (no filter):');
    const allEmployees = await Employee.find({});
    console.log(`   Total: ${allEmployees.length}\n`);
    allEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name}`);
      console.log(`      Role: ${emp.role}`);
      console.log(`      Status: ${emp.status}`);
      console.log(`      ID: ${emp._id}`);
      console.log(`      Email: ${emp.email}`);
      console.log();
    });

    // Try the exact query from chat controller
    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n🔍 With Filter (role IN [EMPLOYEE, MANAGER, ADMIN] AND status=active):');
    const filtered = await Employee.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] }, 
      status: 'active' 
    });
    console.log(`   Total: ${filtered.length}\n`);
    filtered.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.role}) - ${emp.status}`);
    });

    // Check if role values have weird characters
    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n🔍 Checking role field values (with character codes):');
    for (const emp of allEmployees.slice(0, 7)) {
      console.log(`\n   ${emp.name}:`);
      console.log(`      role value: "${emp.role}"`);
      console.log(`      role charCodes: ${[...emp.role].map(c => c.charCodeAt(0)).join(', ')}`);
      console.log(`      status value: "${emp.status}"`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

debugQuery();
