const mongoose = require('mongoose');

const loveNoteSchema = new mongoose.Schema({
  title: { type: String, default: 'Our Story ❤️' },
  message: { type: String, default: 'Every moment with you is my favorite chapter.' },
  fontStyle: { type: String, default: 'Playfair Display' },
  alignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  imageUrl: { type: String, default: '' },
  bgType: { type: String, default: 'glassmorphism' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LoveNote', loveNoteSchema);
