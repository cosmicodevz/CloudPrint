// =====================================================================
// backend/src/routes/printjob.routes.js
// =====================================================================
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const PrintJob    = require('../models/PrintJob');
const Printer     = require('../models/Printer');
const User        = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const upload      = require('../middleware/upload.middleware');
const { protect, authorize, agentAuth } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

// ── POST /api/printjobs — Upload file & create job ──────────────────
router.post('/', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const { printerId, copies = 1, paperSize = 'A4', color = false, duplex = false, notes = '' } = req.body;

    // Validate printer exists
    let printer = null;
    if (printerId) {
      printer = await Printer.findById(printerId);
      if (!printer) throw new AppError('Printer not found', 404);
    } else {
      // Auto-select first online printer
      printer = await Printer.findOne({ status: 'online' });
    }

    const fileUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;

    const job = await PrintJob.create({
      userId:       req.user._id,
      printerId:    printer?._id,
      fileName:     req.file.filename,
      originalName: req.file.originalname,
      fileUrl,
      fileSize:     req.file.size,
      mimeType:     req.file.mimetype,
      copies:       Math.min(parseInt(copies), 100),
      paperSize,
      color:        color === 'true' || color === true,
      duplex:       duplex === 'true' || duplex === true,
      notes,
      shareToken:   uuidv4(),
    });

    // Increment user print count
    await User.findByIdAndUpdate(req.user._id, { $inc: { printCount: 1 } });

    await ActivityLog.create({
      userId: req.user._id,
      action: 'JOB_CREATED',
      details: { jobId: job._id, fileName: job.originalName, printer: printer?.name },
      ip: req.ip,
    });

    // Notify all connected clients and the printer agent
    const io = req.app.get('io');
    io.emit('job:created', { job, userId: req.user._id.toString() });
    if (printer) {
      io.to(`printer:${printer._id}`).emit('job:new', job);
    }

    const populated = await PrintJob.findById(job._id)
      .populate('userId', 'name email')
      .populate('printerId', 'name location status');

    res.status(201).json({ success: true, message: 'Print job created', job: populated });
  } catch (err) { next(err); }
});

// ── GET /api/printjobs — List jobs for current user ─────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (search) filter.originalName = { $regex: search, $options: 'i' };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await PrintJob.countDocuments(filter);
    const jobs  = await PrintJob.find(filter)
      .populate('printerId', 'name location status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, jobs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

// ── GET /api/printjobs/:id ───────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const job = await PrintJob.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('printerId', 'name location status');
    if (!job) throw new AppError('Job not found', 404);

    // Users can only see their own jobs; admins see all
    if (req.user.role !== 'admin' && job.userId._id.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

// ── PATCH /api/printjobs/:id/cancel ─────────────────────────────────
router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    const job = await PrintJob.findById(req.params.id);
    if (!job) throw new AppError('Job not found', 404);
    if (req.user.role !== 'admin' && job.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }
    if (!['pending'].includes(job.status)) {
      throw new AppError('Only pending jobs can be cancelled', 400);
    }
    job.status      = 'cancelled';
    job.cancelledAt = new Date();
    await job.save();

    req.app.get('io').emit('job:updated', { jobId: job._id, status: 'cancelled' });
    res.json({ success: true, message: 'Job cancelled', job });
  } catch (err) { next(err); }
});

// ── PATCH /api/printjobs/:id/retry ──────────────────────────────────
router.patch('/:id/retry', protect, async (req, res, next) => {
  try {
    const job = await PrintJob.findById(req.params.id);
    if (!job) throw new AppError('Job not found', 404);
    if (!['failed', 'cancelled'].includes(job.status)) {
      throw new AppError('Only failed or cancelled jobs can be retried', 400);
    }
    job.status   = 'pending';
    job.retries += 1;
    job.errorMsg = undefined;
    await job.save();

    req.app.get('io').emit('job:updated', { jobId: job._id, status: 'pending' });
    res.json({ success: true, message: 'Job queued for retry', job });
  } catch (err) { next(err); }
});

// ── PATCH /api/printjobs/:id/status — Used by print agent ───────────
router.patch('/:id/status', agentAuth, async (req, res, next) => {
  try {
    const { status, errorMsg } = req.body;
    const job = await PrintJob.findById(req.params.id);
    if (!job) throw new AppError('Job not found', 404);

    job.status = status;
    if (status === 'printing')   job.startedAt   = new Date();
    if (status === 'completed')  job.completedAt = new Date();
    if (status === 'failed')     job.errorMsg    = errorMsg || 'Print failed';
    if (status === 'completed' && job.printerId) {
      await Printer.findByIdAndUpdate(job.printerId, { $inc: { totalJobsProcessed: 1 } });
    }
    await job.save();

    // Broadcast to all clients
    global.io.emit('job:updated', { jobId: job._id, status, errorMsg });

    await ActivityLog.create({
      userId: job.userId,
      action: `JOB_${status.toUpperCase()}`,
      details: { jobId: job._id, status },
    });

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) { next(err); }
});

// ── GET /api/printjobs/queue/pending — Poll endpoint for agent ───────
router.get('/queue/pending', agentAuth, async (req, res, next) => {
  try {
    const { printerId } = req.query;
    const filter = { status: 'pending' };
    if (printerId) filter.printerId = printerId;

    const jobs = await PrintJob.find(filter)
      .sort({ createdAt: 1 })
      .limit(5)
      .populate('printerId', 'name');

    res.json({ success: true, jobs });
  } catch (err) { next(err); }
});

module.exports = router;
