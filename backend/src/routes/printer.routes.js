// =====================================================================
// backend/src/routes/printer.routes.js
// =====================================================================
const express  = require('express');
const router   = express.Router();
const Printer  = require('../models/Printer');
const PrintJob = require('../models/PrintJob');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize, agentAuth } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

// All printer routes require authentication
router.use(protect);

// ── GET /api/printers ────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const printers = await Printer.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    res.json({ success: true, printers });
  } catch (err) { next(err); }
});

// ── POST /api/printers — Any authenticated user ──────────────────────
// Admins get status 'offline'; regular users also get 'offline'
// (Agent sets status to 'online' via heartbeat)
router.post('/', async (req, res, next) => {
  try {
    const { name, location, ipAddress, model, capabilities } = req.body;
    if (!name) throw new AppError('Printer name required', 400);

    const printer = await Printer.create({
      name, location, ipAddress, model, capabilities,
      createdBy: req.user._id,
    });

    await ActivityLog.create({
      userId:  req.user._id,
      action:  'PRINTER_CREATED',
      details: { printerId: printer._id, name },
      ip:      req.ip,
    });

    req.app.get('io').emit('printer:created', printer);
    res.status(201).json({ success: true, message: 'Printer added', printer });
  } catch (err) { next(err); }
});

// ── GET /api/printers/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const printer = await Printer.findById(req.params.id).populate('createdBy', 'name email');
    if (!printer) throw new AppError('Printer not found', 404);

    const recentJobs = await PrintJob.find({ printerId: printer._id })
      .sort({ createdAt: -1 }).limit(10).populate('userId', 'name');

    res.json({ success: true, printer, recentJobs });
  } catch (err) { next(err); }
});

// ── PATCH /api/printers/:id — Owner or Admin ─────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const printer = await Printer.findById(req.params.id);
    if (!printer) throw new AppError('Printer not found', 404);

    const isOwner = printer.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorised to edit this printer', 403);
    }

    // Non-admins cannot change status manually (agent sets it)
    const allowed = isAdmin
      ? req.body
      : (({ name, location, ipAddress, model, capabilities }) =>
          ({ name, location, ipAddress, model, capabilities }))(req.body);

    const updated = await Printer.findByIdAndUpdate(
      req.params.id, allowed, { new: true, runValidators: true }
    );
    req.app.get('io').emit('printer:updated', updated);
    res.json({ success: true, message: 'Printer updated', printer: updated });
  } catch (err) { next(err); }
});

// ── DELETE /api/printers/:id — Owner or Admin ────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const printer = await Printer.findById(req.params.id);
    if (!printer) throw new AppError('Printer not found', 404);

    const isOwner = printer.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorised to delete this printer', 403);
    }

    await Printer.findByIdAndDelete(req.params.id);
    req.app.get('io').emit('printer:deleted', { printerId: req.params.id });
    res.json({ success: true, message: 'Printer deleted' });
  } catch (err) { next(err); }
});

// ── POST /api/printers/agent/heartbeat — Python agent pings status ───
router.post('/agent/heartbeat', agentAuth, async (req, res, next) => {
  try {
    const { agentId, status = 'online' } = req.body;
    if (!agentId) throw new AppError('agentId required', 400);

    const printer = await Printer.findOneAndUpdate(
      { agentId },
      { status, lastSeen: new Date() },
      { new: true }
    );
    if (!printer) return res.status(404).json({ success: false, message: 'No printer for this agentId' });

    global.io.emit('printer:status', { printerId: printer._id, status });
    res.json({ success: true, printer });
  } catch (err) { next(err); }
});

module.exports = router;
