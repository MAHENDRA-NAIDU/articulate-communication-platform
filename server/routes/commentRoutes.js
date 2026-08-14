const express = require('express');
const router = express.Router();
const {
  getVideoComments,
  createComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { commentLimiter } = require('../middleware/rateLimitMiddleware');

// Direct comment routes
router.get('/video/:videoId', getVideoComments);
router.post('/video/:videoId', protect, commentLimiter, createComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
