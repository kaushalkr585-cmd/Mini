const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  emoji: { type: String, default: '📁' },
  color: { type: String, default: 'from-primary/20 to-accent/10' },
  coverImage: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
