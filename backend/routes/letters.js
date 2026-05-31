const router = require('express').Router();
const Letter = require('../models/Letter');
const LetterComment = require('../models/LetterComment');
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

// ==========================================
// COMMENTS SECTION
// ==========================================

// GET /api/letters/:id/comments (Fetch all comments for a letter)
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await LetterComment.find({ letterId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'name avatar');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters/:id/comments (Create top-level comment)
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const letter = await Letter.findById(req.params.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    const comment = await LetterComment.create({
      letterId: req.params.id,
      author: req.user._id,
      text
    });

    letter.commentCount = (letter.commentCount || 0) + 1;
    await letter.save();

    const populated = await LetterComment.findById(comment._id).populate('author', 'name avatar');

    if (req.io) {
      req.io.emit('letter_commented', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters/comments/:commentId/reply (Reply to a comment)
router.post('/comments/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const parentComment = await LetterComment.findById(req.params.commentId);
    if (!parentComment) return res.status(404).json({ error: 'Parent comment not found' });

    const letter = await Letter.findById(parentComment.letterId);
    if (letter) {
      letter.replyCount = (letter.replyCount || 0) + 1;
      await letter.save();
    }

    const reply = await LetterComment.create({
      letterId: parentComment.letterId,
      author: req.user._id,
      text,
      parentId: parentComment._id
    });

    const populated = await LetterComment.findById(reply._id).populate('author', 'name avatar');

    if (req.io) {
      req.io.emit('letter_replied', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/letters/comments/:commentId (Edit a comment/reply)
router.patch('/comments/:commentId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await LetterComment.findOneAndUpdate(
      { _id: req.params.commentId, author: req.user._id },
      { text },
      { new: true }
    ).populate('author', 'name avatar');

    if (!comment) return res.status(404).json({ error: 'Not found or unauthorized' });

    if (req.io) {
      req.io.emit('comment_updated', comment);
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/letters/comments/:commentId (Delete a comment/reply)
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await LetterComment.findOneAndDelete({ _id: req.params.commentId, author: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Not found or unauthorized' });

    // Also delete any child replies
    const deletedReplies = await LetterComment.deleteMany({ parentId: comment._id });

    // Decrement counts on the Letter
    const letter = await Letter.findById(comment.letterId);
    if (letter) {
      if (comment.parentId) {
        letter.replyCount = Math.max(0, (letter.replyCount || 0) - 1);
      } else {
        letter.commentCount = Math.max(0, (letter.commentCount || 0) - 1);
      }
      // Also decrement replyCount for all deleted replies
      if (deletedReplies.deletedCount > 0) {
        letter.replyCount = Math.max(0, (letter.replyCount || 0) - deletedReplies.deletedCount);
      }
      await letter.save();
    }

    if (req.io) {
      req.io.emit('comment_deleted', { commentId: req.params.commentId, letterId: comment.letterId });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters/comments/:commentId/react (React to a comment)
router.post('/comments/:commentId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const comment = await LetterComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Not found' });

    // Remove existing reaction by this user
    comment.reactions = comment.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    
    // Add new reaction if emoji is provided
    if (emoji) {
      comment.reactions.push({ emoji, user: req.user._id });
    }
    await comment.save();

    if (req.io) {
      req.io.emit('comment_reacted', { commentId: comment._id, reactions: comment.reactions, letterId: comment.letterId });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
