// =====================================================================
// backend/src/models/Printer.js — Printer Schema
// =====================================================================
const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Printer name required'],
    trim: true,
  },
  location: {
    type: String,
    default: 'Office',
    trim: true,
  },
  ipAddress: {
    type: String,
    default: '',
  },
  model: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'error'],
    default: 'offline',
  },
  // ID that the Python agent sends on connection to claim this printer
  agentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  agentSecret: {
    type: String,
    select: false,
  },
  capabilities: {
    colorPrint:  { type: Boolean, default: false },
    doubleSided: { type: Boolean, default: false },
    paperSizes:  { type: [String], default: ['A4', 'Letter', 'Legal'] },
    maxDPI:      { type: Number, default: 600 },
  },
  totalJobsProcessed: { type: Number, default: 0 },
  lastSeen:           Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model('Printer', printerSchema);
