const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use DATA_DIR env var for persistent storage (Render disk), fallback to local
const dataDir = process.env.DATA_DIR || __dirname;
const dbPath = path.join(dataDir, 'worklog.db');

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    task TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_work_logs_status ON work_logs(status);

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_read INTEGER DEFAULT 0,
    is_global INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_global ON notifications(is_global, created_at);

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_1_id INTEGER NOT NULL,
    participant_2_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_1_id) REFERENCES users(id),
    FOREIGN KEY (participant_2_id) REFERENCES users(id),
    UNIQUE(participant_1_id, participant_2_id)
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
`);

// Seed admin user if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE name = ?').get('jonathan');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('1027', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run('jonathan@admin.local', hashedPassword, 'jonathan', 'admin');
  console.log('Default admin created: jonathan / 1027');
}

// Seed sample staff
const staffExists = db.prepare('SELECT * FROM users WHERE name = ?').get('John Staff');
if (!staffExists) {
  const hashedPassword = bcrypt.hashSync('staff123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run('staff@company.com', hashedPassword, 'John Staff', 'staff');
  console.log('Default staff created: John Staff / staff123');
}

module.exports = db;