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
  console.log('✅ Seeded 2 users: owner@nishy.love / partner@nishy.love (password: nishy1234)');
}

module.exports = seed;
