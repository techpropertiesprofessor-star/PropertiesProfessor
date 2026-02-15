const mongoose = require('mongoose');
require('dotenv').config();
const Lead = require('./src/models/Lead');
const Employee = require('./src/models/Employee');

async function testAssignment() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Reset the "shivam kumar" lead that test broke
    const shivamLead = await Lead.findOne({ 
      phone: '+917765654376', 
      name: 'shivam kumar' 
    });
    
    if (shivamLead) {
      console.log('Resetting shivam kumar lead to null...');
      await Lead.updateOne(
        { _id: shivamLead._id },
        { $set: { assignedTo: null, status: 'new' } }
      );
      const reset = await Lead.findById(shivamLead._id);
      console.log('Reset done:', { 
        id: reset._id.toString(), 
        assignedTo: reset.assignedTo, 
        status: reset.status 
      });
    }
    
    // Also reset the Rudra lead
    const rudraLead = await Lead.findById('697e5af9cecd8216b79ddbfd');
    if (rudraLead) {
      await Lead.updateOne(
        { _id: rudraLead._id },
        { $set: { assignedTo: new mongoose.Types.ObjectId('697e5bf46269911e67d2b42a'), status: 'assigned' } }
      );
      console.log('Reset Rudra lead back to original employee');
    }
    
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testAssignment();