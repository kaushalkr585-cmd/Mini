const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sub: { type: String, default: '' },           // date label
  notes: { type: String, default: '' },         // memory description/notes
  location: { type: String, default: '' },      // memory location
  tag: { type: String, default: 'Memory' },
  type: { type: String, enum: ['photo', 'video', 'voice'], default: 'photo' },
  url: { type: String, required: true },         // Main Cloudinary URL
  publicId: { type: String, required: true },    // Main Cloudinary public_id
  urls: [{ type: String }],                      // Additional images
  publicIds: [{ type: String }],                 // Additional public_ids
  thumbnail: { type: String, default: '' },      // video poster / thumb
  duration: { type: Number, default: 0 },         // video duration in seconds
  resolution: { type: String, default: '' },      // video resolution (e.g. 1920x1080)
  tags: { type: [String], default: [] },          // multiple tags support
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String, required: true }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Memory', memorySchema);
