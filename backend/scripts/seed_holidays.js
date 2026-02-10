// Script to seed holidays into the database
const mongoose = require('mongoose');
const Holiday = require('../src/models/Holiday');
const db = require('../src/config/db');

const holidays = [
  { name: "New Year's Day", date: '2026-01-01', description: 'Order ESR Holy Loco' },
  { name: 'Makar Sankranti/Pongal', date: '2026-01-14', description: 'Order ESR Holy Loco' },
  { name: 'Basant Panchami', date: '2026-01-23', description: 'Order ESR Holy Loco' },
  { name: 'Holi', date: '2026-03-04', description: 'Order ESR Holy Loco' },
  { name: 'Id-ul-Fitr', date: '2026-03-21', description: 'Order ESR Holy Loco' },
  { name: 'Ram Navami', date: '2026-03-26', description: 'Order ESR Holy Loco' },
  { name: 'Mahavir Jayanti', date: '2026-03-31', description: 'Order ESR Holy Loco' },
  { name: 'Good Friday', date: '2026-04-03', description: 'Order ESR Holy Loco' },
  { name: 'Buddha Purnima', date: '2026-05-01', description: 'Order ESR Holy Loco' },
  { name: 'Bakrid (Eid al-Adha)', date: '2026-05-27', description: 'Order ESR Holy Loco (Tentative)' },
  { name: 'Muharram', date: '2026-06-26', description: 'Order ESR Holy Loco (Tentative)' },
  { name: 'Janmashtami', date: '2026-09-04', description: 'Order ESR Holy Loco' },
  { name: 'Dussehra', date: '2026-10-20', description: 'Order ESR Holy Loco' },
  { name: 'Diwali (Deepavali)', date: '2026-11-08', description: 'Order ESR Holy Loco' },
  { name: 'Guru Nanak Jayanti', date: '2026-11-24', description: 'Order ESR Holy Loco' },
  { name: 'Christmas Day', date: '2026-12-25', description: 'Order ESR Holy Loco' },
];

async function seed() {
  await db();
  await Holiday.deleteMany({});
  await Holiday.insertMany(holidays);
  console.log('Holidays seeded!');
  mongoose.connection.close();
}

seed();