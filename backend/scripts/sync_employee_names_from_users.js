const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

async function syncEmployeeNamesFromUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('  📝 Syncing Employee Names from User Names');
    console.log('═══════════════════════════════════════════════════\n');

    // Find all employees
    const employees = await Employee.find();
    console.log(`📋 Total Employees found: ${employees.length}\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyCorrectCount = 0;

    for (const employee of employees) {
      console.log(`\n👤 Processing Employee: ${employee.name}`);
      console.log(`   Email: ${employee.email}`);
      console.log(`   Employee ID: ${employee._id}`);

      // Find corresponding user by email
      const user = await User.findOne({ 
        $or: [
          { email: employee.email },
          { employeeId: employee._id }
        ]
      });

      if (!user) {
        console.log(`   ❌ No matching User found`);
        notFoundCount++;
        continue;
      }

      console.log(`   ✅ User found: ${user.name}`);
      console.log(`   User Email: ${user.email}`);

      // Check if names are different
      if (employee.name === user.name) {
        console.log(`   ℹ️  Names already match - no update needed`);
        alreadyCorrectCount++;
        continue;
      }

      // Update employee name
      employee.name = user.name;
      await employee.save();
      
      console.log(`   ✅ Updated Employee name from "${employee.name}" to "${user.name}"`);
      updatedCount++;
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  📊 Sync Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Total Employees: ${employees.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ℹ️  Already Correct: ${alreadyCorrectCount}`);
    console.log(`   ❌ No User Found: ${notFoundCount}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (updatedCount > 0) {
      console.log('🎉 Employee names successfully synced with User names!');
      console.log('💡 Refresh your browser to see the updated names.\n');
    } else {
      console.log('ℹ️  All employee names are already correct.\n');
    }

    // Display final employee list
    console.log('═══════════════════════════════════════════════════');
    console.log('  📋 Final Employee List');
    console.log('═══════════════════════════════════════════════════');
    const finalEmployees = await Employee.find().sort({ role: 1, name: 1 });
    finalEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.role}) - ${emp.email}`);
    });
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

syncEmployeeNamesFromUsers();
