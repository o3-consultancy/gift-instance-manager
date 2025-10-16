import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'instances.db');

// Initialize database connection
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create tables
export function initializeDatabase() {
  console.log('🗄️  Initializing database...');

  // Instances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      container_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'stopped',
      api_key TEXT NOT NULL,
      account_id TEXT NOT NULL,
      tiktok_username TEXT NOT NULL,
      port INTEGER NOT NULL UNIQUE,
      backend_api_url TEXT,
      dash_password TEXT,
      debug_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_started_at DATETIME,
      last_stopped_at DATETIME
    )
  `);

  // Instance logs table (for storing important events)
  db.exec(`
    CREATE TABLE IF NOT EXISTS instance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
    )
  `);

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
    CREATE INDEX IF NOT EXISTS idx_instances_port ON instances(port);
    CREATE INDEX IF NOT EXISTS idx_instance_logs_instance_id ON instance_logs(instance_id);
    CREATE INDEX IF NOT EXISTS idx_instance_logs_created_at ON instance_logs(created_at);
  `);

  console.log('✅ Database initialized successfully');
}

// Instance Model
export const InstanceModel = {
  // Create new instance
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO instances (name, api_key, account_id, tiktok_username, port,
                            backend_api_url, dash_password, debug_mode)
      VALUES (@name, @api_key, @account_id, @tiktok_username, @port,
              @backend_api_url, @dash_password, @debug_mode)
    `);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid);
  },

  // Find instance by ID
  findById(id) {
    const stmt = db.prepare('SELECT * FROM instances WHERE id = ?');
    return stmt.get(id);
  },

  // Find instance by name
  findByName(name) {
    const stmt = db.prepare('SELECT * FROM instances WHERE name = ?');
    return stmt.get(name);
  },

  // Find instance by container ID
  findByContainerId(containerId) {
    const stmt = db.prepare('SELECT * FROM instances WHERE container_id = ?');
    return stmt.get(containerId);
  },

  // Find instance by port
  findByPort(port) {
    const stmt = db.prepare('SELECT * FROM instances WHERE port = ?');
    return stmt.get(port);
  },

  // Get all instances
  findAll() {
    const stmt = db.prepare('SELECT * FROM instances ORDER BY created_at DESC');
    return stmt.all();
  },

  // Update instance
  update(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE instances
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(values);
    return this.findById(id);
  },

  // Update status
  updateStatus(id, status) {
    const stmt = db.prepare(`
      UPDATE instances
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, id);
    return this.findById(id);
  },

  // Update container ID
  updateContainerId(id, containerId) {
    const stmt = db.prepare(`
      UPDATE instances
      SET container_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(containerId, id);
    return this.findById(id);
  },

  // Mark as started
  markStarted(id) {
    const stmt = db.prepare(`
      UPDATE instances
      SET status = 'running',
          last_started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
    return this.findById(id);
  },

  // Mark as stopped
  markStopped(id) {
    const stmt = db.prepare(`
      UPDATE instances
      SET status = 'stopped',
          last_stopped_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
    return this.findById(id);
  },

  // Delete instance
  delete(id) {
    const stmt = db.prepare('DELETE FROM instances WHERE id = ?');
    return stmt.run(id);
  },

  // Get used ports
  getUsedPorts() {
    const stmt = db.prepare('SELECT port FROM instances');
    return stmt.all().map(row => row.port);
  }
};

// Instance Logs Model
export const InstanceLogModel = {
  // Add log entry
  add(instanceId, level, message, details = null) {
    const stmt = db.prepare(`
      INSERT INTO instance_logs (instance_id, level, message, details)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(instanceId, level, message, details ? JSON.stringify(details) : null);
  },

  // Get logs for instance
  findByInstance(instanceId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM instance_logs
      WHERE instance_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(instanceId, limit);
  },

  // Clear old logs
  clearOld(daysToKeep = 30) {
    const stmt = db.prepare(`
      DELETE FROM instance_logs
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(daysToKeep);
  }
};

// Settings Model
export const SettingsModel = {
  get(key) {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);
    return row ? row.value : null;
  },

  set(key, value) {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value, value);
  }
};

// User Model
export const UserModel = {
  create(username, passwordHash, role = 'admin') {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(username, passwordHash, role);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  },

  updateLastLogin(id) {
    const stmt = db.prepare(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  }
};

// Initialize database on import
initializeDatabase();
