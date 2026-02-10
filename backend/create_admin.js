/**
 * Simple Admin User Creator
 * Run: node create_admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string from .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  employeeId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@propertiesprofessor.com' });

    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🔐 Role:', existingAdmin.role);
      
      console.log('\n🔄 Updating password...');
      const hashedPassword = await bcrypt.hash('Properties@professor7030', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'ADMIN';
      await existingAdmin.save();
      console.log('✅ Password updated!');
    } else {
      // Create new admin
      console.log('\n🆕 Creating new admin user...');
      const hashedPassword = await bcrypt.hash('Properties@professor7030', 10);
      
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@propertiesprofessor.com',
        password: hashedPassword,
        role: 'ADMIN'
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log('Username: admin@propertiesprofessor.com');
    console.log('Password: Properties@professor7030');
    console.log('Role: admin');
    console.log('='.repeat(50));
    console.log('\n🌐 Access URLs:');
    console.log('Main Dashboard: http://localhost:3000');
    console.log('Admin Panel: http://localhost:3001');
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\n✅ Done! You can now login.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('1. Make sure MongoDB is running');
    console.error('2. Check if connection string is correct');
    console.error('3. Try: mongo --version (to verify MongoDB installation)');
    process.exit(1);
  }
}

createAdmin();
