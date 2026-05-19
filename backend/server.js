// =====================================================================
// backend/server.js — Main entry point
// =====================================================================
const dotenv = require('dotenv'); 
dotenv.config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

// Route imports
const authRoutes     = require('./src/routes/auth.routes');
const userRoutes     = require('./src/routes/user.routes');
const printerRoutes  = require('./src/routes/printer.routes');
const printJobRoutes = require('./src/routes/printjob.routes');
const adminRoutes    = require('./src/routes/admin.routes');

// Socket handlers
const { initSocketHandlers } = require('./src/socket/handlers');

// Error middleware
const { errorHandler } = require('./src/middleware/error.middleware');

const app    = express();
const server = http.createServer(app);

// ──────────────────────────────────────────────────────────────────────
// Socket.io setup
// ──────────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: 'http://192.168.1.4:5173' || process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible globally across routes/services
app.set('io', io);
global.io = io;

// ──────────────────────────────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://cloud-print-ten.vercel.app",
      ]
    : [
        "http://localhost:5173",
        "http://192.168.1.4:5173",
      ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/printers',  printerRoutes);
app.use('/api/printjobs', printJobRoutes);
app.use('/api/admin',     adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Global error handler
app.use(errorHandler);

// ──────────────────────────────────────────────────────────────────────
// Socket.io Handlers
// ──────────────────────────────────────────────────────────────────────
initSocketHandlers(io);

// ──────────────────────────────────────────────────────────────────────
// MongoDB Connection
// ──────────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
