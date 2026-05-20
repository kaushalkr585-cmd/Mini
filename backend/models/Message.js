const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String },
  image: {
    url: String,
    publicId: String
  },
  gifUrl: { type: String },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'seen'], default: 'sent' },
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
