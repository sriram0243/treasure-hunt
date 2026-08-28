const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { requireAuth, requireTeamLeader } = require('../middleware/authMiddleware');

// Get capacity & settings
router.get('/capacity', gameController.getCapacityAndSettings);

// Team Registration
router.post('/register-team', gameController.registerTeam);

// Team Leader & Member Login
router.post('/login', gameController.loginUser);
router.post('/login-member', gameController.loginTeamMember);

// Live Team Progress (Requires Auth)
router.get('/team-progress', requireAuth, gameController.getTeamProgress);

// QR Scan & Stage Unlock (Strictly Requires Team Leader)
router.post('/scan', requireTeamLeader, gameController.scanToken);

// Anti-Cheat Progress Reset (When Leader leaves page / exits fullscreen)
router.post('/reset-progress', requireAuth, gameController.resetTeamProgress);

// Participant Feedback
router.post('/feedback', requireAuth, gameController.submitFeedback);

// Public Leaderboard
router.get('/leaderboard', gameController.getLeaderboard);

module.exports = router;

