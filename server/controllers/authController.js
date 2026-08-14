const User = require('../models/User');
const { sendTokenResponse } = require('../utils/tokenUtils');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, username, email, password, confirmPassword, adminSecret } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, username, email, password).',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please re-enter your password.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters long.',
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores.',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      if (existingUser.username === cleanUsername) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
      }
    }

    // Role assignment with secure admin invite secret
    let role = 'user';
    if (adminSecret && process.env.ADMIN_INVITE_SECRET) {
      if (adminSecret === process.env.ADMIN_INVITE_SECRET) {
        role = 'admin';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid Admin Invite Secret key provided.',
        });
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role,
    });

    sendTokenResponse(user, 201, res, 'Registration successful! Welcome to the platform.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email/username and password.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user by email or username, explicitly selecting password field
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your username/email and password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your username/email and password.',
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful! Welcome back.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * @desc    Get currently logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset user password (Forgot Password)
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { identifier, newPassword, confirmPassword } = req.body;

    if (!identifier || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email or username and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please verify your password.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address or username.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact an administrator.',
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  resetPassword,
};

