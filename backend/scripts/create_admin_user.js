/**
 * Create Admin User for Observability System
 * Username: admin@propertiesprofessor.com
 * Password: Properties@professor7030
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('../src/config/db');

const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

async function createAdminUser() {
  try {
    console.log('🔄 Creating admin user...');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'admin@propertiesprofessor.com' });
    
    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log('Username:', existingUser.username);
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash('Properties@professor7030', 10);
      existingUser.password = hashedPassword;
      existingUser.role = 'admin';
      existingUser.isVerified = true;
      await existingUser.save();
      
      console.log('✅ Password updated successfully!');
      console.log('\n📋 Login Credentials:');
      console.log('Username: admin@propertiesprofessor.com');
      console.log('Password: Properties@professor7030');
      console.log('\n🌐 Access URLs:');
      console.log('Main Dashboard: http://localhost:3000');
      console.log('Admin Panel: http://localhost:3001');
      console.log('BIOS Panel: http://localhost:3002 (super admin only)');
      
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Properties@professor7030', 10);

    // Create user
    const adminUser = new User({
      username: 'admin@propertiesprofessor.com',
      email: 'admin@propertiesprofessor.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');

    // Try to create employee record (optional)
    try {
      const employee = new Employee({
        userId: adminUser._id,
        name: 'Admin User',
        email: 'admin@propertiesprofessor.com',
        role: 'admin',
        status: 'active'
      });
      await employee.save();
      
      // Link employee to user
      adminUser.employeeId = employee._id;
      await adminUser.save();
      
      console.log('✅ Employee record created and linked!');
    } catch (empError) {
      console.log('⚠️  Employee record creation skipped (optional)');
    }

    console.log('\n📋 Login Credentials:');
    console.log('Username: admin@propertiesprofessor.com');
    console.log('Password: Properties@professor7030');
    console.log('\n🌐 Access URLs:');
    console.log('Main Dashboard: http://localhost:3000');
    console.log('Admin Panel: http://localhost:3001');
    console.log('BIOS Panel: http://localhost:3002 (requires super_admin role)');
    console.log('\n💡 Note: To access BIOS Panel, change role to "super_admin" in database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Wait for DB connection
setTimeout(() => {
  createAdminUser();
}, 2000);
