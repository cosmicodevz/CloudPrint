// =====================================================================
// backend/src/socket/handlers.js — Socket.io event handlers
// =====================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Printer = require('../models/Printer');

/**
 * Initialise all Socket.io event listeners
 * @param {import('socket.io').Server} io
 */
const initSocketHandlers = (io) => {

  // ── Middleware: authenticate socket connection ───────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      // Allow agent connections with secret
      const agentSecret = socket.handshake.auth?.agentSecret;
      if (agentSecret && agentSecret === process.env.AGENT_SECRET) {
        socket.isAgent = true;
        socket.agentId = socket.handshake.auth?.agentId;
        return next();
      }

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} | Agent: ${!!socket.isAgent} | User: ${socket.user?.email || 'N/A'}`);

    // ── User joins their personal room ──
    if (socket.user) {
      socket.join(`user:${socket.user._id}`);
      if (socket.user.role === 'admin') socket.join('admin');
    }

    // ── Agent: claim a printer room ──
    if (socket.isAgent && socket.agentId) {
      socket.on('agent:register', async ({ agentId }) => {
        const printer = await Printer.findOneAndUpdate(
          { agentId },
          { status: 'online', lastSeen: new Date() },
          { new: true }
        );
        if (printer) {
          socket.join(`printer:${printer._id}`);
          io.emit('printer:status', { printerId: printer._id, status: 'online' });
          console.log(`[Socket] Agent registered for printer: ${printer.name}`);
        }
      });

      // Agent disconnects → mark printer offline
      socket.on('disconnect', async () => {
        if (socket.agentId) {
          const printer = await Printer.findOneAndUpdate(
            { agentId: socket.agentId },
            { status: 'offline', lastSeen: new Date() },
            { new: true }
          );
          if (printer) {
            io.emit('printer:status', { printerId: printer._id, status: 'offline' });
            console.log(`[Socket] Agent disconnected — printer ${printer.name} set offline`);
          }
        }
      });
    }

    // ── Subscribe to specific printer updates ──
    socket.on('subscribe:printer', (printerId) => {
      socket.join(`printer:${printerId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  Im('[Socket.io] Handlers initialized');
};

module.exports = { initSocketHandlers };
