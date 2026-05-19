// =====================================================================
// backend/src/routes/user.routes.js
// =====================================================================
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');
const upload  = require('../middleware/upload.middleware');

// All user routes require auth
router.use(protect);

// ── GET /api/users/profile ───────────────────────────────────────────
router.get('/profile', (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PATCH /api/users/profile ─────────────────────────────────────────
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const allowed = {};
    if (name)   allowed.name   = name.trim();
    if (avatar) allowed.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/change-password ─────────────────────────────────
router.patch('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Both passwords required', 400);
    if (newPassword.length < 6) throw new AppError('New password too short', 400);

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 401);
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed' });
  } catch (err) { next(err); }
});

// ── GET /api/users — Admin: list all users ───────────────────────────
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/:id/toggle — Admin: enable/disable user ─────────
router.patch('/:id/toggle', authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'enabled' : 'disabled'}`, user });
  } catch (err) { next(err); }
});

module.exports = router;
