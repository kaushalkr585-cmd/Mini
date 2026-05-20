const router = require('express').Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Milestone = require('../models/Milestone');
const auth = require('../middleware/auth');
const io = require('../server');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nishy_timeline',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4'],
    resource_type: 'auto'
  },
});

const upload = multer({ storage: storage });

// GET /api/timeline
router.get('/', auth, async (req, res) => {
  try {
    const milestones = await Milestone.find().sort({ date: -1 }).populate('createdBy', 'name avatar');
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeline
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    
    const images = req.files ? req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    })) : [];

    const milestone = await Milestone.create({
      title,
      description,
      date,
      location,
      images,
      createdBy: req.user._id
    });

    const populated = await Milestone.findById(milestone._id).populate('createdBy', 'name avatar');
    
    if (req.io) {
      req.io.emit('timeline_created', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timeline/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Not found' });

    // delete from cloudinary
    if (milestone.images && milestone.images.length > 0) {
      for (const img of milestone.images) {
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    }

    await milestone.deleteOne();

    if (req.io) {
      req.io.emit('timeline_deleted', req.params.id);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
