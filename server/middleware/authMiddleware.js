const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization header (Bearer token fallback)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to continue.',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Server authentication configuration error: JWT_SECRET is missing.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this session no longer exists.',
      });
    }

    if (!currentUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Session Invalidation Check:
    // If token has a tokenVersion, it must match current user's tokenVersion.
    // If token is a legacy token (tokenVersion is undefined):
    //   - If user has never changed password (tokenVersion === 0), preserve existing session compatibility.
    //   - If user has changed password (tokenVersion > 0), reject legacy session.
    const tokenVer = decoded.tokenVersion;
    const currentVer = typeof currentUser.tokenVersion === 'number' ? currentUser.tokenVersion : 0;

    if (typeof tokenVer === 'number') {
      if (tokenVer !== currentVer) {
        return res.status(401).json({
          success: false,
          message: 'Session has been invalidated due to a password change. Please log in again.',
        });
      }
    } else if (currentVer > 0) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired due to account security update. Please log in again.',
      });
    }

    // Verify if password was changed after token was issued
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired due to a recent password change. Please log in again.',
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      const tokenVer = decoded.tokenVersion;
      const currentVer = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
      const isVersionValid = typeof tokenVer !== 'number' || tokenVer === currentVer;
      const isTimeValid = !user.changedPasswordAfter || !user.changedPasswordAfter(decoded.iat);
      if (isVersionValid && isTimeValid) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
};
