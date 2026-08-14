const jwt = require('jsonwebtoken');

const signToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_for_communication_practice_2025_safe_token',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

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
};
