// =====================================================================
// backend/src/routes/auth.routes.js
// =====================================================================
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const User     = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

/** Helper: sign a JWT */
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});

/** Helper: attach httpOnly cookie + return token */
const sendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id);
  const cookieOptions = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
  };
  res.cookie('accessToken', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      _id:      user._id,
      name:     user.name,
      email:    user.email,
      role:     user.role,
      avatar:   user.avatar,
      initials: user.initials,
    },
  });
};

// ── POST /api/auth/register ──────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new AppError('All fields required', 400);
    if (password.length < 6) throw new AppError('Password must be ≥ 6 characters', 400);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('Email already registered', 409);

    const user = await User.create({ name, email: email.toLowerCase(), password });

    await ActivityLog.create({ userId: user._id, action: 'USER_REGISTERED',
      details: { email: user.email }, ip: req.ip });

    sendToken(user, 201, res, 'Account created successfully');
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ─────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password required', 400);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) throw new AppError('Account is disabled', 403);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await ActivityLog.create({ userId: user._id, action: 'USER_LOGIN',
      details: { email: user.email }, ip: req.ip });

    sendToken(user, 200, res, 'Login successful');
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ────────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  res.clearCookie('accessToken');
  res.json({ success: true, message: 'Logged out' });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── POST /api/auth/forgot-password ──────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    // Always respond OK to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // In production: send email with reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    console.log('[DEV] Password reset URL:', resetUrl);

    res.json({ success: true, message: 'If that email exists, a reset link was sent',
      ...(process.env.NODE_ENV === 'development' && { resetUrl }) });
  } catch (err) { next(err); }
});

// ── POST /api/auth/reset-password ───────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Token and new password required', 400);
    if (password.length < 6) throw new AppError('Password must be ≥ 6 characters', 400);

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Token invalid or expired', 400);

    user.password             = password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
