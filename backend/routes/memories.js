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

// GET /api/memories/signature
router.get('/signature', auth, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'nishy/memories';
    
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      cloudinary.config().api_secret
    );
    
    res.json({
      signature,
      timestamp,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      folder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memories/upload  (multipart/form-data OR JSON body with preUploadedFiles)
router.post('/upload', auth, upload.array('files', 20), async (req, res) => {
  try {
    const { title, tag, categoryId, sub, notes, location, preUploadedFiles } = req.body;

    let urls = [];
    let publicIds = [];
    let isVideo = false;
    let duration = 0;
    let resolution = '';

    let parsedPreUploaded = [];
    if (preUploadedFiles) {
      try {
        parsedPreUploaded = typeof preUploadedFiles === 'string' ? JSON.parse(preUploadedFiles) : preUploadedFiles;
      } catch (e) {
        console.error('Failed to parse preUploadedFiles:', e);
      }
    }

    if (parsedPreUploaded && parsedPreUploaded.length > 0) {
      urls = parsedPreUploaded.map(f => f.url);
      publicIds = parsedPreUploaded.map(f => f.publicId);
      const firstFile = parsedPreUploaded[0];
      isVideo = firstFile.type === 'video';
      duration = firstFile.duration || 0;
      resolution = firstFile.resolution || '';
    } else {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      isVideo = req.files[0].mimetype?.startsWith('video/') || req.files[0].resource_type === 'video';
      urls = req.files.map(f => f.path);
      publicIds = req.files.map(f => f.filename);

      if (isVideo) {
        try {
          const fileInfo = req.files[0];
          const result = fileInfo.cloudinary || fileInfo.info || fileInfo.api_res;
          if (result && result.duration) {
            duration = Math.round(result.duration);
            resolution = `${result.width}x${result.height}`;
          } else {
            const resource = await cloudinary.api.resource(publicIds[0], { resource_type: 'video' });
            if (resource) {
              duration = Math.round(resource.duration || 0);
              resolution = `${resource.width || 0}x${resource.height || 0}`;
            }
          }
        } catch (err) {
          console.error('Failed to retrieve video metadata:', err);
        }
      }
    }

    let tagsArray = [];
    if (req.body.tags) {
      try {
        tagsArray = JSON.parse(req.body.tags);
      } catch (e) {
        if (typeof req.body.tags === 'string') {
          tagsArray = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
    } else if (tag) {
      tagsArray = [tag];
    }

    const defaultTitle = parsedPreUploaded && parsedPreUploaded.length > 0 
      ? 'Memory' 
      : req.files[0].originalname.replace(/\.[^.]+$/, '');

    const memory = await Memory.create({
      title: title || defaultTitle,
      sub: sub || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      notes: notes || '',
      location: location || '',
      tag: tag || 'Memory',
      type: isVideo ? 'video' : 'photo',
      url: urls[0],
      publicId: publicIds[0],
      urls: urls,
      publicIds: publicIds,
      thumbnail: isVideo ? urls[0].replace('/upload/', '/upload/c_limit,w_640,h_360,f_jpg,q_auto,so_0/') : '',
      duration: isVideo ? duration : 0,
      resolution: isVideo ? resolution : '',
      tags: tagsArray,
      categoryId: categoryId || null,
      uploadedBy: req.user._id,
    });
    
    const populated = await memory.populate('uploadedBy', 'name role');

    req.io.emit('memory:new', populated);

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

// POST /api/memories/:id/react
router.post('/:id/react', auth, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ error: 'Not found' });

    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });

    const userIdStr = req.user._id.toString();
    const existingIndex = memory.reactions.findIndex(
      r => r.userId.toString() === userIdStr && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Toggle off
      memory.reactions.splice(existingIndex, 1);
    } else {
      // Add new
      memory.reactions.push({ userId: req.user._id, emoji });
    }

    await memory.save();
    req.io.emit('memory:reacted', { memoryId: memory._id, reactions: memory.reactions });
    res.json(memory.reactions);
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
    const { title, tag, sub, categoryId, location, notes, tags } = req.body;
    let tagsArray = tags;
    if (typeof tags === 'string') {
      try {
        tagsArray = JSON.parse(tags);
      } catch (e) {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    const memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, tag, sub, categoryId, location, notes, tags: tagsArray },
      { new: true }
    ).populate('uploadedBy', 'name role');
    req.io.emit('memory:updated', memory);
    res.json(memory);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
