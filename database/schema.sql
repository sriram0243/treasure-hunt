-- ============================================================
-- College Event Treasure Hunt — Team System Database Schema
-- Compatible with MySQL 5.7+ / 8.0+ & SQLite
-- ============================================================

-- Table 1: Teams
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name VARCHAR(100) NOT NULL UNIQUE,
  leader_user_id INT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Users (Leader, Members, Admin)
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
);

-- Table 3: Team Members Mapping
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);

-- Table 4: Fixed Stages (Exactly 7)
CREATE TABLE IF NOT EXISTS stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_number INT NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  mission_description TEXT NOT NULL,
  clue_text TEXT NOT NULL,
  active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: Randomized Stage Order per Team
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
);

-- Table 6: QR Codes (Stage Tokens)
CREATE TABLE IF NOT EXISTS qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INT NOT NULL UNIQUE,
  secure_token VARCHAR(128) NOT NULL UNIQUE,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
);

-- Table 7: Stage Completions per Team
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
);

-- Table 8: Global Hunt State & Winner tracking
CREATE TABLE IF NOT EXISTS hunt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status VARCHAR(20) NOT NULL DEFAULT 'LIVE',
  winner_team_id INT DEFAULT NULL,
  winner_completed_at DATETIME DEFAULT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME DEFAULT NULL,
  FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Table 9: Admin App Configuration Settings
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_team_members INT DEFAULT 4,
  default_team_members INT DEFAULT 5,
  max_team_members INT DEFAULT 10,
  max_total_participants INT DEFAULT 150,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 10: Scan Logs / Attempts
CREATE TABLE IF NOT EXISTS scan_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  scanned_token VARCHAR(128) NOT NULL,
  is_success TINYINT NOT NULL DEFAULT 0,
  stage_number INT DEFAULT NULL,
  message VARCHAR(255) DEFAULT NULL,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 11: Feedback
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
);

