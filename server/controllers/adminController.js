const User = require('../models/User');
const { Video } = require('../models/Video');
const Comment = require('../models/Comment');
const { deleteMedia } = require('../middleware/uploadMiddleware');
const { escapeRegex } = require('../utils/sanitizeUtils');

/**
 * @desc    Get dashboard statistics for Admin
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVideos = await Video.countDocuments();
    const totalComments = await Comment.countDocuments();

    // Recent 5 users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    // Recent 5 videos
    const recentVideos = await Video.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name username profileImage');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalVideos,
        totalComments,
      },
      recentUsers,
      recentVideos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users with search and pagination for Admin
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search && search.trim() !== '') {
      const sanitized = escapeRegex(search);
      if (sanitized) {
        query.$or = [
          { name: { $regex: sanitized, $options: 'i' } },
          { username: { $regex: sanitized, $options: 'i' } },
          { email: { $regex: sanitized, $options: 'i' } },
        ];
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-password')
      .populate('videoCount');

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active/suspended status
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot deactivate their own account.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'suspended'}.`,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account and all their content by Admin
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUserByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot delete their own account from the admin dashboard.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Cascade delete videos & media
    const userVideos = await Video.find({ userId: user._id });
    for (const vid of userVideos) {
      if (vid.publicId) {
        await deleteMedia(vid.publicId, 'video');
      }
      await Comment.deleteMany({ videoId: vid._id });
      await vid.deleteOne();
    }

    // Delete comments by user
    await Comment.deleteMany({ userId: user._id });

    // Delete user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: `User @${user.username} and all associated content were deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all videos across platform for moderation
 * @route   GET /api/admin/videos
 * @access  Private/Admin
 */
const getAllVideos = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      const sanitized = escapeRegex(search);
      if (sanitized) {
        query.$or = [
          { title: { $regex: sanitized, $options: 'i' } },
          { description: { $regex: sanitized, $options: 'i' } },
        ];
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name username email profileImage')
      .populate('commentsCount');

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete video by Admin
 * @route   DELETE /api/admin/videos/:id
 * @access  Private/Admin
 */
const deleteVideoByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    if (video.publicId) {
      await deleteMedia(video.publicId, 'video');
    }

    await Comment.deleteMany({ videoId: video._id });
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Video deleted by admin successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all comments across platform for moderation
 * @route   GET /api/admin/comments
 * @access  Private/Admin
 */
const getAllComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const total = await Comment.countDocuments();
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name username email profileImage')
      .populate('videoId', 'title category');

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete comment by Admin
 * @route   DELETE /api/admin/comments/:id
 * @access  Private/Admin
 */
const deleteCommentByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment removed by admin.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  toggleUserStatus,
  deleteUserByAdmin,
  getAllVideos,
  deleteVideoByAdmin,
  getAllComments,
  deleteCommentByAdmin,
};
