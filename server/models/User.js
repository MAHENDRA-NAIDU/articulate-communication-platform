const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    username: {
      type: String,
      required: [true, 'Please provide a unique username'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      // Not required for Google-only accounts (authProvider: 'google')
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [240, 'Bio cannot exceed 240 characters'],
      default: 'Practicing communication and speaking skills every day.',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOTP: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for user's video count
userSchema.virtual('videoCount', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'userId',
  count: true,
});

// Pre-save hook: Hash password if modified (Standard Promise-based async hook)
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to verify if password was changed after token issuance
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt && JWTTimestamp) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to generate single-use cryptographically secure password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token with SHA-256 before saving to database
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Configurable expiry: defaults to 15 minutes
  const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES, 10) || 15;
  this.passwordResetExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return resetToken;
};

/**
 * Generate a cryptographically secure 6-digit OTP for email verification.
 * Stores only the SHA-256 hash. Returns the plaintext OTP for email delivery.
 */
userSchema.methods.createEmailVerificationOTP = function () {
  // Generate cryptographically random 6-digit numeric OTP
  const otpBuffer = crypto.randomBytes(4);
  const otpNum = otpBuffer.readUInt32BE(0) % 1000000;
  const otp = String(otpNum).padStart(6, '0');

  // Store only the SHA-256 hash
  this.emailVerificationOTP = crypto.createHash('sha256').update(otp).digest('hex');

  // Configurable expiry: defaults to 10 minutes
  const expiryMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10;
  this.emailVerificationExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Reset attempts counter on new OTP issuance
  this.emailVerificationAttempts = 0;

  return otp;
};

module.exports = mongoose.model('User', userSchema);
