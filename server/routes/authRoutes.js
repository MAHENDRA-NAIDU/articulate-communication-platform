const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
