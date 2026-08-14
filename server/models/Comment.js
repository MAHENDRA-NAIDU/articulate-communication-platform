const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author'],
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: [true, 'Comment must belong to a video'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment text cannot be empty'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

commentSchema.index({ videoId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
