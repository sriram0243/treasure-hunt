const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const Team = require('../models/Team');
const User = require('../models/User');
const Stage = require('../models/Stage');
const Hunt = require('../models/Hunt');
const AppSettings = require('../models/AppSettings');
const ScanAttempt = require('../models/ScanAttempt');
const Feedback = require('../models/Feedback');
const Question = require('../models/Question');

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return 'N/A';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Admin Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required.' });
    }

    const adminUser = await User.findOne({
      username: username.trim().toLowerCase(),
      role: 'ADMIN'
    });

    if (!adminUser) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const isValid = bcrypt.compareSync(password, adminUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: { id: adminUser._id, username: adminUser.username, name: adminUser.name }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Admin login error.' });
  }
};

// Admin Dashboard Stats & Real-Time Monitoring
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {
      total_teams: 0,
      active_teams: 0,
      completed_teams: 0,
      total_participants: 0,
      max_total_participants: 150,
      spots_remaining: 150,
      hunt_status: 'LIVE',
      winner_team: null,
      total_scans: 0,
      successful_scans: 0,
      failed_scans: 0,
      leaderboard: [],
      teams_list: [],
      recent_scan_logs: [],
      feedback_list: [],
      settings: {}
    };

    // 1. App Settings
    const settings = await AppSettings.findOne();
    if (settings) {
      stats.settings = settings;
      stats.max_total_participants = settings.max_total_participants || 150;
    }

    // 2. Hunt status & Winner
    const huntRow = await Hunt.findOne();
    if (huntRow) {
      stats.hunt_status = huntRow.status;
      if (huntRow.winner_team_id) {
        const winTeam = await Team.findById(huntRow.winner_team_id);
        stats.winner_team = {
          id: huntRow.winner_team_id,
          team_name: winTeam ? winTeam.team_name : huntRow.winner_team_name,
          completed_at: huntRow.winner_completed_at
        };
      }
    }

    // 3. Total Participants Count
    const partAgg = await Team.aggregate([
      { $group: { _id: null, total: { $sum: '$member_count' } } }
    ]);
    stats.total_participants = partAgg.length > 0 ? partAgg[0].total : 0;
    stats.spots_remaining = Math.max(0, stats.max_total_participants - stats.total_participants);

    // 4. Scan stats
    const totalScans = await ScanAttempt.countDocuments();
    const successScans = await ScanAttempt.countDocuments({ is_success: true });
    stats.total_scans = totalScans;
    stats.successful_scans = successScans;
    stats.failed_scans = totalScans - successScans;

    // 5. Recent Scan logs
    const scanLogs = await ScanAttempt.find().sort({ scanned_at: -1 }).limit(50);
    stats.recent_scan_logs = scanLogs.map(s => ({
      id: s._id,
      team_id: s.team_id,
      user_id: s.user_id,
      team_name: s.team_name || 'N/A',
      user_name: s.user_name || 'N/A',
      role: s.role || 'N/A',
      scanned_token: s.scanned_token,
      is_success: s.is_success ? 1 : 0,
      stage_number: s.stage_number,
      message: s.message,
      scanned_at: s.scanned_at
    }));

    // 6. Feedback list
    const feedbackRows = await Feedback.find().sort({ created_at: -1 });
    stats.feedback_list = feedbackRows || [];

    // 7. Teams list with stage breakdown
    const rawTeams = await Team.find().populate('leader_user_id', 'name');
    const stagesList = await Stage.find().sort({ stage_number: 1 });
    const stageMap = {};
    stagesList.forEach(s => { stageMap[s.stage_number] = s; });

    stats.total_teams = rawTeams.length;
    stats.completed_teams = rawTeams.filter(t => (t.completed_stages || []).length >= 7).length;
    stats.active_teams = stats.total_teams - stats.completed_teams;

    const teamsDetailed = rawTeams.map((t, idx) => {
      const leaderName = t.leader_user_id ? t.leader_user_id.name : 'Leader';
      const completedCount = (t.completed_stages || []).length;

      const stageOrderDetails = (t.stage_order || []).map(so => {
        const stgData = stageMap[so.stage_number] || {};
        return {
          position: so.position,
          stage_number: so.stage_number,
          title: stgData.title || `Stage ${so.stage_number}`,
          mission_description: stgData.mission_description || ''
        };
      });

      const completedStagesDetails = (t.completed_stages || []).map(cs => {
        const stgData = stageMap[cs.stage_number] || {};
        return {
          position: cs.position,
          stage_number: cs.stage_number,
          title: stgData.title || `Stage ${cs.stage_number}`,
          completed_at: cs.completed_at
        };
      });

      return {
        rank: idx + 1,
        id: t._id,
        team_name: t.team_name,
        leader_name: leaderName,
        member_count: t.member_count || 5,
        status: completedCount >= 7 ? 'COMPLETED' : t.status,
        completed_stages_count: completedCount,
        started_at: t.started_at,
        completed_at: t.completed_at,
        stage_order: (t.stage_order || []).map(so => so.stage_number),
        stage_order_details: stageOrderDetails,
        completed_stages: completedStagesDetails
      };
    });

    teamsDetailed.sort((a, b) => b.completed_stages_count - a.completed_stages_count);
    teamsDetailed.forEach((t, idx) => { t.rank = idx + 1; });

    stats.teams_list = teamsDetailed;
    stats.leaderboard = teamsDetailed;

    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard stats.' });
  }
};

