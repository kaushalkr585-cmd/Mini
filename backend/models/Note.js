const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  subject: { type: String, default: 'Note' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  editedAt: { type: Date, default: null },
  pinned: { type: Boolean, default: false },
  wax: { type: String, default: '🌹' },
  sealed: { type: Boolean, default: false },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
