// =====================================================================
// backend/src/models/PrintJob.js — Print Job Schema
// =====================================================================
const mongoose = require('mongoose');

const printJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  printerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Printer',
    index: true,
  },

  // File metadata
  fileName:     { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl:      { type: String, required: true },
  fileSize:     { type: Number, default: 0 },  // bytes
  mimeType:     { type: String, default: 'application/pdf' },

  // Print settings
  copies:    { type: Number, default: 1, min: 1, max: 100 },
  paperSize: { type: String, enum: ['A4','A3','Letter','Legal','A5'], default: 'A4' },
  color:     { type: Boolean, default: false },
  duplex:    { type: Boolean, default: false },
  notes:     { type: String, maxlength: 500 },

  // Status
  status: {
    type: String,
    enum: ['pending', 'printing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  retries:    { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  errorMsg:   { type: String },

  // Timestamps
  startedAt:   Date,
  completedAt: Date,
  cancelledAt: Date,

  // QR share token
  shareToken: { type: String, unique: true, sparse: true },
}, {
  timestamps: true,
});

// ── Index for queue polling ──
printJobSchema.index({ status: 1, createdAt: 1 });

// ── Virtual: duration in seconds ──
printJobSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000);
  }
  return null;
});

module.exports = mongoose.model('PrintJob', printJobSchema);
