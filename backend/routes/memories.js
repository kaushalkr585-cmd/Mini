const router = require('express').Router();
const auth = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');
const Memory = require('../models/Memory');

// GET /api/memories?category=&tag=&type=
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.categoryId = req.query.category;
    if (req.query.tag) filter.tag = req.query.tag;
    if (req.query.type) filter.type = req.query.type;
    const memories = await Memory.find(filter)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(memories);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/memories/upload  (multipart/form-data, field: "files" — up to 20)
router.post('/upload', auth, upload.array('files', 20), async (req, res) => {
  try {
    const { title, tag, categoryId, sub, notes, location } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const isVideo = req.files[0].mimetype?.startsWith('video/') || req.files[0].resource_type === 'video';
    
    const urls = req.files.map(f => f.path);
    const publicIds = req.files.map(f => f.filename);

    const memory = await Memory.create({
      title: title || req.files[0].originalname.replace(/\.[^.]+$/, ''),
      sub: sub || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      notes: notes || '',
      location: location || '',
      tag: tag || 'Memory',
      type: isVideo ? 'video' : 'photo',
      url: urls[0], // Main image
      publicId: publicIds[0],
      urls: urls, // Store all images
      publicIds: publicIds,
      thumbnail: isVideo ? urls[0].replace('/upload/', '/upload/so_0,f_jpg/') : '',
      categoryId: categoryId || null,
      uploadedBy: req.user._id,
    });
    
    const populated = await memory.populate('uploadedBy', 'name role');

    // Broadcast new memory to partner
    req.io.emit('memory:new', populated);

    // Activity broadcast
    req.io.emit('activity:update', {
      userId: req.user._id,
      userName: req.user.name,
      action: `uploaded a new memory with ${urls.length} photo${urls.length > 1 ? 's' : ''}`,
      target: 'memories',
      at: new Date(),
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/memories/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ error: 'Not found' });

    // Remove from Cloudinary
    await cloudinary.uploader.destroy(memory.publicId, {
      resource_type: memory.type === 'video' ? 'video' : 'image',
    }).catch(() => {}); // Don't fail if already gone

    await memory.deleteOne();
    req.io.emit('memory:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/memories/:id/like
router.patch('/:id/like', auth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ error: 'Not found' });

    const idx = memory.likes.indexOf(req.user._id);
    if (idx > -1) memory.likes.splice(idx, 1);
    else memory.likes.push(req.user._id);
    await memory.save();

    req.io.emit('memory:liked', { id: memory._id, likes: memory.likes });
    res.json({ likes: memory.likes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/memories/:id — edit title/tag
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, tag, sub, categoryId } = req.body;
    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, tag, sub, categoryId },
      { new: true }
    ).populate('uploadedBy', 'name role');
    req.io.emit('memory:updated', memory);
    res.json(memory);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
