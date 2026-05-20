const router = require('express').Router();

const auth = require('../middleware/auth');
const Message = require('../models/Message');

const { upload } = require('../middleware/upload');

// GET /api/messages — last 100
router.get('/', auth, async (req, res) => {
  try {
    const msgs = await Message.find()
      .populate('from', 'name role avatar')
      .populate({ path: 'replyTo', populate: { path: 'from', select: 'name' } })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/messages
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { text, gifUrl, replyTo } = req.body;
    
    if (!text?.trim() && !req.file && !gifUrl) {
      return res.status(400).json({ error: 'Text, image, or GIF required' });
    }

    const payload = { from: req.user._id, status: 'sent' };
    if (text?.trim()) payload.text = text.trim();
    if (gifUrl) payload.gifUrl = gifUrl;
    if (replyTo) payload.replyTo = replyTo;
    
    if (req.file) {
      payload.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    const msg = await Message.create(payload);
    const populated = await msg.populate([
      { path: 'from', select: 'name role avatar' },
      { path: 'replyTo', populate: { path: 'from', select: 'name' } }
    ]);
    req.io.emit('message:new', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/messages/status/seen
router.patch('/status/seen', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { from: { $ne: req.user._id }, status: { $ne: 'seen' } },
      { $set: { status: 'seen' } }
    );
    req.io.emit('messages:seen', { byUser: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/messages/:id (edit)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const msg = await Message.findOne({ _id: req.params.id, from: req.user._id });
    if (!msg) return res.status(404).json({ error: 'Not found or unauthorized' });
    
    msg.text = text;
    msg.isEdited = true;
    await msg.save();
    
    const populated = await msg.populate([
      { path: 'from', select: 'name role avatar' },
      { path: 'replyTo', populate: { path: 'from', select: 'name' } }
    ]);
    req.io.emit('message:update', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/messages/all (Clear chat history)
router.delete('/all', auth, async (req, res) => {
  try {
    await Message.deleteMany({});
    req.io.emit('messages:cleared');
    res.json({ success: true, message: 'Chat cleared' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/messages/:id (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const msg = await Message.findOne({ _id: req.params.id, from: req.user._id });
    if (!msg) return res.status(404).json({ error: 'Not found or unauthorized' });
    
    msg.isDeleted = true;
    msg.text = null;
    msg.image = null;
    msg.gifUrl = null;
    await msg.save();
    
    const populated = await msg.populate([
      { path: 'from', select: 'name role avatar' },
      { path: 'replyTo', populate: { path: 'from', select: 'name' } }
    ]);
    req.io.emit('message:update', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/messages/:id/react
router.patch('/:id/react', auth, async (req, res) => {
  try {
    console.log(`[REACT API] Reacting to message ${req.params.id} with ${req.body.emoji} by ${req.user._id}`);
    const { emoji } = req.body;
    let msg = await Message.findById(req.params.id);
    if (!msg) {
      console.log(`[REACT API] Message not found!`);
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Ensure it's a mongoose array
    if (!msg.reactions) {
      msg.set('reactions', []);
    }
    
    const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === req.user._id.toString() && r.emoji === emoji);
    if (existingIdx > -1) {
      msg.reactions.splice(existingIdx, 1);
      console.log(`[REACT API] Removed reaction`);
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
      console.log(`[REACT API] Added reaction`);
    }
    
    msg.markModified('reactions');
    await msg.save();
    
    const populated = await msg.populate([
      { path: 'from', select: 'name role avatar' },
      { path: 'replyTo', populate: { path: 'from', select: 'name' } }
    ]);
    console.log(`[REACT API] Emitting message:update`, populated.reactions);
    req.io.emit('message:update', populated);
    res.json(populated);
  } catch (err) { 
    console.error(`[REACT API] Error:`, err);
    res.status(500).json({ error: err.message }); 
  }
});



module.exports = router;
