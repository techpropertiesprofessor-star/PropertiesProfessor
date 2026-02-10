const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

async function linkManagerToEmployee() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Find Manager user (Shivam Kumar)
    const managerUser = await User.findOne({ role: 'MANAGER' });
    if (!managerUser) {
      console.log('❌ Manager user not found');
      process.exit(1);
    }
    
    console.log('📋 Manager User:', { 
      id: managerUser._id, 
      username: managerUser.username,
      email: managerUser.email,
      employeeId: managerUser.employeeId 
    });

    // Check if Employee exists with matching email
    let employee = await Employee.findOne({ 
      email: managerUser.email,
      role: 'MANAGER'
    });

    if (!employee) {
      console.log('⚠️ Manager Employee record not found, creating one...');
      // Create Employee record for Manager
      employee = await Employee.create({
        name: managerUser.username || 'Shivam Kumar',
        email: managerUser.email,
        role: 'MANAGER',
        status: 'active',
        permissions: ['all']
      });
      console.log('✅ Employee record created:', { id: employee._id, name: employee.name });
    } else {
      console.log('✅ Employee record found:', { id: employee._id, name: employee.name });
    }

    // Link User to Employee
    if (!managerUser.employeeId || managerUser.employeeId.toString() !== employee._id.toString()) {
      managerUser.employeeId = employee._id;
      await managerUser.save();
      console.log('✅ User linked to Employee successfully');
    } else {
      console.log('✅ User already linked to Employee');
    }

    console.log('\n🎉 Done! Manager is now linked to Employee');
    console.log('Please log out and log in again to get new JWT token with employeeId');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

linkManagerToEmployee();
