const Comment = require('../models/Comment');
const { Video } = require('../models/Video');

/**
 * @desc    Get all comments for a video
 * @route   GET /api/comments/video/:videoId
 * @access  Public
 */
const getVideoComments = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const comments = await Comment.find({ videoId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username profileImage role');

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a constructive feedback comment to a video
 * @route   POST /api/comments/video/:videoId
 * @access  Private
 */
const createComment = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment cannot be empty.',
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment cannot exceed 1000 characters.',
      });
    }

    // Verify target video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Target speaking video not found.',
      });
    }

    const comment = await Comment.create({
      userId: req.user._id,
      videoId,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'userId',
      'name username profileImage role'
    );

    res.status(201).json({
      success: true,
      message: 'Feedback comment added successfully.',
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a comment (Allowed for Comment Author, Video Creator, or Admin)
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const video = await Video.findById(comment.videoId);

    const isCommentAuthor = comment.userId.toString() === req.user._id.toString();
    const isVideoCreator = video && video.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCommentAuthor && !isVideoCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this feedback comment.',
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback comment deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVideoComments,
  createComment,
  deleteComment,
};
