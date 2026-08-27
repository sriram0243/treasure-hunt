const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return 'N/A';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Admin Login
exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required.' });
  }

  db.get("SELECT * FROM users WHERE username = LOWER(?) AND role = 'ADMIN'", [username.trim()], (err, adminUser) => {
    if (err || !adminUser) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const isValid = bcrypt.compareSync(password, adminUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: { id: adminUser.id, username: adminUser.username, name: adminUser.name }
    });
  });
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

    // 1. App settings
    const settings = await getAsync("SELECT * FROM app_settings WHERE id = 1");
    if (settings) {
      stats.settings = settings;
      stats.max_total_participants = settings.max_total_participants || 150;
    }

    // 2. Hunt status & Winner
    const huntRow = await getAsync(
      "SELECT h.*, t.team_name as winner_name FROM hunt h LEFT JOIN teams t ON h.winner_team_id = t.id WHERE h.id = 1"
    );
    if (huntRow) {
      stats.hunt_status = huntRow.status;
      if (huntRow.winner_team_id) {
        stats.winner_team = {
          id: huntRow.winner_team_id,
          team_name: huntRow.winner_name,
          completed_at: huntRow.winner_completed_at
        };
      }
    }

    // 3. Total Participants Count (sum of member_count across teams)
    const partRow = await getAsync("SELECT COALESCE(SUM(member_count), 0) as total FROM teams");
    if (partRow) {
      stats.total_participants = partRow.total || 0;
    }
    stats.spots_remaining = Math.max(0, stats.max_total_participants - stats.total_participants);

    // 4. Scan stats
    const scanRow = await getAsync(
      "SELECT COUNT(*) as total, SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success FROM scan_attempts"
    );
    if (scanRow) {
      stats.total_scans = scanRow.total || 0;
      stats.successful_scans = scanRow.success || 0;
      stats.failed_scans = stats.total_scans - stats.successful_scans;
    }

    // 5. Scan logs
    try {
      const scanLogs = await allAsync(
        `SELECT sa.*, t.team_name, u.name as user_name, u.role
         FROM scan_attempts sa
         LEFT JOIN teams t ON sa.team_id = t.id
         LEFT JOIN users u ON sa.user_id = u.id
         ORDER BY sa.scanned_at DESC LIMIT 50`
      );
      stats.recent_scan_logs = scanLogs || [];
    } catch (e) {
      stats.recent_scan_logs = await allAsync("SELECT * FROM scan_attempts ORDER BY scanned_at DESC LIMIT 50").catch(() => []);
    }


    // 6. Feedback list
    const feedbackRows = await allAsync("SELECT * FROM feedback ORDER BY created_at DESC");
    stats.feedback_list = feedbackRows || [];

    // 7. Teams list with stage breakdown
    let rawTeams = [];
    try {
      rawTeams = await allAsync(
        `SELECT t.*, u.name as leader_name,
                COALESCE(t.member_count, 5) as member_count,
                (SELECT COUNT(*) FROM stage_completions sc WHERE sc.team_id = t.id) as completed_stages
         FROM teams t
         LEFT JOIN users u ON t.leader_user_id = u.id
         ORDER BY completed_stages DESC, t.created_at ASC`
      );
    } catch (e) {
      console.warn("Teams query fallback:", e.message);
      rawTeams = await allAsync("SELECT t.*, u.name as leader_name FROM teams t LEFT JOIN users u ON t.leader_user_id = u.id").catch(() => []);
    }

    stats.total_teams = (rawTeams || []).length;
    stats.completed_teams = (rawTeams || []).filter(t => (t.completed_stages || 0) >= 7).length;
    stats.active_teams = stats.total_teams - stats.completed_teams;

    const teamsDetailed = [];
    if (rawTeams && rawTeams.length > 0) {
      for (let idx = 0; idx < rawTeams.length; idx++) {
        const t = rawTeams[idx];
        let stageOrder = [];
        try {
          stageOrder = await allAsync(
            `SELECT tso.position, s.stage_number, s.title, s.mission_description
             FROM team_stage_order tso
             JOIN stages s ON tso.stage_id = s.id
             WHERE tso.team_id = ?
             ORDER BY tso.position ASC`,
            [t.id]
          );
        } catch (e) {
          stageOrder = [];
        }

        let completedStages = [];
        try {
          completedStages = await allAsync(
            `SELECT s.stage_number, sc.completed_at
             FROM stage_completions sc
             JOIN stages s ON sc.stage_id = s.id
             WHERE sc.team_id = ?
             ORDER BY sc.position ASC`,
            [t.id]
          );
        } catch (e) {
          completedStages = [];
        }

        teamsDetailed.push({
          rank: idx + 1,
          id: t.id,
          team_name: t.team_name,
          leader_name: t.leader_name || 'Leader',
          member_count: t.member_count || 5,
          status: (completedStages.length >= 7) ? 'COMPLETED' : t.status,
          completed_stages_count: completedStages.length || t.completed_stages || 0,
          started_at: t.started_at,
          completed_at: t.completed_at,
          stage_order: (stageOrder || []).map(so => so.stage_number),
          stage_order_details: stageOrder || [],
          completed_stages: completedStages || []
        });
      }
    }


    teamsDetailed.sort((a, b) => b.completed_stages_count - a.completed_stages_count);
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
    const team = await getAsync(
      "SELECT t.*, u.name as leader_name FROM teams t LEFT JOIN users u ON t.leader_user_id = u.id WHERE t.id = ?",
      [teamId]
    );

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const members = await allAsync(
      "SELECT u.id, u.name, u.role, u.created_at FROM users u WHERE u.team_id = ?",
      [teamId]
    );

    const stageOrder = await allAsync(
      `SELECT tso.position, s.stage_number, s.title, s.mission_description, s.clue_text
       FROM team_stage_order tso
       JOIN stages s ON tso.stage_id = s.id
       WHERE tso.team_id = ?
       ORDER BY tso.position ASC`,
      [teamId]
    );

    const completions = await allAsync(
      `SELECT sc.position, s.stage_number, s.title, sc.completed_at
       FROM stage_completions sc
       JOIN stages s ON sc.stage_id = s.id
       WHERE sc.team_id = ?
       ORDER BY sc.position ASC`,
      [teamId]
    );

    res.json({
      success: true,
      team: {
        ...team,
        members: members || [],
        stage_order: stageOrder || [],
        completions: completions || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch team details.' });
  }
};

// Admin Manual End Hunt Button
exports.endHuntManually = async (req, res) => {
  try {
    await runAsync("UPDATE hunt SET status = 'CLOSED', ended_at = CURRENT_TIMESTAMP WHERE id = 1");

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
    await runAsync("DELETE FROM team_members");
    await runAsync("DELETE FROM stage_completions");
    await runAsync("DELETE FROM team_stage_order");
    await runAsync("DELETE FROM scan_attempts");
    await runAsync("DELETE FROM feedback");
    await runAsync("DELETE FROM users WHERE role != 'ADMIN'");
    await runAsync("DELETE FROM teams");
    await runAsync("UPDATE hunt SET status = 'LIVE', winner_team_id = NULL, winner_completed_at = NULL, ended_at = NULL WHERE id = 1");

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
    const { min_team_members, default_team_members, max_team_members, max_total_participants } = req.body;

    await runAsync(
      `UPDATE app_settings 
       SET min_team_members = ?, default_team_members = ?, max_team_members = ?, max_total_participants = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [min_team_members || 4, default_team_members || 5, max_team_members || 10, max_total_participants || 150]
    );

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};

// Admin Update Team Member Count by Team Name / ID
exports.updateTeamMemberCount = async (req, res) => {
  try {
    const { team_id, team_name, member_count } = req.body;
    const count = parseInt(member_count);

    if (isNaN(count) || count < 1) {
      return res.status(400).json({ success: false, error: 'Member count must be a positive integer.' });
    }

    await runAsync(
      "UPDATE teams SET member_count = ? WHERE id = ? OR LOWER(team_name) = LOWER(?)",
      [count, team_id || 0, (team_name || '').trim()]
    );

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('team_count_updated', {
        team_id,
        team_name,
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
    const rows = await allAsync(
      `SELECT q.*, s.stage_number, s.title, s.mission_description 
       FROM qr_codes q 
       JOIN stages s ON q.stage_id = s.id 
       ORDER BY s.stage_number ASC`
    );

    const qrs = (rows || []).map(r => {
      const stagePad = r.stage_number.toString().padStart(2, '0');
      const token = r.secure_token || r.token || `TH_STAGE${r.stage_number}_MARK`;
      return {
        id: r.id,
        stage_number: r.stage_number,
        title: r.title,
        mission: r.mission_description,
        token: token,
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
    const stages = await allAsync("SELECT * FROM stages ORDER BY stage_number ASC");
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
    const { title, mission_description, clue_text } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Stage heading/title is required.' });
    }
    if (!mission_description || !mission_description.trim()) {
      return res.status(400).json({ success: false, error: 'Stage question/mission description is required.' });
    }

    await runAsync(
      `UPDATE stages 
       SET title = ?, mission_description = ?, clue_text = ? 
       WHERE id = ? OR stage_number = ?`,
      [title.trim(), mission_description.trim(), (clue_text || '').trim(), stageId, stageId]
    );

    const updatedStage = await getAsync("SELECT * FROM stages WHERE id = ? OR stage_number = ?", [stageId, stageId]);

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



