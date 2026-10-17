const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendTokenResponse, clearTokenCookie } = require('../utils/tokenUtils');
const { sendPasswordResetEmail, sendVerificationOTPEmail } = require('../services/emailService');
const { validateEmail } = require('../utils/emailValidator');

/**
 * Generate a unique, sanitized username for OAuth accounts
 */
const generateUniqueUsername = async (base) => {
  let clean = (base || 'user').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
  if (clean.length < 3) clean = `user_${clean}`;
  if (clean.length > 20) clean = clean.substring(0, 20);

  let candidate = clean;
  let exists = await User.findOne({ username: candidate });
  while (exists) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${clean.substring(0, 24)}_${suffix}`;
    exists = await User.findOne({ username: candidate });
  }
  return candidate;
};

/**
 * @desc    Register a new user (creates pending unverified user, generates 6-digit OTP)
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

    const emailValidation = await validateEmail(cleanEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.reason || 'Please provide a valid email address.',
      });
    }
    const validatedEmail = emailValidation.cleanEmail;

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Role assignment with constant-time SHA-256 hashed secret comparison
    let role = 'user';
    if (adminSecret) {
      const configuredSecret = process.env.ADMIN_INVITE_SECRET;
      if (!configuredSecret) {
        return res.status(403).json({
          success: false,
          message: 'Admin registration is not configured on this server.',
        });
      }

      const hashA = crypto.createHash('sha256').update(String(adminSecret)).digest();
      const hashB = crypto.createHash('sha256').update(String(configuredSecret)).digest();

      if (crypto.timingSafeEqual(hashA, hashB)) {
        role = 'admin';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid Admin Invite Secret key provided.',
        });
      }
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email: validatedEmail }, { username: cleanUsername }],
    }).select('+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts +password');

    if (existingUser) {
      if (existingUser.email === validatedEmail) {
        if (existingUser.isEmailVerified) {
          return res.status(400).json({
            success: false,
            message: 'An account with this email address already exists.',
          });
        }

        // Account exists but is unverified: allow re-registration with fresh OTP
        if (existingUser.username !== cleanUsername) {
          const usernameTaken = await User.findOne({ username: cleanUsername });
          if (usernameTaken && usernameTaken._id.toString() !== existingUser._id.toString()) {
            return res.status(400).json({
              success: false,
              message: 'This username is already taken. Please choose another.',
            });
          }
          existingUser.username = cleanUsername;
        }

        existingUser.name = name.trim();
        existingUser.password = password; // pre-save hook will hash
        existingUser.role = role;
        const otp = existingUser.createEmailVerificationOTP();
        await existingUser.save();

        const sendResult = await sendVerificationOTPEmail({
          to: existingUser.email,
          name: existingUser.name,
          otp,
        });

        if (!sendResult.success) {
          console.warn(`[Auth] Verification OTP dispatch failed on re-registration: ${sendResult.error}`);
          return res.status(400).json({
            success: false,
            message: 'Unable to deliver verification code to this email address. Please check your address or try again later.',
          });
        }

        existingUser.emailDeliveryStatus = 'sent';
        existingUser.emailBounceReason = '';
        await existingUser.save();

        return res.status(201).json({
          success: true,
          message: 'A verification code has been dispatched to your email address. Please verify to activate your account.',
          pendingVerification: true,
          email: existingUser.email,
        });
      }

      if (existingUser.username === cleanUsername) {
        if (!existingUser.isEmailVerified && existingUser.emailDeliveryStatus === 'bounced') {
          // Clean up dead/bounced unverified account so the legitimate user can re-register with their intended username
          await User.findByIdAndDelete(existingUser._id);
        } else {
          return res.status(400).json({
            success: false,
            message: 'This username is already taken. Please choose another.',
          });
        }
      }
    }

    // Create user with isEmailVerified: false
    const user = new User({
      name: name.trim(),
      username: cleanUsername,
      email: validatedEmail,
      password,
      role,
      isEmailVerified: false,
      authProvider: 'local',
      tokenVersion: 0,
    });

    const otp = user.createEmailVerificationOTP();
    await user.save();

    const sendResult = await sendVerificationOTPEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    if (!sendResult.success) {
      console.warn(`[Auth] Failed to send verification OTP on registration for ${user.email}: ${sendResult.error}`);
      // Roll back unverified user record so database is not polluted with undeliverable accounts
      await User.findByIdAndDelete(user._id);

      return res.status(400).json({
        success: false,
        message: 'Unable to deliver verification code to this email address. Please check that your email address is correct and try again.',
      });
    }

    user.emailDeliveryStatus = 'sent';
    await user.save({ validateBeforeSave: false });

    return res.status(201).json({
      success: true,
      message: 'Registration initiated! A 6-digit verification code has been dispatched to your email.',
      pendingVerification: true,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify user email with 6-digit OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and the 6-digit verification code.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be a 6-digit number.',
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select(
      '+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts'
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please sign in with your credentials.',
      });
    }

    // Check if verification email previously bounced
    if (user.emailDeliveryStatus === 'bounced') {
      return res.status(400).json({
        success: false,
        message: `The verification email for this address could not be delivered (bounced). Reason: ${user.emailBounceReason || 'Recipient mailbox does not exist'}. Please register with a valid email address.`,
        bounced: true,
      });
    }

    // Check maximum attempts (max 5)
    if ((user.emailVerificationAttempts || 0) >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect verification attempts. Please request a new verification code.',
      });
    }

    // Check expiration
    if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check OTP hash
    const hashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    if (user.emailVerificationOTP !== hashedOtp) {
      user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });

      const remaining = Math.max(0, 5 - user.emailVerificationAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // Success: activate account and atomically consume OTP fields
    user.isEmailVerified = true;
    user.emailDeliveryStatus = 'delivered';
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in with your credentials.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification OTP
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const emailValidation = await validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.reason || 'Please provide a valid email address.',
      });
    }

    const cleanEmail = emailValidation.cleanEmail;
    const genericMessage =
      'If an unverified account exists with this email, a new verification code has been sent.';

    const user = await User.findOne({ email: cleanEmail }).select(
      '+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts'
    );

    if (!user || user.isEmailVerified || !user.isActive) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    // Invalidate old OTP and generate fresh one
    const otp = user.createEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    const sendResult = await sendVerificationOTPEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    if (!sendResult.success) {
      console.warn(`[Auth] Failed to resend verification OTP to ${user.email}: ${sendResult.error}`);
      return res.status(400).json({
        success: false,
        message: 'Unable to deliver verification code. Please check that your email address is correct.',
      });
    }

    user.emailDeliveryStatus = 'sent';
    user.emailBounceReason = '';
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate or register user with verified Google ID token
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required.',
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({
        success: false,
        message: 'Google Sign-In is not configured on this server.',
      });
    }

    let payload;
    try {
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed: Invalid or expired ID token.',
      });
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Failed to extract profile information from Google ID token.',
      });
    }

    // Verify audience
    if (payload.aud !== googleClientId) {
      return res.status(401).json({
        success: false,
        message: 'Google token audience mismatch.',
      });
    }

    // Verify issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token issuer.',
      });
    }

    // Must be verified email by Google
    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Your Google email address is not verified by Google.',
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || 'Google User';
    const picture = payload.picture || '';

    // Check if user exists by googleId
    let user = await User.findOne({ googleId });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact an administrator.',
        });
      }

      return sendTokenResponse(user, 200, res, 'Google sign-in successful! Welcome back.');
    }

    // Check if user exists by email
    const existingEmailUser = await User.findOne({ email });

    if (existingEmailUser) {
      // Existing local account with password: DO NOT auto-link (prevents account takeover)
      return res.status(409).json({
        success: false,
        message:
          'An account with this email already exists using password authentication. Please sign in with your email and password.',
      });
    }

    // Create new Google account
    const username = await generateUniqueUsername(email.split('@')[0]);

    user = await User.create({
      name,
      username,
      email,
      googleId,
      authProvider: 'google',
      isEmailVerified: true,
      profileImage: picture,
      tokenVersion: 0,
    });

    return sendTokenResponse(user, 201, res, 'Account created with Google! Welcome to Articulate.');
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

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account was registered via Google Sign-In. Please sign in using Google.',
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

    // Block unverified email
    if (!user.isEmailVerified) {
      if (user.emailDeliveryStatus === 'bounced') {
        return res.status(403).json({
          success: false,
          message: `The verification email for this account bounced (${user.emailBounceReason || 'mailbox does not exist'}). Please re-register with a working email address.`,
          pendingVerification: true,
          emailBounced: true,
          email: user.email,
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before signing in.',
        pendingVerification: true,
        email: user.email,
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful! Welcome back.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie symmetrically
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = (req, res) => {
  clearTokenCookie(res);

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
 * @desc    Change password for authenticated user (IDOR-safe with tokenVersion session invalidation)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your current password and a new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match. Please verify your new password.',
      });
    }

    // Fetch user strictly from authenticated session token (prevents IDOR)
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Please verify your password.',
      });
    }

    // Update password, increment tokenVersion (invalidating other active sessions), and record timestamp
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    // Set 1s in the past to ensure newly issued token iat is strictly >= passwordChangedAt
    user.passwordChangedAt = new Date(Date.now() - 1000);
    await user.save();

    // Re-issue fresh token for the current session with updated tokenVersion
    sendTokenResponse(user, 200, res, 'Password changed successfully!');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password recovery email with secure single-use token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const genericMessage =
      'If an account exists with that email address, a password recovery link has been sent.';

    const user = await User.findOne({ email: cleanEmail });

    // Always return generic response to prevent account enumeration
    if (!user || !user.isActive || !user.isEmailVerified || (user.authProvider === 'google' && !user.password)) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    // Invalidate older outstanding recovery tokens & generate fresh token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Construct secure recovery URL using configured frontend URL
    const clientUrl = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',')[0].trim().replace(/\/+$/, '')
      : 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    try {
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      if (!emailResult.success && !emailResult.skipped) {
        // Rollback token if email delivery explicitly failed
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
          success: false,
          message: 'Unable to send recovery email. Please try again later or contact support.',
        });
      }
    } catch (emailErr) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Unable to send recovery email. Please try again later or contact support.',
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using single-use crypto token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password recovery token is required.',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please verify your new password.',
      });
    }

    // Hash incoming token with SHA-256 to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Find user with valid matching unexpired token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password recovery link is invalid or has expired. Please request a new recovery link.',
      });
    }

    // Set new password (pre-save hook will hash with bcrypt)
    user.password = newPassword;

    // Single-use: Atomically consume and clear the reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Invalidate previous sessions across all devices
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = new Date(Date.now() - 1000);

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle incoming Resend delivery webhooks (e.g. email.bounced, email.delivered)
 * @route   POST /api/auth/webhook/resend
 * @access  Public (Signature-Verified)
 */
const handleResendWebhook = async (req, res, next) => {
  try {
    const svixId = req.headers['svix-id'];
    const svixTimestamp = req.headers['svix-timestamp'];
    const svixSignature = req.headers['svix-signature'];
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(401).json({
          success: false,
          message: 'Missing webhook signature headers.',
        });
      }

      // Check timestamp freshness (5 minutes tolerance to prevent replay attacks)
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(svixTimestamp, 10);
      if (isNaN(ts) || Math.abs(now - ts) > 300) {
        return res.status(401).json({
          success: false,
          message: 'Webhook signature timestamp expired or invalid.',
        });
      }

      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
      const secretKey = webhookSecret.startsWith('whsec_')
        ? Buffer.from(webhookSecret.slice(6), 'base64')
        : Buffer.from(webhookSecret, 'utf8');

      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(toSign)
        .digest('base64');

      const signatures = svixSignature.split(' ');
      const signatureMatched = signatures.some((sig) => {
        const parts = sig.split(',');
        if (parts.length === 2 && parts[0] === 'v1') {
          try {
            const sigBuf = Buffer.from(parts[1], 'base64');
            const expBuf = Buffer.from(expectedSignature, 'base64');
            return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
          } catch (e) {
            return false;
          }
        }
        return false;
      });

      if (!signatureMatched) {
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook signature.',
        });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        message: 'Resend webhook secret is not configured on this server.',
      });
    }

    const event = req.body;
    if (!event || !event.type) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload structure.' });
    }

    // Process Bounce Events
    if (event.type === 'email.bounced') {
      const recipients = Array.isArray(event.data?.to) ? event.data.to : [event.data?.to].filter(Boolean);
      for (const to of recipients) {
        const cleanEmail = String(to).trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail }).select(
          '+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts'
        );

        if (!user) continue;

        // CRITICAL INVARIANT: Never invalidate an account that is already verified
        if (user.isEmailVerified) {
          console.log(`[Resend Webhook] Ignoring bounce event for verified user ${cleanEmail}.`);
          continue;
        }

        // Flag unverified user as bounced and clear active OTP
        user.emailDeliveryStatus = 'bounced';
        user.emailBounceReason =
          event.data?.bounce?.message || 'Mailbox unavailable or domain rejected delivery.';
        user.emailVerificationOTP = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        console.log(`[Resend Webhook] Marked unverified account as bounced: ${cleanEmail} (${user.emailBounceReason})`);
      }
    } else if (event.type === 'email.delivered') {
      const recipients = Array.isArray(event.data?.to) ? event.data.to : [event.data?.to].filter(Boolean);
      for (const to of recipients) {
        const cleanEmail = String(to).trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });
        if (user && !user.isEmailVerified && user.emailDeliveryStatus !== 'bounced') {
          user.emailDeliveryStatus = 'delivered';
          await user.save({ validateBeforeSave: false });
        }
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationOTP,
  handleResendWebhook,
  googleSignIn,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};

