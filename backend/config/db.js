const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const isVercel = Boolean(process.env.VERCEL);
const dbPath = isVercel ? path.join('/tmp', 'treasure_hunt.db') : path.join(__dirname, '..', 'treasure_hunt.db');

let db;
try {
  db = new sqlite3.Database(dbPath);
} catch (err) {
  console.error('Failed to open SQLite at ' + dbPath + ', falling back to :memory:', err);
  db = new sqlite3.Database(':memory:');
}

const DEFAULT_TOKENS = [
  'TH_STAGE1_MARK_9F8A3C12E45B67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE2_MARK_7E6D5C4B3A219876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876',
  'TH_STAGE3_MARK_1A2B3C4D5E6F7890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE4_MARK_9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA',
  'TH_STAGE5_MARK_A1B2C3D4E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE6_MARK_F0E9D8C7B6A543210987654321FEDCBA0987654321FEDCBA0987654321FEDCBA',
  'TH_STAGE7_MARK_TREASURE_UNLOCKED_FINAL_MARK_99887766554433221100AABBCCDDEEFF'
];

const DEFAULT_STAGES = [
  {
    stage_number: 1,
    title: "THE FIRST MARK",
    mission_description: "Your journey begins here. Locate the hidden mark in the central courtyard where knowledge sleeps.",
    clue_text: "The place where knowledge sleeps, and countless stories wait to be discovered. Search near the main library entrance."
  },
  {
    stage_number: 2,
    title: "CROSSROADS OF DESTINY",
    mission_description: "Seek the place where paths cross and students gather between hours.",
    clue_text: "Look where footsteps cross but nobody stays long — near the central clock tower quadrangle."
  },
  {
    stage_number: 3,
    title: "THE FORGE OF INNOVATION",
    mission_description: "Find the sanctuary of creation where ideas transform into reality.",
    clue_text: "Find the place where ideas become action — near the Engineering Laboratory building main foyer."
  },
  {
    stage_number: 4,
    title: "GATEWAY OF ORIGINS",
    mission_description: "Return to where every campus adventure begins.",
    clue_text: "Your next mark waits where many daily journeys begin — check near the North Gate administrative reception."
  },
  {
    stage_number: 5,
    title: "THE SENTINEL OVERLOOK",
    mission_description: "Ascend toward the high vantage point that watches over the green fields.",
    clue_text: "Seek the place that watches over the campus grounds — the amphitheater top balcony staircase."
  },
  {
    stage_number: 6,
    title: "THE FINAL THRESHOLD",
    mission_description: "One last sanctuary remains before the legendary treasure.",
    clue_text: "One final path remains before the treasure — search near the student sports complex trophy wall."
  },
  {
    stage_number: 7,
    title: "THE TREASURE SANCTUARY",
    mission_description: "The final mark is within reach! Scan to claim victory!",
    clue_text: "The treasure is here! You have proven your skill, endurance, and sharpness. Claim your glory!"
  }
];

