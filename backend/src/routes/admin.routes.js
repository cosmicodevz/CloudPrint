// =====================================================================
// backend/src/routes/admin.routes.js — Analytics & admin operations
// =====================================================================
const express      = require('express');
const router       = express.Router();
const mongoose     = require('mongoose');
const os           = require('os');
const User         = require('../models/User');
const Printer      = require('../models/Printer');
const PrintJob     = require('../models/PrintJob');
const ActivityLog  = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth.middleware');

// All admin routes require admin role
router.use(protect, authorize('admin'));

// ── GET /api/admin/dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalUsers, totalPrinters, totalJobs, activeJobs] = await Promise.all([
      User.countDocuments(),
      Printer.countDocuments(),
      PrintJob.countDocuments(),
      PrintJob.countDocuments({ status: { $in: ['pending', 'printing'] } }),
    ]);

    // Jobs by status
    const jobsByStatus = await PrintJob.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Jobs over last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const jobsOverTime = await PrintJob.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Online printers
    const onlinePrinters = await Printer.countDocuments({ status: 'online' });

    res.json({
      success: true,
      stats: { totalUsers, totalPrinters, totalJobs, activeJobs, onlinePrinters },
      jobsByStatus,
      jobsOverTime,
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/server-status ─────────────────────────────────────
router.get('/server-status', (req, res) => {
  const uptime    = process.uptime();
  const memUsage  = process.memoryUsage();
  const cpuInfo   = os.cpus();
  const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
  const totMemMB  = Math.round(os.totalmem() / 1024 / 1024);

  res.json({
    success: true,
    server: {
      uptime:      Math.floor(uptime),
      nodeVersion: process.version,
      platform:    os.platform(),
      hostname:    os.hostname(),
      cpuModel:    cpuInfo[0]?.model,
      cpuCores:    cpuInfo.length,
      memUsedMB:   Math.round(memUsage.heapUsed / 1024 / 1024),
      memTotalMB:  Math.round(memUsage.heapTotal / 1024 / 1024),
      freeMemMB,
      totMemMB,
      mongoState:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  });
});

// ── GET /api/admin/activity-logs ─────────────────────────────────────
router.get('/activity-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const filter = {};
    if (level) filter.level = level;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(filter);
    const logs  = await ActivityLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

// ── GET /api/admin/all-jobs ───────────────────────────────────────────
router.get('/all-jobs', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await PrintJob.countDocuments(filter);
    const jobs  = await PrintJob.find(filter)
      .populate('userId',    'name email')
      .populate('printerId', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, jobs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

module.exports = router;
