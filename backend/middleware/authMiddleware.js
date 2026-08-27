const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'treasure_hunt_secret_key_2026';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware requiring Admin role
const requireAdmin = (req, res, next) => {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'ADMIN') {
    return res.status(401).json({ success: false, error: 'Access denied. Admin authorization required.' });
  }
  req.admin = decoded;
  req.user = decoded;
  next();
};

// Middleware requiring authentication (any valid role)
const requireAuth = (req, res, next) => {
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Access denied. Please log in.' });
  }
  req.user = decoded;
  next();
};

// Middleware requiring Team Leader role
const requireTeamLeader = (req, res, next) => {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'TEAM_LEADER') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_MEMBER_SCAN',
      error: '403 FORBIDDEN: QR scanning and hunt control are reserved for Team Leaders only.'
    });
  }
  req.user = decoded;
  next();
};

module.exports = {
  JWT_SECRET,
  verifyToken,
  requireAdmin,
  requireAuth,
  requireTeamLeader
};

