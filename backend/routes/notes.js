const router = require('express').Router();
const auth = require('../middleware/auth');
const Note = require('../models/Note');

// GET /api/notes?category=
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.categoryId = req.query.category;
    const notes = await Note.find(filter)
      .populate('createdBy', 'name role')
      .populate('editedBy', 'name role')
      .sort({ pinned: -1, createdAt: -1 });
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/notes
router.post('/', auth, async (req, res) => {
  try {
    const { content, subject, categoryId, wax, sealed } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const note = await Note.create({ content, subject: subject || 'Note', categoryId: categoryId || null, wax: wax || '🌹', sealed: sealed || false, createdBy: req.user._id });
    const populated = await note.populate(['createdBy', 'editedBy']);
    req.io.emit('note:new', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/notes/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const { content, subject, pinned, sealed, wax, categoryId } = req.body;
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { content, subject, pinned, sealed, wax, categoryId, editedBy: req.user._id, editedAt: new Date() },
      { new: true }
    ).populate(['createdBy', 'editedBy']);
    req.io.emit('note:updated', note);
    res.json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/notes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    req.io.emit('note:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
