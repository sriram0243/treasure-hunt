const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Helper: Shuffle array [1,2,3,4,5,6] and append 7
function generateShuffledStageOrder() {
  const stages = [1, 2, 3, 4, 5, 6];
  for (let i = stages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stages[i], stages[j]] = [stages[j], stages[i]];
  }
  return [...stages, 7];
}

// Get Capacity & Settings
exports.getCapacityAndSettings = (req, res) => {
  db.serialize(() => {
    db.get("SELECT * FROM app_settings WHERE id = 1", [], (err, settings) => {
      const appSettings = settings || {
        min_team_members: 4,
        default_team_members: 5,
        max_team_members: 10,
        max_total_participants: 150
      };

      db.get(
        "SELECT COALESCE(SUM(member_count), 0) AS total FROM teams",
        [],
        (err, row) => {
          const currentCount = row ? row.total : 0;
          const maxCapacity = appSettings.max_total_participants || 150;
          const spotsRemaining = Math.max(0, maxCapacity - currentCount);

          res.json({
            success: true,
            capacity: {
              current_total_members: currentCount,
              max_total_participants: maxCapacity,
              spots_remaining: spotsRemaining,
              is_full: currentCount >= maxCapacity
            },
            settings: appSettings
          });
        }
      );
    });
  });
};

// Register Team (Leader Name + Team Name)
exports.registerTeam = (req, res) => {
  const { team_name, leader_name } = req.body;

  if (!team_name || !team_name.trim()) {
    return res.status(400).json({ success: false, error: 'Team name is required.' });
  }
  if (!leader_name || !leader_name.trim()) {
    return res.status(400).json({ success: false, error: 'Team Leader name is required.' });
  }

  const cleanTeamName = team_name.trim();
  const cleanLeaderName = leader_name.trim();

  db.serialize(() => {
    db.get("SELECT * FROM app_settings WHERE id = 1", [], (err, settings) => {
      const defaultCount = settings ? settings.default_team_members : 5;
      const maxParticipants = settings ? settings.max_total_participants : 150;

      db.get("SELECT COALESCE(SUM(member_count), 0) AS total FROM teams", [], (err, row) => {
        const currentTotal = row ? row.total : 0;
        if (currentTotal + defaultCount > maxParticipants) {
          return res.status(400).json({
            success: false,
            code: 'CAPACITY_REACHED',
            error: 'The Treasure Hunt has reached the maximum participant capacity.'
          });
        }

        db.get("SELECT id FROM teams WHERE LOWER(team_name) = LOWER(?)", [cleanTeamName], (err, existingTeam) => {
          if (existingTeam) {
            return res.status(400).json({
              success: false,
              code: 'DUPLICATE_TEAM_NAME',
              error: 'This team name is already taken. Please choose another name.'
            });
          }

          db.run(
            "INSERT INTO teams (team_name, member_count, status) VALUES (?, ?, 'ACTIVE')",
            [cleanTeamName, defaultCount],
            function (err) {
              if (err) {
                return res.status(400).json({
                  success: false,
                  code: 'DUPLICATE_TEAM_NAME',
                  error: 'This team name is already taken. Please choose another name.'
                });
              }

              const teamId = this.lastID;
              const defaultPassHash = bcrypt.hashSync(`leader_${teamId}`, 10);

              db.run(
                "INSERT INTO users (name, password_hash, role, team_id) VALUES (?, ?, 'TEAM_LEADER', ?)",
                [cleanLeaderName, defaultPassHash, teamId],
                function (err) {
                  if (err) {
                    return res.status(500).json({ success: false, error: 'Failed to create team leader user.' });
                  }

                  const leaderUserId = this.lastID;
                  db.run("UPDATE teams SET leader_user_id = ? WHERE id = ?", [leaderUserId, teamId]);
                  db.run("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'TEAM_LEADER')", [teamId, leaderUserId]);

                  // Generate randomized 7-stage order for this team
                  db.all("SELECT id, stage_number FROM stages ORDER BY stage_number ASC", [], (err, allStages) => {
                    if (err || !allStages || allStages.length < 7) {
                      return res.status(500).json({ success: false, error: 'Stages missing in system.' });
                    }

                    const stageMap = {};
                    allStages.forEach(s => { stageMap[s.stage_number] = s.id; });
                    const shuffledSequence = generateShuffledStageOrder();

                    shuffledSequence.forEach((stageNum, posIdx) => {
                      const stageId = stageMap[stageNum];
                      db.run(
                        "INSERT INTO team_stage_order (team_id, position, stage_id) VALUES (?, ?, ?)",
                        [teamId, posIdx + 1, stageId]
                      );
                    });

                    const token = jwt.sign(
                      {
                        id: leaderUserId,
                        name: cleanLeaderName,
                        role: 'TEAM_LEADER',
                        team_id: teamId,
                        team_name: cleanTeamName
                      },
                      JWT_SECRET,
                      { expiresIn: '24h' }
                    );

                    const io = req.app.get('io');
                    if (io) {
                      io.to('admin').emit('team_registered', {
                        team_id: teamId,
                        team_name: cleanTeamName,
                        total_members: defaultCount
                      });
                    }

                    return res.json({
                      success: true,
                      token,
                      user: {
                        id: leaderUserId,
                        name: cleanLeaderName,
                        role: 'TEAM_LEADER',
                        team_id: teamId,
                        team_name: cleanTeamName
                      },
                      message: 'Team registered successfully!'
                    });
                  });
                }
              );
            }
          );
        });
      });
    });
  });
};


