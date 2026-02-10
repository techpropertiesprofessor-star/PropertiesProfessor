const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');
    console.log('📋 Database:', mongoose.connection.name);
    console.log('📋 MongoDB URI:', process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//USER:****@'));
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 Collections in database:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Count documents in employees collection
    const db = mongoose.connection.db;
    const employeesCount = await db.collection('employees').countDocuments();
    console.log(`\n👥 Total documents in 'employees' collection: ${employeesCount}`);

    // Get all documents from employees collection
    const allDocs = await db.collection('employees').find({}).toArray();
    console.log('\n📋 All documents:');
    allDocs.forEach((doc, idx) => {
      console.log(`\n   ${idx + 1}. ${doc.name}`);
      console.log(`      _id: ${doc._id}`);
      console.log(`      role: ${doc.role}`);
      console.log(`      status: ${doc.status}`);
    });

    // Test the query directly on collection
    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n🔍 Query with filter (direct on collection):');
    const filtered = await db.collection('employees').find({
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
      status: 'active'
    }).toArray();
    console.log(`   Total: ${filtered.length}`);
    filtered.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.name} (${doc.role}) - ${doc.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

checkCollections();
