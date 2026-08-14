const express = require('express');
const router = express.Router();
const {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  getCategories,
} = require('../controllers/videoController');
const {
  getVideoComments,
  createComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { commentLimiter } = require('../middleware/rateLimitMiddleware');

// Categories
router.get('/categories', getCategories);

// Video CRUD
router.get('/', getVideos);
router.post(
  '/',
  protect,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  createVideo
);
router.get('/:id', getVideoById);
router.put('/:id', protect, updateVideo);
router.delete('/:id', protect, deleteVideo);

// Nested Comments for convenient REST mapping
router.get('/:videoId/comments', getVideoComments);
router.post('/:videoId/comments', protect, commentLimiter, createComment);

module.exports = router;
