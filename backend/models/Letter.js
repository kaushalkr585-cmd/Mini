const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  reactions: [{
    emoji: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  commentCount: {
    type: Number,
    default: 0
  },
  replyCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Letter', letterSchema);
