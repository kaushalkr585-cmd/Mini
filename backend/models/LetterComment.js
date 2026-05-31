const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  letterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Letter',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LetterComment',
    default: null // Null means it's a top-level comment
  },
  reactions: [{
    emoji: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('LetterComment', commentSchema);
