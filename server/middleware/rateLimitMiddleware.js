const rateLimit = require('express-rate-limit');

/**
 * Helper to construct rate limiters with secure defaults that handle cloud reverse proxy
 * headers (Render, Cloudflare, AWS) without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
 */
const createLimiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: true },
    ...options,
  });

/**
 * Strict rate limiter for login attempts (prevents credential stuffing & brute-force)
 */
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for user registration (prevents bot account generation)
 */
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 100 : 10, // 10 accounts per hour per IP (relaxed in test runner)
  message: {
    success: false,
    message: 'Too many accounts created from this IP address. Please try again later.',
  },
});

/**
 * Strict rate limiter for password change attempts
 */
const passwordChangeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many password change attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * General auth limiter fallback for backward compatibility
 */
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for comment / feedback submissions
 */
const commentLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 comments per minute
  message: {
    success: false,
    message: 'You are posting comments too quickly. Please slow down.',
  },
});

/**
 * Rate limiter for forgot-password requests (prevents email flooding / enumeration abuse)
 */
const forgotPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 8 : 5, // 5 requests per 15 minutes per IP (8 in isolated test runner)
  message: {
    success: false,
    message: 'Too many password recovery requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for reset-password attempts
 */
const resetPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many password reset attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Strict rate limiter for email OTP verification attempts (prevents brute-forcing 6-digit codes)
 */
const verifyOTPLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many verification attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for resending verification OTP (prevents email spam / flooding)
 */
const resendOTPLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many OTP resend requests from this IP address. Please wait before requesting another code.',
  },
});

/**
 * Rate limiter for Google authentication
 */
const googleAuthLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many Google authentication attempts from this IP. Please try again later.',
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordChangeLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyOTPLimiter,
  resendOTPLimiter,
  googleAuthLimiter,
  authLimiter,
  commentLimiter,
};
