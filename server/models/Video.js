const mongoose = require('mongoose');

const CATEGORIES = [
  'Self Introduction',
  'Daily Life',
  'College',
  'Technology',
  'Interview Practice',
  'Group Discussion',
  'Debate',
  'Storytelling',
  'General',
];

const videoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Video must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for your speaking video'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a supported category',
      },
      default: 'General',
      index: true,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    // Optional speech metadata
    aiAnalysis: {
      status: {
        type: String,
        enum: ['none', 'pending', 'completed', 'failed'],
        default: 'none',
      },
      transcript: {
        type: String,
        default: '',
      },
      wordsPerMinute: {
        type: Number,
        default: 0,
      },
      fillerWords: [
        {
          word: String,
          count: Number,
        },
      ],
      clarityScore: {
        type: Number,
        default: 0,
      },
      feedbackNotes: [
        {
          type: String,
        },
      ],
      analyzedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for comments count
videoSchema.virtual('commentsCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'videoId',
  count: true,
});

// Indexes for high performance feeds
videoSchema.index({ createdAt: -1 });
videoSchema.index({ category: 1, createdAt: -1 });
videoSchema.index({ title: 'text', description: 'text' });

module.exports = {
  Video: mongoose.model('Video', videoSchema),
  CATEGORIES,
};
