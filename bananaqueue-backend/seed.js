// seed.js — run once with: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/Department');
const Queue = require('./models/Queue');

const departments = [
  { name: 'Cashier',  description: 'Payment and cashier services' },
  { name: 'Clinic',   description: 'Medical and health services' },
  { name: 'Auditing', description: 'Auditing and records services' },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');

  // Clear existing
  await Department.deleteMany({});
  await Queue.deleteMany({});
  console.log('Cleared existing departments and queues');

  for (const dept of departments) {
    const d = await Department.create(dept);
    await Queue.create({
      name: `${dept.name} Queue`,
      department: d._id,
      isActive: true,
      currentNumber: 0,
      nextNumber: 1,
    });
    console.log(`Created: ${dept.name} department and queue`);
  }

  console.log('\nDone! Your 3 departments and queues are ready.');
  console.log('Now create your admin user via the frontend register, then update role to admin in Atlas.');
  process.exit();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
