const router = require('express').Router();
const Letter = require('../models/Letter');
const auth = require('../middleware/auth');

// GET /api/letters
router.get('/', auth, async (req, res) => {
  try {
    const letters = await Letter.find().sort({ createdAt: -1 }).populate('author', 'name avatar');
    res.json(letters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, isDraft } = req.body;
    
    const letter = await Letter.create({
      title,
      content,
      isDraft,
      author: req.user._id
    });

    const populated = await Letter.findById(letter._id).populate('author', 'name avatar');

    if (!isDraft && req.io) {
      req.io.emit('letter_created', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/letters/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, content, isDraft } = req.body;
    const letter = await Letter.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { title, content, isDraft },
      { new: true }
    ).populate('author', 'name avatar');

    if (!letter) return res.status(404).json({ error: 'Not found or unauthorized' });

    if (!isDraft && req.io) {
      req.io.emit('letter_updated', letter);
    }

    res.json(letter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/letters/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const letter = await Letter.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!letter) return res.status(404).json({ error: 'Not found or unauthorized' });

    if (req.io) {
      req.io.emit('letter_deleted', req.params.id);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters/:id/react
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const letter = await Letter.findById(req.params.id);
    if (!letter) return res.status(404).json({ error: 'Not found' });

    // Remove existing reaction by this user
    letter.reactions = letter.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    
    // Add new reaction
    letter.reactions.push({ emoji, user: req.user._id });
    await letter.save();

    if (req.io) {
      req.io.emit('letter_reacted', { letterId: letter._id, reactions: letter.reactions });
    }

    res.json(letter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