// Get Team Detail for Modal
exports.getTeamDetails = async (req, res) => {
  try {
    const teamId = req.params.id;
    const team = await Team.findById(teamId).populate('leader_user_id', 'name');

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const members = await User.find({ team_id: teamId }).select('_id name role created_at');
    const stagesList = await Stage.find();
    const stageMap = {};
    stagesList.forEach(s => { stageMap[s.stage_number] = s; });

    const stageOrder = (team.stage_order || []).map(so => {
      const stg = stageMap[so.stage_number] || {};
      return {
        position: so.position,
        stage_number: so.stage_number,
        title: stg.title || `Stage ${so.stage_number}`,
        mission_description: stg.mission_description || '',
        clue_text: stg.clue_text || ''
      };
    });

    const completions = (team.completed_stages || []).map(cs => {
      const stg = stageMap[cs.stage_number] || {};
      return {
        position: cs.position,
        stage_number: cs.stage_number,
        title: stg.title || `Stage ${cs.stage_number}`,
        completed_at: cs.completed_at
      };
    });

    res.json({
      success: true,
      team: {
        id: team._id,
        team_name: team.team_name,
        leader_name: team.leader_user_id ? team.leader_user_id.name : 'Leader',
        status: team.status,
        member_count: team.member_count,
        started_at: team.started_at,
        completed_at: team.completed_at,
        members: members || [],
        stage_order: stageOrder || [],
        completions: completions || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch team details.' });
  }
};

// Admin Manual End Hunt Button
exports.endHuntManually = async (req, res) => {
  try {
    await Hunt.findOneAndUpdate({}, { status: 'CLOSED', ended_at: new Date() }, { upsert: true });

    const io = req.app.get('io');
    if (io) {
      io.emit('hunt_closed', {
        message: 'The Treasure Hunt has been closed by the event administrator. Thank you for participating!'
      });
    }

    res.json({
      success: true,
      message: 'The Treasure Hunt has been closed for all participants.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update hunt state.' });
  }
};

// Admin Reset All Hunt & Team Data (Start Fresh)
exports.resetAllHuntData = async (req, res) => {
  try {
    await User.deleteMany({ role: { $ne: 'ADMIN' } });
    await Team.deleteMany({});
    await ScanAttempt.deleteMany({});
    await Feedback.deleteMany({});
    await Hunt.findOneAndUpdate(
      {},
      { status: 'LIVE', winner_team_id: null, winner_team_name: null, winner_completed_at: null, ended_at: null },
      { upsert: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('hunt_reset', {
        message: 'The Treasure Hunt has been reset by the event administrator. All team data cleared!'
      });
    }

    res.json({
      success: true,
      message: 'All team and game data erased successfully! Ready to start a new hunt.'
    });
  } catch (err) {
    console.error('Reset hunt error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset hunt data.' });
  }
};

// Update App Settings
exports.updateSettings = async (req, res) => {
  try {
    const { min_team_members, default_team_members, max_team_members, max_total_participants } = req.body || {};

    await AppSettings.findOneAndUpdate(
      {},
      {
        min_team_members: min_team_members || 4,
        default_team_members: default_team_members || 5,
        max_team_members: max_team_members || 10,
        max_total_participants: max_total_participants || 150,
        updated_at: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};

// Admin Update Team Member Count by Team Name / ID
exports.updateTeamMemberCount = async (req, res) => {
  try {
    const { team_id, team_name, member_count } = req.body || {};
    const count = parseInt(member_count);

    if (isNaN(count) || count < 1) {
      return res.status(400).json({ success: false, error: 'Member count must be a positive integer.' });
    }

    let team;
    if (team_id) {
      team = await Team.findByIdAndUpdate(team_id, { member_count: count }, { new: true });
    } else if (team_name) {
      team = await Team.findOneAndUpdate(
        { team_name: { $regex: new RegExp(`^${team_name.trim()}$`, 'i') } },
        { member_count: count },
        { new: true }
      );
    }

    const io = req.app.get('io');
    if (io && team) {
      io.to('admin').emit('team_count_updated', {
        team_id: team._id,
        team_name: team.team_name,
        member_count: count
      });
    }

    res.json({
      success: true,
      message: `Updated member count to ${count}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update team member count.' });
  }
};

// Get QR Codes List
exports.getQRCodes = async (req, res) => {
  try {
    const stages = await Stage.find().sort({ stage_number: 1 });

    const qrs = stages.map(s => {
      const stagePad = s.stage_number.toString().padStart(2, '0');
      return {
        id: s._id,
        stage_number: s.stage_number,
        title: s.title,
        mission: s.mission_description,
        token: s.qr_token,
        png_filename: `qr-stage-${stagePad}.png`,
        svg_filename: `qr-stage-${stagePad}.svg`,
        png_url: `/qr-codes/qr-stage-${stagePad}.png`,
        svg_url: `/qr-codes/qr-stage-${stagePad}.svg`
      };
    });

    res.json({ success: true, qr_codes: qrs });
  } catch (err) {
    console.error("getQRCodes error:", err);
    res.status(500).json({ success: false, error: err.message || 'Database error' });
  }
};

// Get All 7 Stages for Admin Editing
exports.getStages = async (req, res) => {
  try {
    const stages = await Stage.find().sort({ stage_number: 1 });
    res.json({ success: true, stages: stages || [] });
  } catch (err) {
    console.error("getStages error:", err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch stages.' });
  }
};

// Update Stage Title (Heading), Mission Description (Question/Riddle), and Clue Text
exports.updateStage = async (req, res) => {
  try {
    const stageId = req.params.id;
    const { title, mission_description, clue_text } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Stage heading/title is required.' });
    }
    if (!mission_description || !mission_description.trim()) {
      return res.status(400).json({ success: false, error: 'Stage question/mission description is required.' });
    }

    let updatedStage;
    if (stageId.match(/^[0-9a-fA-F]{24}$/)) {
      updatedStage = await Stage.findByIdAndUpdate(
        stageId,
        { title: title.trim(), mission_description: mission_description.trim(), clue_text: (clue_text || '').trim() },
        { new: true }
      );
    } else {
      updatedStage = await Stage.findOneAndUpdate(
        { stage_number: parseInt(stageId) },
        { title: title.trim(), mission_description: mission_description.trim(), clue_text: (clue_text || '').trim() },
        { new: true }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('stage_updated', {
        stage: updatedStage
      });
    }

    res.json({
      success: true,
      message: `Stage ${updatedStage ? updatedStage.stage_number : stageId} updated successfully.`,
      stage: updatedStage
    });
  } catch (err) {
    console.error("updateStage error:", err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update stage.' });
  }
};

const db = require('../config/db');

// GET All Quiz Questions (Admin)
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await db.syncDefaultQuestions();
    res.json({ success: true, questions: questions || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch questions.' });
  }
};

// RESET All Quiz Questions to 10 Default AI Riddles (Admin)
exports.resetQuestions = async (req, res) => {
  try {
    await Question.deleteMany({});
    const questions = await Question.insertMany(db.DEFAULT_QUESTIONS);
    res.json({ success: true, message: 'Successfully reset all Stage 7 quiz questions to default 10 AI riddles.', questions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset questions.' });
  }
};

// ADD New Quiz Question (Admin)
exports.addQuestion = async (req, res) => {
  try {
    const { question_text, options, correct_option_index } = req.body || {};

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required.' });
    }
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ success: false, error: 'Exactly 4 options are required.' });
    }
    if (correct_option_index === undefined || correct_option_index < 0 || correct_option_index > 3) {
      return res.status(400).json({ success: false, error: 'Correct option index must be 0, 1, 2, or 3.' });
    }

    const newQ = await Question.create({
      question_text: question_text.trim(),
      options: options.map(o => o.trim()),
      correct_option_index: parseInt(correct_option_index)
    });

    res.json({ success: true, message: 'Question added successfully.', question: newQ });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add question.' });
  }
};

// UPDATE Quiz Question (Admin)
exports.updateQuestion = async (req, res) => {
  try {
    const qId = req.params.id;
    const { question_text, options, correct_option_index } = req.body || {};

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required.' });
    }
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ success: false, error: 'Exactly 4 options are required.' });
    }

    const updated = await Question.findByIdAndUpdate(
      qId,
      {
        question_text: question_text.trim(),
        options: options.map(o => o.trim()),
        correct_option_index: parseInt(correct_option_index)
      },
      { new: true }
    );

    res.json({ success: true, message: 'Question updated successfully.', question: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update question.' });
  }
};

// DELETE Quiz Question (Admin)
exports.deleteQuestion = async (req, res) => {
  try {
    const qId = req.params.id;
    await Question.findByIdAndDelete(qId);
    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete question.' });
  }
};
