const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const existing = await User.findOne({ email: 'admin@propertiesprofessor.com' });
    if (existing) {
      console.log('Admin already exists');
    } else {
      const admin = new User({
        name: 'Admin',
        email: 'admin@propertiesprofessor.com',
        password: 'Admin@1234',
        role: 'SUPER_ADMIN'
      });
      await admin.save();
      console.log('✅ Admin created successfully!');
    }
    console.log('\n  Email:    admin@propertiesprofessor.com');
    console.log('  Password: Admin@1234\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
