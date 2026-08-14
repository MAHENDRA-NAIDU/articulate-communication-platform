const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  toggleUserStatus,
  deleteUserByAdmin,
  getAllVideos,
  deleteVideoByAdmin,
  getAllComments,
  deleteCommentByAdmin,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Admin statistics
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUserByAdmin);

// Video management
router.get('/videos', getAllVideos);
router.delete('/videos/:id', deleteVideoByAdmin);

// Comment management
router.get('/comments', getAllComments);
router.delete('/comments/:id', deleteCommentByAdmin);

module.exports = router;
