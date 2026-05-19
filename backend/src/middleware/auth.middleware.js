// =====================================================================
// backend/src/middleware/auth.middleware.js
// =====================================================================
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT access token and attach user to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Support Bearer token in header or httpOnly cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Role-based access control. Usage: authorize('admin')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user?.role}' is not authorized for this resource`,
    });
  }
  next();
};

/**
 * Verify the agent secret header for Python print agent connections
 */
const agentAuth = (req, res, next) => {
  const secret = req.headers['x-agent-secret'];
  if (!secret || secret !== process.env.AGENT_SECRET) {
    return res.status(401).json({ success: false, message: 'Invalid agent secret' });
  }
  next();
};

module.exports = { protect, authorize, agentAuth };
