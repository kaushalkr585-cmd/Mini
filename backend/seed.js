const User = require('./models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.countDocuments();
  if (existing >= 2) { console.log('Users already seeded.'); return; }

  const hash = await bcrypt.hash('nishy1234', 10);
  const users = [
    { name: 'Owner', email: 'owner@nishy.love', password: hash, role: 'owner' },
    { name: 'Partner', email: 'partner@nishy.love', password: hash, role: 'partner' },
  ];
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) await User.create(u);
  }
  const defaultCategories = [
    { name: 'Trips', emoji: '✈️', color: 'from-blue-500 to-cyan-500' },
    { name: 'Dates', emoji: '🍷', color: 'from-rose-500 to-pink-500' },
    { name: 'Selfies', emoji: '🤳', color: 'from-yellow-400 to-orange-500' },
    { name: 'Videos', emoji: '🎬', color: 'from-purple-500 to-indigo-500' },
    { name: 'Special Moments', emoji: '💖', color: 'from-red-500 to-rose-600' }
  ];

  const Category = require('./models/Category');
  const catCount = await Category.countDocuments();
  if (catCount === 0) {
    const owner = await User.findOne({ email: 'owner@nishy.love' });
    if (owner) {
      for (const cat of defaultCategories) {
        await Category.create({ ...cat, createdBy: owner._id });
      }
      console.log('✅ Seeded 5 default categories.');
    }
  }

  console.log('✅ Seeded 2 users: owner@nishy.love / partner@nishy.love (password: nishy1234)');
}

module.exports = seed;
