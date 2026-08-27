const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const db = require('./config/db');
const { generateAllQRCodes } = require('./services/qrGenerator');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach socket io instance to app
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve QR code images static folder
const qrDir = path.join(__dirname, '..', 'qr-codes');
app.use('/qr-codes', express.static(qrDir));

// Serve Frontend dist build if present (for single-server production deployment)
const frontendBuildDir = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildDir));

// API Routes
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// SPA Fallback for production static frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/qr-codes')) {
    return next();
  }
  const indexPath = path.join(frontendBuildDir, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'College Treasure Hunt API Server is running!' });
  }
});

// Socket.IO Connection Event Listeners
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // Join Team Room
  socket.on('join_team', ({ team_id }) => {
    if (team_id) {
      const room = `team:${team_id}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    }
  });

  // Join Admin Room
  socket.on('join_admin', () => {
    socket.join('admin');
    console.log(`Socket ${socket.id} joined admin room`);
  });

  socket.on('disconnect', () => {
    console.log(`⚡ Socket disconnected: ${socket.id}`);
  });
});

// Boot server & auto-generate QR image files
if (!process.env.VERCEL) {
  server.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🏴‍☠️ TREASURE HUNT REAL-TIME SERVER RUNNING ON PORT ${PORT}`);
    console.log(`====================================================`);
    try {
      await generateAllQRCodes();
    } catch (err) {
      console.error('Failed auto QR generation on startup:', err);
    }
  });
} else {
  generateAllQRCodes().catch(err => console.error('Vercel startup QR init:', err));
}

module.exports = app;

