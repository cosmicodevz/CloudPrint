// =====================================================================
// backend/src/models/ActivityLog.js — Activity Log Schema
// =====================================================================
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
    // e.g. 'USER_REGISTERED', 'FILE_UPLOADED', 'JOB_CREATED', 'JOB_COMPLETED'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  level: {
    type: String,
    enum: ['info', 'warn', 'error'],
    default: 'info',
  },
  ip: String,
}, {
  timestamps: true,
});

// Auto-expire old logs after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
