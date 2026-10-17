const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  resendVerificationOTP,
  googleSignIn,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  loginLimiter,
  registerLimiter,
  passwordChangeLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyOTPLimiter,
  resendOTPLimiter,
  googleAuthLimiter,
} = require('../middleware/rateLimitMiddleware');

router.post('/register', registerLimiter, register);
router.post('/verify-email', verifyOTPLimiter, verifyEmail);
router.post('/resend-verification', resendOTPLimiter, resendVerificationOTP);
router.post('/google', googleAuthLimiter, googleSignIn);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.put('/change-password', protect, passwordChangeLimiter, changePassword);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
