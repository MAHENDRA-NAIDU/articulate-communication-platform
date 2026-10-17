const { Video, CATEGORIES } = require('../models/Video');
const Comment = require('../models/Comment');
const { uploadMedia, deleteMedia } = require('../middleware/uploadMiddleware');
const { escapeRegex } = require('../utils/sanitizeUtils');

/**
 * @desc    Get all videos with search, category filtering, sorting, and pagination
 * @route   GET /api/videos
 * @access  Public
 */
const getVideos = async (req, res, next) => {
  try {
    const {
      category,
      search,
      sort = 'newest',
      page = 1,
      limit = 12,
      userId,
    } = req.query;

    const query = {};

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // User filter
    if (userId) {
      query.userId = userId;
    }

    // Search query in title or description (sanitized to prevent ReDoS and regex crashes)
    if (search && search.trim() !== '') {
      const sanitizedSearch = escapeRegex(search);
      if (sanitizedSearch) {
        query.$or = [
          { title: { $regex: sanitizedSearch, $options: 'i' } },
          { description: { $regex: sanitizedSearch, $options: 'i' } },
        ];
      }
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default newest
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'most_viewed') {
      sortOption = { views: -1 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const totalVideos = await Video.countDocuments(query);

    let videos = await Video.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name username profileImage')
      .populate('commentsCount');

    // If sorting by most commented, sort in memory
    if (sort === 'most_commented') {
      videos = videos.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }

    res.status(200).json({
      success: true,
      count: videos.length,
      total: totalVideos,
      totalPages: Math.ceil(totalVideos / limitNum) || 1,
      currentPage: pageNum,
      videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single video by ID and increment view count
 * @route   GET /api/videos/:id
 * @access  Public
 */
const getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id)
      .populate('userId', 'name username profileImage bio createdAt')
      .populate('commentsCount');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Speaking video not found or may have been removed.',
      });
    }

    // Increment view count asynchronously
    video.views += 1;
    await video.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      video,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload and create a new practice video
 * @route   POST /api/videos
 * @access  Private
 */
const createVideo = async (req, res, next) => {
  try {
    const { title, description, category, duration, videoUrl: directVideoUrl, thumbnailUrl: directThumbnailUrl } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a title for your practice video.',
      });
    }

    let finalVideoUrl = directVideoUrl;
    let finalPublicId = '';
    let finalThumbnailUrl = directThumbnailUrl || '';

    // If video file uploaded via multipart form
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const uploadRes = await uploadMedia(videoFile, 'videos', 'video');
      finalVideoUrl = uploadRes.url;
      finalPublicId = uploadRes.publicId;
    } else if (req.file) {
      const uploadRes = await uploadMedia(req.file, 'videos', 'video');
      finalVideoUrl = uploadRes.url;
      finalPublicId = uploadRes.publicId;
    }

    // If thumbnail file uploaded
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbFile = req.files.thumbnail[0];
      const thumbRes = await uploadMedia(thumbFile, 'thumbnails', 'image');
      finalThumbnailUrl = thumbRes.url;
    }

    if (!finalVideoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video file or provide a video URL.',
      });
    }

    // Validate category
    const validCategory = CATEGORIES.includes(category) ? category : 'General';

    const video = await Video.create({
      userId: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: validCategory,
      videoUrl: finalVideoUrl,
      publicId: finalPublicId,
      thumbnailUrl: finalThumbnailUrl,
      duration: duration ? Math.round(Number(duration)) : 0,
      aiAnalysis: {
        status: 'none',
        transcript: '',
        wordsPerMinute: 0,
        fillerWords: [],
        clarityScore: 0,
        feedbackNotes: [],
      },
    });

    const populatedVideo = await Video.findById(video._id).populate(
      'userId',
      'name username profileImage'
    );

    res.status(201).json({
      success: true,
      message: 'Practice video published successfully!',
      video: populatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update video details (title, description, category)
 * @route   PUT /api/videos/:id
 * @access  Private
 */
const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Verify ownership or admin
    if (video.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this video.',
      });
    }

    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (category && CATEGORIES.includes(category)) video.category = category;

    await video.save();

    const updatedVideo = await Video.findById(id).populate(
      'userId',
      'name username profileImage'
    );

    res.status(200).json({
      success: true,
      message: 'Video updated successfully.',
      video: updatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete video, associated media file, and comments
 * @route   DELETE /api/videos/:id
 * @access  Private
 */
const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Verify ownership or admin
    if (video.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this video.',
      });
    }

    // Delete media file from Cloudinary or local uploads
    if (video.publicId) {
      await deleteMedia(video.publicId, 'video');
    }

    // Cascade delete all comments for this video
    await Comment.deleteMany({ videoId: video._id });

    // Delete video record
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Practice video and associated comments deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all available categories with counts
 * @route   GET /api/videos/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const counts = await Video.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const categoryList = CATEGORIES.map((cat) => ({
      name: cat,
      count: countMap[cat] || 0,
    }));

    res.status(200).json({
      success: true,
      categories: categoryList,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  getCategories,
};
