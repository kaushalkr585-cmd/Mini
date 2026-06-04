const router = require('express').Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');
const Memory = require('../models/Memory');

// GET /api/categories  — returns categories with photo/video counts and coverImage
router.get('/', auth, async (req, res) => {
  try {
    const cats = await Category.find().populate('createdBy', 'name role').sort({ createdAt: 1 });

    // For each category, compute photo count, video count, and auto-coverImage
    const enriched = await Promise.all(cats.map(async (cat) => {
      const memories = await Memory.find({ categoryId: cat._id }).sort({ createdAt: -1 });
      const photoCount = memories.filter(m => m.type === 'photo').length;
      const videoCount = memories.filter(m => m.type === 'video').length;

      // Auto cover: use the latest uploaded image URL, else existing coverImage
      let coverImage = cat.coverImage || '';
      const latestImage = memories.find(m => m.type === 'photo' && m.url);
      if (latestImage) coverImage = latestImage.url;

      return {
        ...cat.toObject(),
        photoCount,
        videoCount,
        coverImage,
      };
    }));

    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/categories
router.post('/', auth, async (req, res) => {
  try {
    const { name, emoji, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const cat = await Category.create({ name, emoji: emoji || '📁', color: color || '', createdBy: req.user._id });
    const populated = await cat.populate('createdBy', 'name role');
    req.io.emit('category:new', { ...populated.toObject(), photoCount: 0, videoCount: 0, coverImage: '' });
    res.status(201).json({ ...populated.toObject(), photoCount: 0, videoCount: 0, coverImage: '' });
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

// PATCH /api/categories/:id — edit name, emoji, color
router.patch('/:id', auth, async (req, res) => {
  try {
    const { name, emoji, color } = req.body;
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(emoji && { emoji }), ...(color !== undefined && { color }) },
      { new: true }
    ).populate('createdBy', 'name role');
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // Recompute counts for the emit
    const Memory = require('../models/Memory');
    const memories = await Memory.find({ categoryId: cat._id }).sort({ createdAt: -1 });
    const photoCount = memories.filter(m => m.type === 'photo').length;
    const videoCount = memories.filter(m => m.type === 'video').length;
    const latestImage = memories.find(m => m.type === 'photo' && m.url);
    const coverImage = latestImage?.url || cat.coverImage || '';

    const payload = { ...cat.toObject(), photoCount, videoCount, coverImage };
    req.io.emit('category:updated', payload);
    res.json(payload);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
