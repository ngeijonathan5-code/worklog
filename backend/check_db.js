const db = require('./db');
console.log('Tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name));
console.log('Conversations table exists:', !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'").get());
console.log('Messages table exists:', !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get());