const router = require('express').Router();
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const LoveNote = require('../models/LoveNote');

// GET /api/lovenote - Get the homepage love note
router.get('/', async (req, res) => {
  try {
    let note = await LoveNote.findOne().populate('createdBy', 'name role');
    if (!note) {
      // Create and save the default love note
      note = await LoveNote.create({
        title: 'Our Story ❤️',
        message: 'Every moment with you is my favorite chapter.',
        fontStyle: 'Playfair Display',
        alignment: 'center',
        imageUrl: '',
        bgType: 'glassmorphism'
      });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/lovenote - Update the love note (supports image file upload)
router.put('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, message, fontStyle, alignment, bgType, deleteImage } = req.body;
    let note = await LoveNote.findOne();
    if (!note) {
      note = new LoveNote();
    }

    if (title !== undefined) note.title = title;
    if (message !== undefined) note.message = message;
    if (fontStyle !== undefined) note.fontStyle = fontStyle;
    if (alignment !== undefined) note.alignment = alignment;
    if (bgType !== undefined) note.bgType = bgType;

    if (req.file) {
      note.imageUrl = req.file.path;
    } else if (deleteImage === 'true' || deleteImage === true) {
      note.imageUrl = '';
    }

    note.createdBy = req.user._id;
    await note.save();

    const populated = await note.populate('createdBy', 'name role');

    // Broadcast change to other client sockets in real-time
    req.io.emit('lovenote:updated', populated);

    res.json(populated);
  } catch (err) {
    console.error('Failed to update LoveNote:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
