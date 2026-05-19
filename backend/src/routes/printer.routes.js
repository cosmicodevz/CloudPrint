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
    const printers = await Printer.find().sort({ createdAt: -1 });
    res.json({ success: true, printers });
  } catch (err) { next(err); }
});

// ── POST /api/printers — Admin only ─────────────────────────────────
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, location, ipAddress, model, capabilities } = req.body;
    if (!name) throw new AppError('Printer name required', 400);

    const printer = await Printer.create({ name, location, ipAddress, model, capabilities });
    await ActivityLog.create({ userId: req.user._id, action: 'PRINTER_CREATED',
      details: { printerId: printer._id, name }, ip: req.ip });

    req.app.get('io').emit('printer:created', printer);
    res.status(201).json({ success: true, message: 'Printer created', printer });
  } catch (err) { next(err); }
});

// ── GET /api/printers/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const printer = await Printer.findById(req.params.id);
    if (!printer) throw new AppError('Printer not found', 404);

    // Recent jobs for this printer
    const recentJobs = await PrintJob.find({ printerId: printer._id })
      .sort({ createdAt: -1 }).limit(10).populate('userId', 'name');

    res.json({ success: true, printer, recentJobs });
  } catch (err) { next(err); }
});

// ── PATCH /api/printers/:id — Admin only ─────────────────────────────
router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const printer = await Printer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!printer) throw new AppError('Printer not found', 404);
    req.app.get('io').emit('printer:updated', printer);
    res.json({ success: true, message: 'Printer updated', printer });
  } catch (err) { next(err); }
});

// ── DELETE /api/printers/:id — Admin only ────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const printer = await Printer.findByIdAndDelete(req.params.id);
    if (!printer) throw new AppError('Printer not found', 404);
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
