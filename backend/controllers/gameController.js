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

// Helper: Shuffle array [1,2,3,4,5,6] and append 7
function generateShuffledStageOrder() {
  const stages = [1, 2, 3, 4, 5, 6];
  for (let i = stages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stages[i], stages[j]] = [stages[j], stages[i]];
  }
  const sequence = [...stages, 7];
  return sequence.map((stageNum, posIdx) => ({
    position: posIdx + 1,
    stage_number: stageNum
  }));
}

// Get Capacity & Settings
exports.getCapacityAndSettings = async (req, res) => {
  try {
    const settings = (await AppSettings.findOne()) || {
      min_team_members: 4,
      default_team_members: 5,
      max_team_members: 10,
      max_total_participants: 150
    };

    const agg = await Team.aggregate([
      { $group: { _id: null, total: { $sum: '$member_count' } } }
    ]);
    const currentCount = agg.length > 0 ? agg[0].total : 0;
    const maxCapacity = settings.max_total_participants || 150;
    const spotsRemaining = Math.max(0, maxCapacity - currentCount);

    res.json({
      success: true,
      capacity: {
        current_total_members: currentCount,
        max_total_participants: maxCapacity,
        spots_remaining: spotsRemaining,
        is_full: currentCount >= maxCapacity
      },
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

// Register Team (Leader Name + Team Name)
exports.registerTeam = async (req, res) => {
  try {
    const { team_name, leader_name } = req.body || {};

    if (!team_name || !team_name.trim()) {
      return res.status(400).json({ success: false, error: 'Team name is required.' });
    }
    if (!leader_name || !leader_name.trim()) {
      return res.status(400).json({ success: false, error: 'Team Leader name is required.' });
    }

    const cleanTeamName = team_name.trim();
    const cleanLeaderName = leader_name.trim();

    const settings = (await AppSettings.findOne()) || { default_team_members: 5, max_total_participants: 150 };
    const defaultCount = settings.default_team_members || 5;
    const maxParticipants = settings.max_total_participants || 150;

    const agg = await Team.aggregate([
      { $group: { _id: null, total: { $sum: '$member_count' } } }
    ]);
    const currentTotal = agg.length > 0 ? agg[0].total : 0;

    if (currentTotal + defaultCount > maxParticipants) {
      return res.status(400).json({
        success: false,
        code: 'CAPACITY_REACHED',
        error: 'The Treasure Hunt has reached the maximum participant capacity.'
      });
    }

    const existingTeam = await Team.findOne({
      team_name: { $regex: new RegExp(`^${cleanTeamName}$`, 'i') }
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_TEAM_NAME',
        error: 'This team name is already taken. Please choose another name.'
      });
    }

    const stageOrder = generateShuffledStageOrder();

    const newTeam = await Team.create({
      team_name: cleanTeamName,
      member_count: defaultCount,
      status: 'ACTIVE',
      stage_order: stageOrder,
      completed_stages: []
    });

    const defaultPassHash = bcrypt.hashSync(`leader_${newTeam._id}`, 10);
    const leaderUser = await User.create({
      name: cleanLeaderName,
      password_hash: defaultPassHash,
      role: 'TEAM_LEADER',
      team_id: newTeam._id
    });

    newTeam.leader_user_id = leaderUser._id;
    await newTeam.save();

    const token = jwt.sign(
      {
        id: leaderUser._id,
        name: cleanLeaderName,
        role: 'TEAM_LEADER',
        team_id: newTeam._id,
        team_name: cleanTeamName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('team_registered', {
        team_id: newTeam._id,
        team_name: cleanTeamName,
        total_members: defaultCount
      });
    }

    return res.json({
      success: true,
      token,
      user: {
        id: leaderUser._id,
        name: cleanLeaderName,
        role: 'TEAM_LEADER',
        team_id: newTeam._id,
        team_name: cleanTeamName
      },
      message: 'Team registered successfully!'
    });
  } catch (err) {
    console.error('Register team error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to register team.' });
  }
};

// Login Endpoint (Leader Login by Team Name & Leader Name)
exports.loginUser = async (req, res) => {
  try {
    const { team_name, leader_name, identifier } = req.body || {};
    const cleanTeam = (team_name || identifier || '').trim();
    const cleanLeader = (leader_name || '').trim();

    if (!cleanTeam) {
      return res.status(400).json({ success: false, error: 'Please enter your registered Team Name.' });
    }
    if (!cleanLeader) {
      return res.status(400).json({ success: false, error: 'Please enter Team Leader Name.' });
    }

    const team = await Team.findOne({
      team_name: { $regex: new RegExp(`^${cleanTeam}$`, 'i') }
    });

    if (!team) {
      return res.status(401).json({ success: false, error: 'Team Name or Team Leader Name is incorrect.' });
    }

    const user = await User.findOne({
      team_id: team._id,
      name: { $regex: new RegExp(`^${cleanLeader}$`, 'i') },
      role: 'TEAM_LEADER'
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Team Name or Team Leader Name is incorrect.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        role: user.role,
        team_id: team._id,
        team_name: team.team_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        team_id: team._id,
        team_name: team.team_name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
};

// Quick Team Member Join / Direct Login
exports.loginTeamMember = async (req, res) => {
  try {
    const { team_name, member_name } = req.body || {};

    if (!team_name || !team_name.trim()) {
      return res.status(400).json({ success: false, error: 'Team name is required.' });
    }

    const cleanTeam = team_name.trim();
    const cleanMember = member_name ? member_name.trim() : 'Team Member';

    const team = await Team.findOne({
      team_name: { $regex: new RegExp(`^${cleanTeam}$`, 'i') }
    });

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found. Please check team name.' });
    }

    let memberUser = await User.findOne({
      team_id: team._id,
      role: 'TEAM_MEMBER',
      name: { $regex: new RegExp(`^${cleanMember}$`, 'i') }
    });

    if (!memberUser) {
      const passHash = bcrypt.hashSync('member123', 10);
      memberUser = await User.create({
        name: cleanMember,
        password_hash: passHash,
        role: 'TEAM_MEMBER',
        team_id: team._id
      });
    }

    const token = jwt.sign(
      {
        id: memberUser._id,
        name: memberUser.name,
        role: 'TEAM_MEMBER',
        team_id: team._id,
        team_name: team.team_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: memberUser._id,
        name: memberUser.name,
        role: 'TEAM_MEMBER',
        team_id: team._id,
        team_name: team.team_name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to login team member.' });
  }
};

// Get Live Team Progress & Hint
exports.getTeamProgress = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.team_id) {
      return res.status(400).json({ success: false, error: 'Missing team authorization.' });
    }

    const teamId = user.team_id;
    const huntState = (await Hunt.findOne()) || { status: 'LIVE' };
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team record not found.' });
    }

    const stagesList = await Stage.find().sort({ stage_number: 1 });
    const stageMap = {};
    stagesList.forEach(s => { stageMap[s.stage_number] = s; });

    const completedSet = new Set((team.completed_stages || []).map(c => c.stage_number));
    const completedCount = completedSet.size;

    const currentPosition = Math.min(7, completedCount + 1);
    const isFullyCompleted = completedCount >= 7;

    const sequence = (team.stage_order || []).map((stg) => {
      const stageData = stageMap[stg.stage_number] || {};
      let status = 'LOCKED';
      if (completedSet.has(stg.stage_number)) {
        status = 'COMPLETED';
      } else if (stg.position === currentPosition && !isFullyCompleted) {
        status = 'CURRENT';
      }
      return {
        position: stg.position,
        stage_number: stg.stage_number,
        title: stageData.title || `Stage ${stg.stage_number}`,
        status
      };
    });

    const currentStageObj = (team.stage_order || []).find(s => s.position === currentPosition) || (team.stage_order || [])[6] || { stage_number: 7 };
    const currentStageData = stageMap[currentStageObj.stage_number] || {};

    const memberRows = await User.find({ team_id: teamId }).select('_id name role');

    let winnerInfo = null;
    if (huntState.winner_team_id) {
      const winnerTeam = await Team.findById(huntState.winner_team_id);
      if (winnerTeam) {
        winnerInfo = { team_name: winnerTeam.team_name, completed_at: winnerTeam.completed_at };
      }
    }

    res.json({
      success: true,
      role: user.role,
      team: {
        id: team._id,
        team_name: team.team_name,
        status: isFullyCompleted ? 'COMPLETED' : team.status,
        stage7_quiz_passed: team.stage7_quiz_passed || false,
        stage7_wrong_attempts: team.stage7_wrong_attempts || 0,
        started_at: team.started_at,
        completed_at: team.completed_at
      },
      current_position: currentPosition,
      completed_stages_count: completedCount,
      total_stages: 7,
      is_completed: isFullyCompleted,
      stage_sequence: sequence,
      current_hint: {
        stage_number: currentStageData.stage_number || currentStageObj.stage_number,
        title: currentStageData.title || 'Checkpoint',
        mission_description: currentStageData.mission_description || '',
        clue_text: currentStageData.clue_text || ''
      },
      members: memberRows || [],
      hunt: {
        status: huntState.status,
        winner_team_id: huntState.winner_team_id,
        winner_name: winnerInfo ? winnerInfo.team_name : huntState.winner_team_name || null,
        winner_completed_at: huntState.winner_completed_at
      }
    });
  } catch (err) {
    console.error('Error fetching team progress:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch team progress.' });
  }
};

// QR Token Scan Logic
exports.scanToken = async (req, res) => {
  try {
    const user = req.user;
    const { qr_token } = req.body || {};

    if (!user || user.role !== 'TEAM_LEADER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_MEMBER_SCAN',
        error: '403 FORBIDDEN: QR scanning is restricted to Team Leaders only.'
      });
    }

    if (!qr_token || !qr_token.trim()) {
      return res.status(400).json({ success: false, error: 'QR token is required.' });
    }

    const cleanToken = qr_token.trim();
    const teamId = user.team_id;

    const huntState = (await Hunt.findOne()) || { status: 'LIVE' };
    if (huntState.status !== 'LIVE') {
      return res.status(400).json({
        success: false,
        code: 'HUNT_CLOSED',
        title: '🏆 TREASURE HUNT COMPLETE',
        message: 'The Treasure Hunt has concluded! No further QR scans are accepted.'
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const completedCount = (team.completed_stages || []).length;
    if (completedCount >= 7) {
      return res.json({
        success: true,
        code: 'TEAM_ALREADY_COMPLETED',
        title: '🏆 TREASURE UNLOCKED!',
        message: 'Your team has already completed all 7 stages!',
        is_final: true
      });
    }

    const currentPosition = completedCount + 1;
    const requiredStageObj = (team.stage_order || []).find(s => s.position === currentPosition);
    if (!requiredStageObj) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve team objective.' });
    }

    const allStages = await Stage.find();
    if (!allStages || allStages.length === 0) {
      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: false,
        message: 'UNKNOWN_MARK'
      });

      return res.json({
        success: false,
        code: 'UNKNOWN_MARK',
        title: 'UNKNOWN MARK',
        message: 'This symbol does not belong to this college treasure hunt.'
      });
    }

    // Match QR token strategy
    const stageMatch = allStages.find(s => {
      const secToken = (s.qr_token || '').trim();
      const stgNum = s.stage_number.toString();

      if (secToken && cleanToken === secToken) return true;
      if (secToken && cleanToken.toLowerCase() === secToken.toLowerCase()) return true;
      if (secToken && (cleanToken.includes(secToken) || secToken.includes(cleanToken))) return true;
      if (cleanToken.toLowerCase().includes(`stage${stgNum}`) || cleanToken.toLowerCase().includes(`stage-0${stgNum}`) || cleanToken.toLowerCase().includes(`stage_0${stgNum}`)) return true;

      return false;
    });

    if (!stageMatch) {
      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: false,
        message: 'UNKNOWN_MARK'
      });

      return res.json({
        success: false,
        code: 'UNKNOWN_MARK',
        title: 'UNKNOWN MARK',
        message: 'This symbol does not belong to this college treasure hunt.'
      });
    }

    const requiredStage = allStages.find(s => s.stage_number === requiredStageObj.stage_number);

    // CHECK WRONG MARK
    if (stageMatch.stage_number !== requiredStageObj.stage_number) {
      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: false,
        stage_number: stageMatch.stage_number,
        message: 'WRONG_MARK'
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${team._id}`).emit('wrong_qr_scan', {
          team_name: team.team_name,
          scanned_stage: stageMatch.stage_number,
          required_stage: requiredStageObj.stage_number
        });
      }

      return res.json({
        success: false,
        code: 'WRONG_MARK',
        title: '⚠ WRONG MARK',
        message: `Your team's next destination lies elsewhere. You scanned ${stageMatch.title || 'a different location'}, but your next objective is ${requiredStage ? requiredStage.title : 'your current target'}.`,
        scanned_stage: stageMatch.stage_number,
        required_stage: requiredStageObj.stage_number
      });
    }    // STRICT STAGE 7 QUIZ CHECK: All teams MUST solve and pass the Stage 7 Quiz before scanning Stage 7 QR Code!
    if ((requiredStageObj.stage_number === 7 || stageMatch.stage_number === 7) && !team.stage7_quiz_passed) {
      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: false,
        stage_number: 7,
        message: 'STAGE7_QUIZ_LOCKED'
      });

      return res.status(400).json({
        success: false,
        code: 'STAGE7_QUIZ_LOCKED',
        title: '🔒 STAGE 7 QUIZ LOCKED',
        message: 'Your team MUST solve and pass the Stage 7 Challenge Question before you can scan the Stage 7 QR Code!'
      });
    }

    // CORRECT QR SCAN! Record stage completion
    team.completed_stages.push({
      position: currentPosition,
      stage_number: stageMatch.stage_number,
      qr_token: cleanToken,
      completed_at: new Date()
    });

    const isFinalStage = currentPosition >= 7;

    if (isFinalStage) {
      team.status = 'COMPLETED';
      team.completed_at = new Date();
      await team.save();

      // Atomic winner update
      const winnerHunt = await Hunt.findOneAndUpdate(
        { winner_team_id: null },
        {
          winner_team_id: team._id,
          winner_team_name: team.team_name,
          winner_completed_at: new Date(),
          status: 'CLOSED'
        },
        { new: true }
      );

      const isWinner = winnerHunt && String(winnerHunt.winner_team_id) === String(team._id);

      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: true,
        stage_number: stageMatch.stage_number,
        message: isWinner ? 'WINNER_DECLARED' : 'FINAL_STAGE_COMPLETED'
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${team._id}`).emit('stage_completed', {
          team_name: team.team_name,
          position: 7,
          is_final: true,
          is_winner: isWinner
        });

        io.emit('hunt_winner_declared', {
          winner_team_id: team._id,
          winner_team_name: team.team_name,
          completed_at: new Date().toISOString()
        });

        io.emit('hunt_closed', {
          winner_team_name: team.team_name
        });
      }

      return res.json({
        success: true,
        code: 'FINAL_TREASURE_UNLOCKED',
        title: isWinner ? '🏆 YOU FOUND THE TREASURE!' : '🏆 TREASURE HUNT COMPLETE',
        message: isWinner
          ? '🎉 CONGRATULATIONS! Your team was the FIRST to discover the treasure!'
          : 'Your team completed all 7 stages! Excellent work!',
        is_winner: isWinner,
        is_final: true,
        stage_number: stageMatch.stage_number,
        stage_title: stageMatch.title
      });
    } else {
      await team.save();

      const nextPosition = currentPosition + 1;
      const nextStageObj = (team.stage_order || []).find(s => s.position === nextPosition);
      const nextStageData = nextStageObj ? allStages.find(s => s.stage_number === nextStageObj.stage_number) : null;

      await ScanAttempt.create({
        team_id: team._id,
        user_id: user.id,
        team_name: team.team_name,
        user_name: user.name,
        role: user.role,
        scanned_token: cleanToken,
        is_success: true,
        stage_number: stageMatch.stage_number,
        message: `STAGE_${currentPosition}_COMPLETED`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`team:${team._id}`).emit('stage_completed', {
          team_name: team.team_name,
          position: currentPosition,
          next_position: nextPosition,
          is_final: false
        });

        io.to('admin').emit('team_progress_updated', {
          team_id: team._id,
          team_name: team.team_name,
          completed_stages: currentPosition
        });
      }

      return res.json({
        success: true,
        code: 'STAGE_UNLOCKED',
        title: '✓ MARK UNLOCKED!',
        message: 'Mark verified! Your next location hint has been unlocked below.',
        is_final: false,
        stage_number: stageMatch.stage_number,
        next_stage: nextStageData ? {
          stage_number: nextStageData.stage_number,
          title: nextStageData.title,
          mission_description: nextStageData.mission_description
        } : null
      });
    }
  } catch (err) {
    console.error('Scan token error:', err);
    res.status(500).json({ success: false, error: err.message || 'QR code scan processing failed.' });
  }
};

const db = require('../config/db');

// GET Stage 7 Quiz Question (1 randomized question assigned per team from pool)
exports.getStage7Quiz = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.team_id) {
      return res.status(400).json({ success: false, error: 'Missing team authorization.' });
    }

    const team = await Team.findById(user.team_id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    let allQuestions = await db.syncDefaultQuestions();
    if (!allQuestions || allQuestions.length === 0) {
      await Question.deleteMany({});
      allQuestions = await Question.insertMany(db.DEFAULT_QUESTIONS);
    }

    let assignedQuestion = null;
    if (team.stage7_question_id) {
      assignedQuestion = allQuestions.find(q => String(q._id) === String(team.stage7_question_id));
    }

    // If no question assigned yet or assigned question was deleted, pick a random shuffled question from pool
    if (!assignedQuestion && allQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      assignedQuestion = allQuestions[randomIndex];
      team.stage7_question_id = assignedQuestion._id;
      await team.save();
    }

    if (!assignedQuestion && allQuestions.length > 0) {
      assignedQuestion = allQuestions[0];
    }

    if (!assignedQuestion) {
      return res.status(500).json({ success: false, error: 'No Stage 7 quiz questions available.' });
    }

    res.json({
      success: true,
      question: {
        id: assignedQuestion._id,
        question_text: assignedQuestion.question_text,
        options: assignedQuestion.options
      },
      total_pool_questions: allQuestions.length,
      quiz_passed: team.stage7_quiz_passed || false,
      wrong_attempts: team.stage7_wrong_attempts || 0,
      max_wrong_attempts: 2,
      team_status: team.status
    });
  } catch (err) {
    console.error('Get Stage 7 Quiz error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch Stage 7 Quiz question.' });
  }
};

// Global Leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const teams = await Team.find();

    const leaderboard = (teams || []).map((t) => {
      const completedCount = (t.completed_stages || []).length;
      let durationSeconds = 0;
      if (t.completed_at && t.started_at) {
        durationSeconds = Math.max(0, Math.floor((new Date(t.completed_at) - new Date(t.started_at)) / 1000));
      }
      return {
        id: t._id,
        team_name: t.team_name,
        completed_stages: completedCount,
        is_completed: completedCount >= 7,
        started_at: t.started_at,
        completed_at: t.completed_at,
        duration_seconds: durationSeconds,
        duration_formatted: durationSeconds ? formatDuration(durationSeconds) : null
      };
    });

    leaderboard.sort((a, b) => {
      if (b.completed_stages !== a.completed_stages) {
        return b.completed_stages - a.completed_stages;
      }
      if (a.completed_at && b.completed_at) {
        return new Date(a.completed_at) - new Date(b.completed_at);
      }
      return 0;
    });

    const ranked = leaderboard.map((t, idx) => ({ ...t, rank: idx + 1 }));

    res.json({
      success: true,
      count: ranked.length,
      leaderboard: ranked
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch leaderboard.' });
  }
};

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Participant Feedback
exports.submitFeedback = async (req, res) => {
  try {
    const user = req.user;
    const { rating, emoji, comment, participant_name, team_name } = req.body || {};

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Please provide a star rating between 1 and 5.' });
    }

    const pName = participant_name || (user ? user.name : 'Anonymous Hunter');
    const tName = team_name || (user ? user.team_name : '');

    await Feedback.create({
      team_id: user ? user.team_id : null,
      user_id: user ? user.id : null,
      rating,
      emoji: emoji || '⭐',
      comment: comment ? comment.trim() : '',
      participant_name: pName,
      team_name: tName
    });

    res.json({
      success: true,
      message: 'Your adventure feedback has been recorded. Thank you!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to record feedback.' });
  }
};

// Reset Team Progress (Anti-cheat restriction trigger when leader leaves page/exits fullscreen)
exports.resetTeamProgress = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.team_id) {
      return res.status(400).json({ success: false, error: 'Missing team authorization.' });
    }

    const team = await Team.findById(user.team_id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team record not found.' });
    }

    // Reset progress to stage 1
    team.completed_stages = [];
    team.status = 'ACTIVE';
    team.completed_at = null;
    await team.save();

    await ScanAttempt.create({
      team_id: team._id,
      user_id: user.id,
      team_name: team.team_name,
      user_name: user.name,
      role: user.role,
      scanned_token: 'ANTI_CHEAT_RESET',
      is_success: false,
      message: 'LEADER_LEFT_PAGE_PROGRESS_RESET'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`team:${team._id}`).emit('team_progress_reset', {
        team_id: team._id,
        team_name: team.team_name,
        reason: 'Leader left page, switched tabs, or exited fullscreen mode.'
      });
      io.to('admin').emit('team_progress_updated', {
        team_id: team._id,
        team_name: team.team_name,
        completed_stages: 0
      });
    }

    res.json({
      success: true,
      message: 'Team progress has been reset back to Stage 1 due to anti-cheat violation.',
      current_position: 1
    });
  } catch (err) {
    console.error('Reset team progress error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to reset team progress.' });
  }
};

const db = require('../config/db');

// GET Stage 7 Quiz Question (1 randomized question assigned per team from pool)
exports.getStage7Quiz = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.team_id) {
      return res.status(400).json({ success: false, error: 'Missing team authorization.' });
    }

    const team = await Team.findById(user.team_id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const allQuestions = await db.syncDefaultQuestions();
    if (!allQuestions || allQuestions.length === 0) {
      return res.status(400).json({ success: false, error: 'No Stage 7 quiz questions configured.' });
    }

    let assignedQuestion = null;
    if (team.stage7_question_id) {
      assignedQuestion = allQuestions.find(q => q._id.toString() === team.stage7_question_id.toString());
    }

    // If no question assigned yet or assigned question was deleted, pick a random shuffled question from pool
    if (!assignedQuestion) {
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      assignedQuestion = allQuestions[randomIndex];
      team.stage7_question_id = assignedQuestion._id;
      await team.save();
    }

    res.json({
      success: true,
      question: {
        id: assignedQuestion._id,
        question_text: assignedQuestion.question_text,
        options: assignedQuestion.options
      },
      total_pool_questions: allQuestions.length,
      quiz_passed: team.stage7_quiz_passed || false,
      wrong_attempts: team.stage7_wrong_attempts || 0,
      max_wrong_attempts: 2,
      team_status: team.status
    });
  } catch (err) {
    console.error('Get Stage 7 Quiz error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch Stage 7 Quiz question.' });
  }
};

// SUBMIT Stage 7 Single Assigned Question Answer
exports.submitStage7Quiz = async (req, res) => {
  try {
    const user = req.user;
    const { selected_option_index, answer } = req.body || {};
    const chosenIndex = selected_option_index !== undefined ? parseInt(selected_option_index) : parseInt(answer);

    if (!user || !user.team_id) {
      return res.status(400).json({ success: false, error: 'Missing team authorization.' });
    }

    const team = await Team.findById(user.team_id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    if (team.status === 'DISQUALIFIED') {
      return res.status(403).json({
        success: false,
        disqualified: true,
        error: '❌ TEAM DISQUALIFIED: Your team has been disqualified from the hunt.'
      });
    }

    if (team.stage7_quiz_passed) {
      return res.json({
        success: true,
        quiz_passed: true,
        message: 'Your team has already passed the Stage 7 Quiz!'
      });
    }

    if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex > 3) {
      return res.status(400).json({
        success: false,
        error: 'Please select one of the 4 options before submitting.'
      });
    }

    if (!team.stage7_question_id) {
      return res.status(400).json({ success: false, error: 'No question assigned for this team.' });
    }

    const question = await Question.findById(team.stage7_question_id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Assigned question not found.' });
    }

    const isCorrect = chosenIndex === question.correct_option_index;
    const io = req.app.get('io');

    if (isCorrect) {
      team.stage7_quiz_passed = true;
      await team.save();

      if (io) {
        io.to(`team:${team._id}`).emit('stage7_quiz_passed', {
          team_id: team._id,
          team_name: team.team_name,
          message: '🎉 STAGE 7 QUIZ PASSED! Stage 7 QR Code Scanner is now unlocked!'
        });
      }

      return res.json({
        success: true,
        quiz_passed: true,
        message: '🎉 CONGRATULATIONS! Correct answer! Stage 7 QR Code Scanner is now UNLOCKED.'
      });
    } else {
      team.stage7_wrong_attempts = (team.stage7_wrong_attempts || 0) + 1;

      if (team.stage7_wrong_attempts >= 2) {
        team.status = 'DISQUALIFIED';
        await team.save();

        if (io) {
          io.to(`team:${team._id}`).emit('team_disqualified', {
            team_id: team._id,
            team_name: team.team_name,
            reason: 'Exceeded maximum 2 allowed wrong attempts on Stage 7 Question.'
          });

          io.to('admin').emit('team_disqualified_admin', {
            team_id: team._id,
            team_name: team.team_name
          });
        }

        return res.json({
          success: false,
          disqualified: true,
          wrong_attempts: team.stage7_wrong_attempts,
          message: '❌ TEAM DISQUALIFIED: You answered incorrectly on your 2nd attempt.'
        });
      } else {
        await team.save();

        if (io) {
          io.to(`team:${team._id}`).emit('stage7_quiz_wrong_attempt', {
            team_id: team._id,
            wrong_attempts: team.stage7_wrong_attempts,
            remaining_attempts: 1
          });
        }

        return res.json({
          success: false,
          disqualified: false,
          wrong_attempts: team.stage7_wrong_attempts,
          remaining_attempts: 1,
          message: '⚠️ INCORRECT ANSWER! You have 1 attempt remaining before team disqualification.'
        });
      }
    }
  } catch (err) {
    console.error('Submit Stage 7 Quiz error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to submit Stage 7 Quiz.' });
  }
};

