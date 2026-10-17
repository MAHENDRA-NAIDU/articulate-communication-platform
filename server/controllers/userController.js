const User = require('../models/User');
const { Video } = require('../models/Video');
const Comment = require('../models/Comment');
const { uploadMedia, deleteMedia } = require('../middleware/uploadMiddleware');
const { clearTokenCookie } = require('../utils/tokenUtils');

/**
 * @desc    Get user profile by ID or Username with their videos
 * @route   GET /api/users/:identifier
 * @access  Public
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is an ObjectId or username
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: identifier } : { username: identifier.toLowerCase() };

    const user = await User.findOne(query).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    // Fetch user's uploaded videos
    const videos = await Video.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username profileImage');

    // Count total comments received across all their videos (Feedback received)
    const videoIds = videos.map((v) => v._id);
    const totalFeedbackReceived = await Comment.countDocuments({ videoId: { $in: videoIds } });

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        videoCount: videos.length,
        totalFeedbackReceived,
      },
      videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, username, bio, profileImage } = req.body;

    // Verify ownership
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this profile.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Handle avatar file upload if provided
    let avatarUrl = profileImage;
    if (req.file) {
      const uploadRes = await uploadMedia(req.file, 'avatars', 'image');
      avatarUrl = uploadRes.url;
    }

    if (name) user.name = name.trim();

    // Handle username update with validation & uniqueness check
    if (username) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3–30 characters long and contain only letters, numbers, and underscores.',
        });
      }

      if (cleanUsername !== user.username) {
        const existingUser = await User.findOne({
          username: cleanUsername,
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: `The username '@${cleanUsername}' is already taken. Please choose another username.`,
          });
        }
        user.username = cleanUsername;
      }
    }

    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.profileImage = avatarUrl;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account and cascade clean all related resources
 * @route   DELETE /api/users/:id
 * @access  Private
 */
const deleteUserAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this account.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Find and delete all videos created by this user and their media files
    const userVideos = await Video.find({ userId: user._id });
    for (const vid of userVideos) {
      if (vid.publicId) {
        await deleteMedia(vid.publicId, 'video');
      }
      await Comment.deleteMany({ videoId: vid._id });
      await vid.deleteOne();
    }

    // Delete comments authored by this user on other videos
    await Comment.deleteMany({ userId: user._id });

    // Delete user
    await user.deleteOne();

    // If user deleted their own account, clear cookie symmetrically
    if (req.user._id.toString() === id) {
      clearTokenCookie(res);
    }

    res.status(200).json({
      success: true,
      message: 'Account and associated data deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
};
