const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Public admin login
router.post('/login', adminController.login);

// Protected admin endpoints
router.get('/dashboard', requireAdmin, adminController.getDashboardStats);
router.get('/team/:id', requireAdmin, adminController.getTeamDetails);
router.post('/end-hunt', requireAdmin, adminController.endHuntManually);
router.post('/reset-hunt', requireAdmin, adminController.resetAllHuntData);
router.post('/settings', requireAdmin, adminController.updateSettings);

router.post('/team/update-member-count', requireAdmin, adminController.updateTeamMemberCount);
router.get('/qr-codes', requireAdmin, adminController.getQRCodes);

router.get('/stages', requireAdmin, adminController.getStages);
router.put('/stages/:id', requireAdmin, adminController.updateStage);

// Stage 7 Quiz Questions Management (Admin)
router.get('/questions', requireAdmin, adminController.getAllQuestions);
router.post('/questions', requireAdmin, adminController.addQuestion);
router.post('/questions/reset', requireAdmin, adminController.resetQuestions);
router.put('/questions/:id', requireAdmin, adminController.updateQuestion);
router.delete('/questions/:id', requireAdmin, adminController.deleteQuestion);

module.exports = router;


