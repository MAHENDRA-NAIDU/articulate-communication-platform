const jwt = require('jsonwebtoken');

// Validate cookie configuration on startup (Fail closed if SameSite=None without Secure=true)
const rawSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
const isProd = process.env.NODE_ENV === 'production';
const isSecure = isProd || process.env.COOKIE_SECURE === 'true';

if (rawSameSite === 'none' && !isSecure) {
  throw new Error(
    'FATAL CONFIGURATION ERROR: COOKIE_SAMESITE=none requires Secure=true (HTTPS). Insecure cross-site cookies are rejected by modern browsers.'
  );
}

/**
 * Sign JWT session token containing user ID, role, and token version
 */
const signToken = (userId, role, tokenVersion = 0) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }

  return jwt.sign(
    {
      id: userId,
      role,
      tokenVersion: typeof tokenVersion === 'number' ? tokenVersion : 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Standard cookie configuration
 */
const getCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  httpOnly: true,
  secure: isSecure,
  sameSite: rawSameSite,
  path: '/',
});

/**
 * Symmetrically clear session cookie with matching attributes
 */
const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: rawSameSite,
    path: '/',
  });
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id, user.role, user.tokenVersion);

  res.cookie('token', token, getCookieOptions());

  // Exclude password from output
  const userSafe = {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  };

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userSafe,
  });
};

module.exports = {
  signToken,
  sendTokenResponse,
  getCookieOptions,
  clearTokenCookie,
};
