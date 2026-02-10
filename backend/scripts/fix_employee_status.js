const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('../src/models/Employee');

async function fixEmployeeStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Find all employees without status field or with undefined status
    const employeesWithoutStatus = await Employee.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: undefined }
      ]
    });

    console.log(`📋 Found ${employeesWithoutStatus.length} employees without status field\n`);

    if (employeesWithoutStatus.length === 0) {
      console.log('✅ All employees already have status field');
      return;
    }

    for (const emp of employeesWithoutStatus) {
      console.log(`🔧 Fixing: ${emp.name} (${emp.role})`);
      console.log(`   ID: ${emp._id}`);
      console.log(`   Current status: ${emp.status}`);
      
      emp.status = 'active';
      await emp.save();
      
      console.log(`   ✅ Updated to: active\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('\n🎉 All employees have been updated!\n');

    // Verify the fix
    console.log('🔍 Verification - Querying all active employees:');
    const activeEmployees = await Employee.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] }, 
      status: 'active' 
    });
    
    console.log(`   Total Active Employees: ${activeEmployees.length}\n`);
    activeEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.role}) - Status: ${emp.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

fixEmployeeStatus();
