const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('../src/models/Employee');

async function checkEmployeeRecords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    const targetIds = [
      '696a6011a98e9162db5b9d2c', // Demo User
      '696a6011a98e9162db5b9d2f', // Shivam Kumar
      '696a6011a98e9162db5b9d32'  // Rudra Raut
    ];

    console.log('🔍 Checking Employee Records:\n');
    
    for (const id of targetIds) {
      const employee = await Employee.findById(id);
      if (employee) {
        console.log(`📋 Employee ID: ${id}`);
        console.log(`   Name: ${employee.name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Status: ${employee.status}`);
        console.log(`   ─────────────────────────────\n`);
      } else {
        console.log(`❌ Employee ID ${id} NOT FOUND\n`);
      }
    }

    // Now check what the query returns
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🔍 Query Result (same as chat controller):');
    const employees = await Employee.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] }, 
      status: 'active' 
    });
    console.log(`   Total Found: ${employees.length}`);
    employees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.role}) - Status: ${emp.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

checkEmployeeRecords();
