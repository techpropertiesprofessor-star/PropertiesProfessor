/**
 * Seed Analytics Test Data
 * Adds sample data for all analytics dashboard components
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI;

// Define schemas (minimal versions for seeding)
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
  priority: { type: String, enum: ['low', 'medium', 'high'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'tasks' });

const leadSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  status: String,
  source: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastContactDate: Date,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'leads' });

const inventorySchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  unit: String,
  reorderLevel: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'inventories' });

const callSchema = new mongoose.Schema({
  phoneNumber: String,
  duration: Number,
  status: String,
  callType: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'calls' });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  date: Date,
  status: { type: String, enum: ['present', 'absent', 'halfDay', 'leave'] },
  checkIn: Date,
  checkOut: Date,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'attendances' });

const Task = mongoose.model('Task', taskSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Call = mongoose.model('Call', callSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function seedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing user ID (manager)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const manager = await User.findOne({ role: 'MANAGER' });
    
    if (!manager) {
      console.error('❌ No manager found. Please create a manager user first.');
      process.exit(1);
    }

    console.log(`📝 Found manager: ${manager.username} (${manager._id})`);

    // Get all users for task assignment
    const allUsers = await User.find();
    console.log(`👥 Found ${allUsers.length} users`);

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    // ==================== Tasks ====================
    console.log('\n📋 Adding Tasks...');
    const existingTasks = await Task.countDocuments();
    
    if (existingTasks < 15) {
      const tasksToAdd = [
        {
          title: 'Follow up with potential buyers',
          description: 'Contact interested parties from last week',
          status: 'completed',
          priority: 'high',
          assignedTo: allUsers[0]._id,
          createdBy: manager._id,
          dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Update property listings',
          description: 'Add new properties to website',
          status: 'completed',
          priority: 'medium',
          assignedTo: allUsers.length > 1 ? allUsers[1]._id : allUsers[0]._id,
          createdBy: manager._id,
          dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Prepare monthly sales report',
          description: 'Compile data for management review',
          status: 'in_progress',
          priority: 'high',
          assignedTo: manager._id,
          createdBy: manager._id,
          dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Schedule property viewings',
          description: 'Coordinate with clients for site visits',
          status: 'pending',
          priority: 'medium',
          assignedTo: allUsers[0]._id,
          createdBy: manager._id,
          dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Overdue
          createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Update CRM database',
          description: 'Clean up old lead records',
          status: 'pending',
          priority: 'low',
          assignedTo: allUsers.length > 1 ? allUsers[1]._id : allUsers[0]._id,
          createdBy: manager._id,
          dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        }
      ];

      await Task.insertMany(tasksToAdd);
      console.log(`✅ Added ${tasksToAdd.length} tasks`);
    } else {
      console.log(`ℹ️ Already have ${existingTasks} tasks`);
    }

    // ==================== Leads ====================
    console.log('\n🎯 Adding Leads...');
    const existingLeads = await Lead.countDocuments();
    
    if (existingLeads < 15) {
      const leadsToAdd = [
        {
          name: 'Rajesh Kumar',
          email: 'rajesh.k@email.com',
          phone: '+91-9876543210',
          status: 'contacted',
          source: 'contact_form',
          assignedTo: allUsers[0]._id,
          lastContactDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Priya Sharma',
          email: 'priya.sharma@email.com',
          phone: '+91-9876543211',
          status: 'qualified',
          source: 'property_enquiry',
          assignedTo: allUsers[0]._id,
          lastContactDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Amit Patel',
          email: 'amit.p@email.com',
          phone: '+91-9876543212',
          status: 'proposal',
          source: 'referral',
          assignedTo: allUsers.length > 1 ? allUsers[1]._id : allUsers[0]._id,
          lastContactDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Sunita Reddy',
          email: 'sunita.r@email.com',
          phone: '+91-9876543213',
          status: 'negotiation',
          source: 'contact_form',
          assignedTo: manager._id,
          lastContactDate: today,
          createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Vikram Singh',
          email: 'vikram.s@email.com',
          phone: '+91-9876543214',
          status: 'won',
          source: 'property_enquiry',
          assignedTo: allUsers[0]._id,
          lastContactDate: today,
          createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Neha Gupta',
          email: 'neha.g@email.com',
          phone: '+91-9876543215',
          status: 'new',
          source: 'website',
          assignedTo: allUsers[0]._id,
          lastContactDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // Old contact
          createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
        }
      ];

      await Lead.insertMany(leadsToAdd);
      console.log(`✅ Added ${leadsToAdd.length} leads`);
    } else {
      console.log(`ℹ️ Already have ${existingLeads} leads`);
    }

    // ==================== Inventory ====================
    console.log('\n📦 Adding Inventory Items...');
    const existingInventory = await Inventory.countDocuments();
    
    if (existingInventory < 10) {
      const inventoryToAdd = [
        {
          name: 'A4 Paper',
          category: 'Office Supplies',
          quantity: 150,
          unit: 'reams',
          reorderLevel: 50,
          status: 'in_stock',
          createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Printer Ink Cartridges',
          category: 'Office Supplies',
          quantity: 8,
          unit: 'pieces',
          reorderLevel: 10,
          status: 'low_stock',
          createdAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Marketing Brochures',
          category: 'Marketing Material',
          quantity: 500,
          unit: 'pieces',
          reorderLevel: 100,
          status: 'in_stock',
          createdAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Property Photos - Professional',
          category: 'Marketing Material',
          quantity: 3,
          unit: 'sets',
          reorderLevel: 5,
          status: 'low_stock',
          createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Signage Boards',
          category: 'Property Signage',
          quantity: 12,
          unit: 'pieces',
          reorderLevel: 5,
          status: 'in_stock',
          createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)
        }
      ];

      await Inventory.insertMany(inventoryToAdd);
      console.log(`✅ Added ${inventoryToAdd.length} inventory items`);
    } else {
      console.log(`ℹ️ Already have ${existingInventory} inventory items`);
    }

    // ==================== Calls ====================
    console.log('\n📞 Adding Call Records...');
    const existingCalls = await Call.countDocuments();
    
    if (existingCalls < 20) {
      const leads = await Lead.find().limit(5);
      const callsToAdd = [];

      // Add calls for last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const numCalls = Math.floor(Math.random() * 5) + 2; // 2-6 calls per day

        for (let j = 0; j < numCalls; j++) {
          callsToAdd.push({
            phoneNumber: `+91-98765432${10 + Math.floor(Math.random() * 90)}`,
            duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
            status: ['completed', 'missed', 'busy'][Math.floor(Math.random() * 3)],
            callType: ['outgoing', 'incoming'][Math.floor(Math.random() * 2)],
            userId: allUsers[Math.floor(Math.random() * allUsers.length)]._id,
            leadId: leads.length > 0 ? leads[Math.floor(Math.random() * leads.length)]._id : null,
            notes: 'Follow-up call regarding property inquiry',
            createdAt: new Date(date.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000))
          });
        }
      }

      await Call.insertMany(callsToAdd);
      console.log(`✅ Added ${callsToAdd.length} call records`);
    } else {
      console.log(`ℹ️ Already have ${existingCalls} call records`);
    }

    // ==================== Attendance ====================
    console.log('\n👔 Adding Attendance Records...');
    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees');
    const employees = await Employee.find();
    
    if (employees.length > 0) {
      const existingAttendance = await Attendance.countDocuments();
      
      if (existingAttendance < 20) {
        const attendanceToAdd = [];

        // Add attendance for last 7 days for each employee
        for (let i = 0; i < 7; i++) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          
          for (const employee of employees) {
            const status = Math.random() > 0.1 ? 'present' : 'absent'; // 90% present
            
            if (status === 'present') {
              const checkInHour = 9 + Math.floor(Math.random() * 2); // 9-10 AM
              const checkOutHour = 17 + Math.floor(Math.random() * 3); // 5-7 PM
              
              attendanceToAdd.push({
                employeeId: employee._id,
                date: date,
                status: status,
                checkIn: new Date(date.setHours(checkInHour, Math.floor(Math.random() * 60), 0)),
                checkOut: new Date(date.setHours(checkOutHour, Math.floor(Math.random() * 60), 0)),
                createdAt: date
              });
            } else {
              attendanceToAdd.push({
                employeeId: employee._id,
                date: date,
                status: status,
                createdAt: date
              });
            }
          }
        }

        await Attendance.insertMany(attendanceToAdd);
        console.log(`✅ Added ${attendanceToAdd.length} attendance records`);
      } else {
        console.log(`ℹ️ Already have ${existingAttendance} attendance records`);
      }
    } else {
      console.log('⚠️ No employees found to add attendance');
    }

    // ==================== Summary ====================
    console.log('\n📊 === DATA SEEDING COMPLETE ===');
    console.log(`Tasks: ${await Task.countDocuments()}`);
    console.log(`Leads: ${await Lead.countDocuments()}`);
    console.log(`Inventory: ${await Inventory.countDocuments()}`);
    console.log(`Calls: ${await Call.countDocuments()}`);
    console.log(`Attendance: ${await Attendance.countDocuments()}`);
    console.log('\n✅ All test data added successfully!');
    console.log('🔄 Refresh your analytics dashboard to see the data\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

seedData();
