const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

async function linkAllUsersToEmployees() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Find all users with relevant roles
    const users = await User.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] } 
    });
    
    console.log('📋 Total Users found:', users.length);
    console.log('═══════════════════════════════════════════════════\n');

    let linkedCount = 0;
    let createdCount = 0;
    let alreadyLinkedCount = 0;

    for (const user of users) {
      console.log(`\n👤 Processing: ${user.username || user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Current employeeId: ${user.employeeId || 'NOT SET'}`);

      // Check if Employee exists with matching email or user ID
      let employee = await Employee.findOne({ 
        $or: [
          { email: user.email },
          { _id: user.employeeId }
        ]
      });

      if (!employee) {
        console.log(`   ⚠️ Employee record NOT FOUND - Creating...`);
        // Create Employee record
        employee = await Employee.create({
          name: user.username || user.email.split('@')[0],
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          status: 'active',
          permissions: user.role === 'ADMIN' || user.role === 'MANAGER' ? ['all'] : []
        });
        console.log(`   ✅ Employee record created: ${employee._id}`);
        createdCount++;
      } else {
        console.log(`   ✅ Employee record found: ${employee._id}`);
        console.log(`      Name: ${employee.name}`);
        console.log(`      Status: ${employee.status}`);
      }

      // Link User to Employee if not already linked
      if (!user.employeeId || user.employeeId.toString() !== employee._id.toString()) {
        user.employeeId = employee._id;
        await user.save();
        console.log(`   ✅ User linked to Employee successfully`);
        linkedCount++;
      } else {
        console.log(`   ✅ User already linked to Employee`);
        alreadyLinkedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n🎉 Summary:');
    console.log(`   Total Users Processed: ${users.length}`);
    console.log(`   Employee Records Created: ${createdCount}`);
    console.log(`   Users Newly Linked: ${linkedCount}`);
    console.log(`   Already Linked: ${alreadyLinkedCount}`);
    
    console.log('\n📢 IMPORTANT: All affected users must LOG OUT and LOG IN again');
    console.log('   to get new JWT tokens with employeeId field!\n');

    // Verify final state
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🔍 Verification - All Active Employees:');
    const allEmployees = await Employee.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
      status: 'active'
    });
    console.log(`   Total Active Employees: ${allEmployees.length}`);
    allEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.role}) - ID: ${emp._id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

linkAllUsersToEmployees();
