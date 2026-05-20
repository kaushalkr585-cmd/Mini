const router = require('express').Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');

// GET /api/categories
router.get('/', auth, async (req, res) => {
  try {
    const cats = await Category.find().populate('createdBy', 'name role').sort({ createdAt: 1 });
    res.json(cats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/categories
router.post('/', auth, async (req, res) => {
  try {
    const { name, emoji, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const cat = await Category.create({ name, emoji: emoji || '📁', color: color || '', createdBy: req.user._id });
    const populated = await cat.populate('createdBy', 'name role');
    req.io.emit('category:new', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/categories/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    req.io.emit('category:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
