const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get all conversations for current user
router.get('/conversations', (req, res) => {
  const conversations = db.prepare(`
    SELECT 
      c.id,
      c.updated_at,
      CASE 
        WHEN c.participant_1_id = ? THEN u2.name 
        ELSE u1.name 
      END as other_participant_name,
      CASE 
        WHEN c.participant_1_id = ? THEN u2.id 
        ELSE u1.id 
      END as other_participant_id,
      CASE 
        WHEN c.participant_1_id = ? THEN u2.role 
        ELSE u1.role 
      END as other_participant_role,
      (
        SELECT content FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC LIMIT 1
      ) as last_message,
      (
        SELECT created_at FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC LIMIT 1
      ) as last_message_time,
      (
        SELECT COUNT(*) FROM messages 
        WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0
      ) as unread_count
    FROM conversations c
    JOIN users u1 ON c.participant_1_id = u1.id
    JOIN users u2 ON c.participant_2_id = u2.id
    WHERE c.participant_1_id = ? OR c.participant_2_id = ?
    ORDER BY c.updated_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);
  
  res.json(conversations);
});

// Get messages for a conversation
router.get('/conversations/:id/messages', (req, res) => {
  const conversation = db.prepare(`
    SELECT * FROM conversations 
    WHERE id = ? AND (participant_1_id = ? OR participant_2_id = ?)
  `).get(req.params.id, req.user.id, req.user.id);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.id);
  
  // Mark messages as read
  db.prepare(`
    UPDATE messages SET is_read = 1 
    WHERE conversation_id = ? AND sender_id != ?
  `).run(req.params.id, req.user.id);
  
  res.json(messages);
});

// Send a message (creates conversation if needed)
router.post('/conversations', (req, res) => {
  const { recipientId, content } = req.body;
  
  if (!recipientId || !content?.trim()) {
    return res.status(400).json({ error: 'Recipient and content required' });
  }
  
  if (parseInt(recipientId) === req.user.id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }
  
  const recipient = db.prepare('SELECT * FROM users WHERE id = ?').get(recipientId);
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }
  
  // Check if conversation exists
  let conversation = db.prepare(`
    SELECT * FROM conversations 
    WHERE (participant_1_id = ? AND participant_2_id = ?)
       OR (participant_1_id = ? AND participant_2_id = ?)
  `).get(req.user.id, recipientId, recipientId, req.user.id);
  
  if (!conversation) {
    const result = db.prepare(`
      INSERT INTO conversations (participant_1_id, participant_2_id) VALUES (?, ?)
    `).run(req.user.id, recipientId);
    
    conversation = { id: result.lastInsertRowid };
  }
  
  const messageResult = db.prepare(`
    INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)
  `).run(conversation.id, req.user.id, content);
  
  db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conversation.id);
  
  const message = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(messageResult.lastInsertRowid);
  
  res.status(201).json({ conversation, message });
});

// Get users available for messaging (staff can message admins, admins can message anyone)
router.get('/users', (req, res) => {
  let users;
  if (req.user.role === 'admin') {
    users = db.prepare('SELECT id, name, role FROM users WHERE id != ? ORDER BY name').all(req.user.id);
  } else {
    users = db.prepare('SELECT id, name, role FROM users WHERE id != ? AND role = ? ORDER BY name').all(req.user.id, 'admin');
  }
  res.json(users);
});

module.exports = router;