// Login Endpoint (Leader Login by Team Name & Leader Name)
exports.loginUser = (req, res) => {
  const { team_name, leader_name, identifier } = req.body;
  const cleanTeam = (team_name || identifier || '').trim();
  const cleanLeader = (leader_name || '').trim();

  if (!cleanTeam) {
    return res.status(400).json({ success: false, error: 'Please enter your registered Team Name.' });
  }
  if (!cleanLeader) {
    return res.status(400).json({ success: false, error: 'Please enter Team Leader Name.' });
  }

  // Search users by Leader of team_name AND leader_name
  db.get(
    `SELECT u.*, t.team_name, t.status as team_status
     FROM users u
     JOIN teams t ON u.team_id = t.id
     WHERE LOWER(t.team_name) = LOWER(?) AND LOWER(u.name) = LOWER(?) AND u.role = 'TEAM_LEADER'`,
    [cleanTeam, cleanLeader],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ success: false, error: 'Team Name or Team Leader Name is incorrect.' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          role: user.role,
          team_id: user.team_id,
          team_name: user.team_name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          team_id: user.team_id,
          team_name: user.team_name
        }
      });
    }
  );
};



// Quick Team Member Join / Direct Login
exports.loginTeamMember = (req, res) => {
  const { team_name, member_name } = req.body;

  if (!team_name || !team_name.trim()) {
    return res.status(400).json({ success: false, error: 'Team name is required.' });
  }

  const cleanTeam = team_name.trim();
  const cleanMember = member_name ? member_name.trim() : 'Team Member';

  db.get("SELECT * FROM teams WHERE LOWER(team_name) = LOWER(?)", [cleanTeam], (err, team) => {
    if (err || !team) {
      return res.status(404).json({ success: false, error: 'Team not found. Please check team name.' });
    }

    // Find or create member user
    db.get(
      "SELECT * FROM users WHERE team_id = ? AND role = 'TEAM_MEMBER' AND LOWER(name) = LOWER(?)",
      [team.id, cleanMember],
      (err, memberUser) => {
        let userObj = memberUser;

        const generateToken = (usr) => {
          const token = jwt.sign(
            {
              id: usr.id,
              name: usr.name,
              role: 'TEAM_MEMBER',
              team_id: team.id,
              team_name: team.team_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.json({
            success: true,
            token,
            user: {
              id: usr.id,
              name: usr.name,
              role: 'TEAM_MEMBER',
              team_id: team.id,
              team_name: team.team_name
            }
          });
        };

        if (userObj) {
          generateToken(userObj);
        } else {
          // Create member user
          const passHash = bcrypt.hashSync('member123', 10);
          db.run(
            "INSERT INTO users (name, password_hash, role, team_id) VALUES (?, ?, 'TEAM_MEMBER', ?)",
            [cleanMember, passHash, team.id],
            function (err) {
              if (err) {
                return res.status(500).json({ success: false, error: 'Failed to register team member session.' });
              }
              const newId = this.lastID;
              db.run("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'TEAM_MEMBER')", [team.id, newId]);
              generateToken({ id: newId, name: cleanMember });
            }
          );
        }
      }
    );
  });
};

// Get Live Team Progress & Hint
exports.getTeamProgress = (req, res) => {
  const user = req.user;
  if (!user || !user.team_id) {
    return res.status(400).json({ success: false, error: 'Missing team authorization.' });
  }

  const teamId = user.team_id;

  db.serialize(() => {
    // 1. Get global hunt state
    db.get("SELECT * FROM hunt WHERE id = 1", [], (err, huntRow) => {
      const huntState = huntRow || { status: 'LIVE' };

      // 2. Get Team details
      db.get("SELECT * FROM teams WHERE id = ?", [teamId], (err, team) => {
        if (err || !team) {
          return res.status(404).json({ success: false, error: 'Team record not found.' });
        }

        // 3. Get Team Stage Order
        db.all(
          `SELECT tso.position, s.id as stage_id, s.stage_number, s.title, s.mission_description, s.clue_text
           FROM team_stage_order tso
           JOIN stages s ON tso.stage_id = s.id
           WHERE tso.team_id = ?
           ORDER BY tso.position ASC`,
          [teamId],
          (err, stageOrderRows) => {
            if (err || !stageOrderRows || stageOrderRows.length === 0) {
              return res.status(500).json({ success: false, error: 'Team stage order not initialized.' });
            }

            // 4. Get Stage Completions for Team
            db.all(
              "SELECT * FROM stage_completions WHERE team_id = ? ORDER BY position ASC",
              [teamId],
              (err, completions) => {
                const completedSet = new Set((completions || []).map(c => c.stage_id));
                const completedCount = completedSet.size;

                // Current position: 1-indexed (1..7)
                const currentPosition = Math.min(7, completedCount + 1);
                const isFullyCompleted = completedCount >= 7;

                // Build sequence with status
                const sequence = stageOrderRows.map((stg) => {
                  let status = 'LOCKED';
                  if (completedSet.has(stg.stage_id)) {
                    status = 'COMPLETED';
                  } else if (stg.position === currentPosition && !isFullyCompleted) {
                    status = 'CURRENT';
                  }
                  return {
                    position: stg.position,
                    stage_number: stg.stage_number,
                    title: stg.title,
                    status
                  };
                });

                // Get current unlocked clue (for current required stage)
                const currentStageObj = stageOrderRows.find(s => s.position === currentPosition) || stageOrderRows[6];

                // Get team members list
                db.all(
                  "SELECT u.id, u.name, u.role FROM users u WHERE u.team_id = ?",
                  [teamId],
                  (err, memberRows) => {

                    // If hunt completed, get winner team details
                    const getWinnerDetails = (cb) => {
                      if (huntState.winner_team_id) {
                        db.get("SELECT team_name, completed_at FROM teams WHERE id = ?", [huntState.winner_team_id], (err, w) => {
                          cb(w || null);
                        });
                      } else {
                        cb(null);
                      }
                    };

                    getWinnerDetails((winnerInfo) => {
                      res.json({
                        success: true,
                        role: user.role,
                        team: {
                          id: team.id,
                          team_name: team.team_name,
                          status: isFullyCompleted ? 'COMPLETED' : team.status,
                          started_at: team.started_at,
                          completed_at: team.completed_at
                        },
                        current_position: currentPosition,
                        completed_stages_count: completedCount,
                        total_stages: 7,
                        is_completed: isFullyCompleted,
                        stage_sequence: sequence,
                        current_hint: {
                          stage_number: currentStageObj.stage_number,
                          title: currentStageObj.title,
                          mission_description: currentStageObj.mission_description,
                          clue_text: currentStageObj.clue_text
                        },
                        members: memberRows || [],
                        hunt: {
                          status: huntState.status,
                          winner_team_id: huntState.winner_team_id,
                          winner_name: winnerInfo ? winnerInfo.team_name : null,
                          winner_completed_at: huntState.winner_completed_at
                        }
                      });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};

// QR Token Scan Logic
exports.scanToken = (req, res) => {
  const user = req.user;
  const { qr_token } = req.body;

  // STRICT ROLE ENFORCEMENT: Team Members CANNOT scan
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

  db.serialize(() => {
    // 1. Verify global hunt state
    db.get("SELECT * FROM hunt WHERE id = 1", [], (err, huntState) => {
      if (huntState && huntState.status !== 'LIVE') {
        return res.status(400).json({
          success: false,
          code: 'HUNT_CLOSED',
          title: '🏆 TREASURE HUNT COMPLETE',
          message: 'The Treasure Hunt has concluded! No further QR scans are accepted.'
        });
      }

      // 2. Fetch Team and Stage Order
      db.get("SELECT * FROM teams WHERE id = ?", [teamId], (err, team) => {
        if (err || !team) {
          return res.status(404).json({ success: false, error: 'Team not found.' });
        }

        db.all(
          "SELECT * FROM stage_completions WHERE team_id = ?",
          [teamId],
          (err, completions) => {
            const completedCount = (completions || []).length;

            if (completedCount >= 7) {
              return res.json({
                success: true,
                code: 'TEAM_ALREADY_COMPLETED',
                title: '🏆 TREASURE UNLOCKED!',
                message: 'Your team has already completed all 7 stages!',
                is_final: true
              });
            }

            const currentPosition = completedCount + 1; // 1-indexed required position

            // Find current required stage for team position
            db.get(
              `SELECT tso.position, s.id as stage_id, s.stage_number, s.title, s.clue_text
               FROM team_stage_order tso
               JOIN stages s ON tso.stage_id = s.id
               WHERE tso.team_id = ? AND tso.position = ?`,
              [teamId, currentPosition],
              (err, requiredStage) => {
                if (err || !requiredStage) {
                  return res.status(500).json({ success: false, error: 'Failed to retrieve team objective.' });
                }

                // Look up scanned QR code with multi-strategy token matching
                db.all(
                  `SELECT q.id as qr_id, q.stage_id, q.secure_token, s.stage_number, s.title, s.clue_text
                   FROM qr_codes q
                   JOIN stages s ON q.stage_id = s.id`,
                  [],
                  (err, allQRs) => {
                    if (err || !allQRs || allQRs.length === 0) {
                      db.run(
                        "INSERT INTO scan_attempts (team_id, user_id, scanned_token, is_success, message) VALUES (?, ?, ?, 0, 'UNKNOWN_MARK')",
                        [teamId, user.id, cleanToken]
                      );
                      return res.json({
                        success: false,
                        code: 'UNKNOWN_MARK',
                        title: 'UNKNOWN MARK',
                        message: 'This symbol does not belong to this college treasure hunt.'
                      });
                    }

                    // Find matching QR entry
                    const qrMatch = allQRs.find(q => {
                      const secToken = (q.secure_token || '').trim();
                      const stgNum = q.stage_number.toString();

                      if (secToken && cleanToken === secToken) return true;
                      if (secToken && cleanToken.toLowerCase() === secToken.toLowerCase()) return true;
                      if (secToken && (cleanToken.includes(secToken) || secToken.includes(cleanToken))) return true;

                      // Stage tag matching e.g. TH_STAGE1_MARK or stage-01 or stage1
                      if (cleanToken.toLowerCase().includes(`stage${stgNum}`) || cleanToken.toLowerCase().includes(`stage-0${stgNum}`) || cleanToken.toLowerCase().includes(`stage_0${stgNum}`)) return true;

                      return false;
                    });

                    if (!qrMatch) {
                      db.run(
                        "INSERT INTO scan_attempts (team_id, user_id, scanned_token, is_success, message) VALUES (?, ?, ?, 0, 'UNKNOWN_MARK')",
                        [teamId, user.id, cleanToken]
                      );
                      return res.json({
                        success: false,
                        code: 'UNKNOWN_MARK',
                        title: 'UNKNOWN MARK',
                        message: 'This symbol does not belong to this college treasure hunt.'
                      });
                    }


                    // CHECK WRONG MARK: If scanned QR does NOT match current required stage
                    if (qrMatch.stage_id !== requiredStage.stage_id) {
                      db.run(
                        "INSERT INTO scan_attempts (team_id, user_id, scanned_token, is_success, stage_number, message) VALUES (?, ?, ?, 0, ?, 'WRONG_MARK')",
                        [teamId, user.id, cleanToken, qrMatch.stage_number]
                      );

                      const io = req.app.get('io');
                      if (io) {
                        io.to(`team:${teamId}`).emit('wrong_qr_scan', {
                          team_name: team.team_name,
                          scanned_stage: qrMatch.stage_number,
                          required_stage: requiredStage.stage_number
                        });
                      }

                      return res.json({
                        success: false,
                        code: 'WRONG_MARK',
                        title: '⚠ WRONG MARK',
                        message: `Your team's next destination lies elsewhere. You scanned ${qrMatch.title || 'a different location'}, but your next objective is ${requiredStage.title || 'your current target'}.`,
                        scanned_stage: qrMatch.stage_number,
                        required_stage: requiredStage.stage_number
                      });
                    }

                    // CORRECT QR SCAN! Insert Stage Completion
                    const targetQRId = qrMatch.qr_id || qrMatch.id || 1;
                    db.run(
                      "INSERT OR REPLACE INTO stage_completions (team_id, stage_id, position, qr_id) VALUES (?, ?, ?, ?)",
                      [teamId, qrMatch.stage_id, currentPosition, targetQRId],
                      function (err) {
                        if (err) {
                          console.error("Stage completion insert error:", err);
                          return res.status(500).json({ success: false, error: err.message || 'Failed to record stage completion.' });
                        }





                        const isFinalStage = currentPosition >= 7;

                        if (isFinalStage) {
                          // Update Team completion timestamp
                          db.run("UPDATE teams SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?", [teamId]);

                          // Atomic Winner declaration
                          db.run(
                            "UPDATE hunt SET winner_team_id = ?, winner_completed_at = CURRENT_TIMESTAMP, status = 'CLOSED' WHERE winner_team_id IS NULL AND id = 1",
                            [teamId],
                            function (err) {
                              const isWinner = this.changes > 0;

                              const io = req.app.get('io');
                              if (io) {
                                io.to(`team:${teamId}`).emit('stage_completed', {
                                  team_name: team.team_name,
                                  position: 7,
                                  is_final: true,
                                  is_winner: isWinner
                                });

                                io.emit('hunt_winner_declared', {
                                  winner_team_id: teamId,
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
                                stage_number: qrMatch.stage_number,
                                stage_title: qrMatch.title
                              });
                            }
                          );
                        } else {
                          // Intermediate stage completed
                          const nextPosition = currentPosition + 1;
                          db.get(
                            `SELECT s.stage_number, s.title, s.clue_text
                             FROM team_stage_order tso
                             JOIN stages s ON tso.stage_id = s.id
                             WHERE tso.team_id = ? AND tso.position = ?`,
                            [teamId, nextPosition],
                            (err, nextStage) => {

                              const io = req.app.get('io');
                              if (io) {
                                io.to(`team:${teamId}`).emit('stage_completed', {
                                  team_name: team.team_name,
                                  completed_position: currentPosition,
                                  next_position: nextPosition,
                                  next_hint: nextStage || null
                                });

                                io.to('admin').emit('team_progress_updated', {
                                  team_id: teamId,
                                  team_name: team.team_name,
                                  completed_stages: currentPosition
                                });
                              }

                              return res.json({
                                success: true,
                                code: 'STAGE_COMPLETED',
                                title: `✓ STAGE ${currentPosition} COMPLETED`,
                                message: `Stage ${qrMatch.stage_number} completed! Your next clue has been unlocked.`,
                                position_completed: currentPosition,
                                stage_number: qrMatch.stage_number,
                                stage_title: qrMatch.title,
                                next_stage: nextStage || null
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};

// Global Leaderboard
exports.getLeaderboard = (req, res) => {
  db.all(
    `SELECT t.id, t.team_name, t.started_at, t.completed_at,
            (SELECT COUNT(*) FROM stage_completions sc WHERE sc.team_id = t.id) as completed_stages,
            (STRFTIME('%s', t.completed_at) - STRFTIME('%s', t.started_at)) as duration_seconds
     FROM teams t
     ORDER BY completed_stages DESC, t.completed_at ASC, t.created_at ASC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Database query error.' });
      }

      const leaderboard = (rows || []).map((t, idx) => ({
        rank: idx + 1,
        id: t.id,
        team_name: t.team_name,
        completed_stages: t.completed_stages || 0,
        is_completed: (t.completed_stages || 0) >= 7,
        duration_seconds: t.duration_seconds || 0,
        duration_formatted: t.duration_seconds ? formatDuration(t.duration_seconds) : null
      }));

      res.json({
        success: true,
        count: leaderboard.length,
        leaderboard
      });
    }
  );
};

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Participant Feedback
exports.submitFeedback = (req, res) => {
  const user = req.user;
  const { rating, emoji, comment, participant_name, team_name } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Please provide a star rating between 1 and 5.' });
  }

  const teamId = user ? user.team_id : null;
  const userId = user ? user.id : null;
  const pName = participant_name || (user ? user.name : 'Anonymous Hunter');
  const tName = team_name || (user ? user.team_name : '');

  db.run(
    "INSERT INTO feedback (team_id, user_id, rating, emoji, comment, participant_name, team_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [teamId, userId, rating, emoji || '⭐', comment ? comment.trim() : '', pName, tName],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to record feedback.' });
      }
      res.json({
        success: true,
        message: 'Your adventure feedback has been recorded. Thank you!'
      });
    }
  );
};

