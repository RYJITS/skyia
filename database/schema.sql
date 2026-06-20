CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL DEFAULT 'Operative',
  games_played INT NOT NULL DEFAULT 0,
  victories INT NOT NULL DEFAULT 0,
  defeats INT NOT NULL DEFAULT 0,
  total_credits_used INT NOT NULL DEFAULT 0,
  available_credits INT NOT NULL DEFAULT 20,
  created_at DATETIME NOT NULL,
  last_played DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_auth_sessions_user (user_id),
  INDEX idx_auth_sessions_expires (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_saved_sessions_user (user_id, updated_at),
  CONSTRAINT fk_saved_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_stats (
  model_id VARCHAR(190) NOT NULL PRIMARY KEY,
  victories INT NOT NULL DEFAULT 0,
  defeats INT NOT NULL DEFAULT 0,
  total_games INT NOT NULL DEFAULT 0,
  total_victory_turn_count INT NOT NULL DEFAULT 0,
  total_defeat_turn_count INT NOT NULL DEFAULT 0,
  total_victory_threat_level DECIMAL(8,2) NOT NULL DEFAULT 0,
  last_updated DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dual_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  skyia_model VARCHAR(190) NOT NULL,
  defender_model VARCHAR(190) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  outcome ENUM('VICTORY', 'DEFEAT', 'MAX_ROUNDS', 'PAUSED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  threat_level DECIMAL(8,2) NOT NULL DEFAULT 99,
  rounds INT NOT NULL DEFAULT 0,
  messages_count INT NOT NULL DEFAULT 0,
  avg_skyia_ms INT NULL,
  avg_defender_ms INT NULL,
  skyia_errors INT NOT NULL DEFAULT 0,
  defender_errors INT NOT NULL DEFAULT 0,
  payload JSON NOT NULL,
  archived_at DATETIME NULL,
  text_status ENUM('OK', 'WARN') NOT NULL DEFAULT 'OK',
  text_warning_count INT NOT NULL DEFAULT 0,
  text_flags JSON NULL,
  stats_synced_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_dual_reports_created (created_at),
  INDEX idx_dual_reports_archive (archived_at, created_at),
  INDEX idx_dual_reports_text (text_status, created_at),
  INDEX idx_dual_reports_models (skyia_model, defender_model),
  INDEX idx_dual_reports_user (user_id, created_at),
  CONSTRAINT fk_dual_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_latency_checks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  model_id VARCHAR(190) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  role ENUM('skyia', 'defender') NOT NULL,
  status ENUM('ok', 'error') NOT NULL,
  total_ms INT NULL,
  first_token_ms INT NULL,
  prompt_chars INT NULL,
  message_count INT NULL,
  error TEXT NULL,
  checked_at DATETIME NOT NULL,
  INDEX idx_model_latency_model (model_id, checked_at),
  INDEX idx_model_latency_status (status, checked_at),
  INDEX idx_model_latency_role (role, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_models (
  user_id CHAR(36) NOT NULL,
  model_id VARCHAR(190) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, model_id),
  CONSTRAINT fk_custom_models_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id CHAR(36) NOT NULL,
  provider ENUM('openrouter', 'groq') NOT NULL,
  key_cipher TEXT NOT NULL,
  key_last4 CHAR(4) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, provider),
  CONSTRAINT fk_user_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_cache (
  cache_key VARCHAR(80) NOT NULL PRIMARY KEY,
  payload JSON NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash CHAR(64) NOT NULL PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  window_start DATETIME NOT NULL,
  count INT NOT NULL DEFAULT 0,
  INDEX idx_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
