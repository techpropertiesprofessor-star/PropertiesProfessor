// Script to add a name field to all employees in MongoDB Atlas if missing
// Update the MONGO_URI below with your Atlas connection string before running!

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

const employeeSchema = new mongoose.Schema({
  name: String,
  email: String
}, { collection: 'employees' });

const Employee = mongoose.model('Employee', employeeSchema);

async function addNames() {
  await mongoose.connect(MONGO_URI);
  const employees = await Employee.find({ $or: [ { name: { $exists: false } }, { name: '' } ] });
  for (const emp of employees) {
    if (emp.email) {
      emp.name = emp.email.split('@')[0];
    } else {
      emp.name = 'Unknown';
    }
    await emp.save();
    console.log(`Updated employee ${emp._id} with name: ${emp.name}`);
  }
  console.log('Done updating employee names.');
  await mongoose.disconnect();
}

addNames().catch(err => {
  console.error('Error updating employee names:', err);
  process.exit(1);
});
