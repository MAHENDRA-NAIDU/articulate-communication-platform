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
  handleResendWebhook,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');
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
router.post('/webhook/resend', handleResendWebhook);
router.get('/me', protect, getMe);

/**
 * @route   GET /api/auth/test-email?to=you@example.com
 * @desc    Diagnostic: sends a real email via the configured provider and returns full response.
 *          Remove or protect this route once email delivery is confirmed working.
 * @access  Public (temporary diagnostic — not rate-limited intentionally)
 */
router.get('/test-email', async (req, res) => {
  const to = (req.query.to || '').trim();
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid ?to=email@example.com query parameter.' });
  }

  const provider = emailService.getActiveProvider();
  const sender = emailService.isBrevoConfigured()
    ? emailService.getBrevoSender()
    : { email: 'N/A (Brevo not configured)' };

  try {
    const result = await emailService.dispatchEmail({
      to,
      name: 'Articulate Diagnostics',
      subject: 'Articulate — Email Delivery Diagnostic Test',
      text: `This is an email delivery diagnostic test sent from Articulate (Provider: ${provider.toUpperCase()}, Sender: ${JSON.stringify(sender)}).`,
      html: `<h3>Articulate Email Diagnostic</h3><p>Provider: <strong>${provider.toUpperCase()}</strong></p><p>Sender: <strong>${JSON.stringify(sender)}</strong></p><p>If you received this, transactional email delivery is working correctly.</p>`,
    });

    return res.status(result.success ? 200 : 500).json({
      success: result.success,
      provider,
      sender,
      brevo_api_key_prefix: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 8) + '...' : '(not set)',
      mail_from: process.env.MAIL_FROM || '(not set)',
      brevo_sender_email: process.env.BREVO_SENDER_EMAIL || '(not set)',
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      provider,
      sender,
      error: err.message,
    });
  }
});

module.exports = router;