function initDB() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    // 1. Teams
    db.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_name VARCHAR(100) NOT NULL UNIQUE,
        leader_user_id INT DEFAULT NULL,
        member_count INT DEFAULT 5,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure member_count column exists for existing DBs
    db.run("ALTER TABLE teams ADD COLUMN member_count INT DEFAULT 5", (err) => {
      // Ignore if column already exists
    });


    // 2. Users (Leader, Members, Admin)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        username VARCHAR(100) UNIQUE DEFAULT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER')),
        team_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
      )
    `);

    // 3. Team Members
    db.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(20) NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )
    `);

    // 4. Fixed 7 Stages
    db.run(`
      CREATE TABLE IF NOT EXISTS stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_number INT NOT NULL UNIQUE,
        title VARCHAR(150) NOT NULL,
        mission_description TEXT NOT NULL,
        clue_text TEXT NOT NULL,
        active TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Team Stage Order
    db.run(`
      CREATE TABLE IF NOT EXISTS team_stage_order (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INT NOT NULL,
        position INT NOT NULL CHECK(position >= 1 AND position <= 7),
        stage_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
        UNIQUE(team_id, position),
        UNIQUE(team_id, stage_id)
      )
    `);

    // 6. QR Codes
    db.run(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INT NOT NULL UNIQUE,
        secure_token VARCHAR(128) DEFAULT NULL,
        token VARCHAR(128) DEFAULT NULL,
        is_active TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
      )
    `);

    db.run("ALTER TABLE qr_codes ADD COLUMN secure_token VARCHAR(128)", () => {});
    db.run("ALTER TABLE qr_codes ADD COLUMN token VARCHAR(128)", () => {});


    // 7. Stage Completions per Team
    db.run(`
      CREATE TABLE IF NOT EXISTS stage_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INT NOT NULL,
        stage_id INT NOT NULL,
        position INT NOT NULL,
        qr_id INT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
        FOREIGN KEY (qr_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
        UNIQUE(team_id, stage_id)
      )
    `);

    db.run("ALTER TABLE stage_completions ADD COLUMN team_id INT DEFAULT NULL", () => {});
    db.run("ALTER TABLE stage_completions ADD COLUMN position INT DEFAULT 1", () => {});
    db.run("ALTER TABLE stage_completions ADD COLUMN qr_id INT DEFAULT 1", () => {});



    // 8. Global Hunt Table
    db.run(`
      CREATE TABLE IF NOT EXISTS hunt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status VARCHAR(20) NOT NULL DEFAULT 'LIVE',
        winner_team_id INT DEFAULT NULL,
        winner_completed_at DATETIME DEFAULT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME DEFAULT NULL,
        FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL
      )
    `);

    // 9. App Settings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        min_team_members INT DEFAULT 4,
        default_team_members INT DEFAULT 5,
        max_team_members INT DEFAULT 10,
        max_total_participants INT DEFAULT 150,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Scan Attempts
    db.run(`
      CREATE TABLE IF NOT EXISTS scan_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INT DEFAULT NULL,
        user_id INT DEFAULT NULL,
        scanned_token VARCHAR(128) NOT NULL,
        is_success TINYINT NOT NULL DEFAULT 0,
        stage_number INT DEFAULT NULL,
        message VARCHAR(255) DEFAULT NULL,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run("ALTER TABLE scan_attempts ADD COLUMN team_id INT DEFAULT NULL", () => {});
    db.run("ALTER TABLE scan_attempts ADD COLUMN user_id INT DEFAULT NULL", () => {});


    // 11. Feedback
    db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INT DEFAULT NULL,
        user_id INT DEFAULT NULL,
        rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
        emoji VARCHAR(20) DEFAULT NULL,
        comment TEXT,
        participant_name VARCHAR(100) DEFAULT NULL,
        team_name VARCHAR(100) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default Admin in users table
    db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'", [], (err, row) => {
      if (!err && row && row.count === 0) {
        const hash = bcrypt.hashSync('treasure2026', 10);
        db.run(
          "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
          ['System Admin', 'admin', hash, 'ADMIN'],
          () => {
            console.log("--> Default admin user created: username=admin, password=treasure2026");
          }
        );
      }
    });

    // Seed default hunt status if empty
    db.get("SELECT COUNT(*) AS count FROM hunt", [], (err, row) => {
      if (!err && row && row.count === 0) {
        db.run("INSERT INTO hunt (id, status) VALUES (1, 'LIVE')");
      }
    });

    // Seed default app settings if empty
    db.get("SELECT COUNT(*) AS count FROM app_settings", [], (err, row) => {
      if (!err && row && row.count === 0) {
        db.run(
          "INSERT INTO app_settings (id, min_team_members, default_team_members, max_team_members, max_total_participants) VALUES (1, 4, 5, 10, 150)"
        );
      }
    });

    // Seed default 7 stages & QR codes
    db.get("SELECT COUNT(*) AS count FROM stages", [], (err, row) => {
      if (!err && row && row.count === 0) {
        console.log("--> Seeding 7 default stages & QR tokens...");
        DEFAULT_STAGES.forEach((stg, idx) => {
          db.run(
            "INSERT INTO stages (stage_number, title, mission_description, clue_text) VALUES (?, ?, ?, ?)",
            [stg.stage_number, stg.title, stg.mission_description, stg.clue_text],
            function (err) {
              if (!err) {
                const stageId = this.lastID;
                const token = DEFAULT_TOKENS[idx];
                db.run(
                  "INSERT OR REPLACE INTO qr_codes (id, stage_id, secure_token, token) VALUES (?, ?, ?, ?)",
                  [stageId, stageId, token, token]
                );
              }
            }
          );
        });
      } else {
        // Ensure every existing stage has its correct QR token in qr_codes
        DEFAULT_TOKENS.forEach((token, idx) => {
          const stageNum = idx + 1;
          db.get("SELECT id FROM stages WHERE stage_number = ?", [stageNum], (err, stg) => {
            if (stg) {
              db.run(
                "INSERT OR REPLACE INTO qr_codes (id, stage_id, secure_token, token) VALUES (?, ?, ?, ?)",
                [stg.id, stg.id, token, token]
              );
            }
          });
        });
      }
    });



  });
}

initDB();

module.exports = db;

