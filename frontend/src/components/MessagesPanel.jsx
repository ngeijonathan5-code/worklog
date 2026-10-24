import { useState, useEffect, useRef } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import { useAuth } from '../contexts/AuthContext';
import { messageApi } from '../api.js';

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function MessagesPanel() {
  const { 
    conversations, 
    activeConversation, 
    messages, 
    isOpen, 
    unreadCount, 
    sendMessage, 
    openConversation, 
    closeMessages,
    setIsOpen 
  } = useMessages();
  const { user } = useAuth();
  
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch users for new message
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await messageApi.getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus search input when opening new message
  useEffect(() => {
    if (showNewMessage) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showNewMessage]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageContent.trim()) return;
    
    setSending(true);
    try {
      if (activeConversation) {
        // Reply to existing conversation
        await sendMessage(activeConversation.other_participant_id, newMessageContent);
      } else if (selectedUser) {
        // Start new conversation
        await sendMessage(selectedUser, newMessageContent);
      }
      setNewMessageContent('');
      setShowNewMessage(false);
      setSelectedUser('');
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.other_participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="messages-panel" ref={panelRef}>
      {/* Messages Trigger Button */}
      <button
        className={`messages-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="messages-icon">💬</span>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {/* Messages Dropdown Panel */}
      {isOpen && (
        <div className="messages-dropdown">
          {/* Header */}
          <div className="messages-header">
            <h3>Messages</h3>
            <div className="messages-header-actions">
              <button className="new-message-btn" onClick={() => { setShowNewMessage(true); setSearchQuery(''); }}>
                + New Message
              </button>
              <button className="close-btn" onClick={closeMessages}>✕</button>
            </div>
          </div>

          {/* Search */}
          <div className="messages-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* New Message Form */}
          {showNewMessage && (
            <form className="new-message-form" onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>Recipient:</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">Select recipient</option>
                  {filteredUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Type your message..."
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowNewMessage(false); setSelectedUser(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={sending || !selectedUser}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          )}

          {/* Conversation View */}
          {activeConversation && (
            <div className="conversation-view">
              <div className="conversation-header">
                <button className="back-btn" onClick={() => { setActiveConversation(null); setMessages([]); }}>
                  ← Back
                </button>
                <div className="conversation-info">
                  <span className="conversation-name">{activeConversation.other_participant_name}</span>
                  <span className="conversation-role">{activeConversation.other_participant_role}</span>
                </div>
              </div>
              
              <div className="messages-list">
                {messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`message ${message.sender_id === user.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{message.content}</p>
                      <span className="message-time">{formatTime(message.created_at)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form className="reply-form" onSubmit={handleSendMessage}>
                <div className="form-group">
                  <textarea
                    placeholder="Reply..."
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    rows={2}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={sending}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Conversations List */}
          {!activeConversation && !showNewMessage && (
            <div className="conversations-list">
              {filteredConversations.length === 0 ? (
                <div className="empty-state">
                  <p>No conversations yet.</p>
                  <button className="btn-primary" onClick={() => setShowNewMessage(true)}>
                    Start a Conversation
                  </button>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    className={`conversation-item ${conv.unread_count > 0 ? 'unread' : ''}`}
                    onClick={() => openConversation(conv)}
                  >
                    <div className="conversation-avatar">
                      {conv.other_participant_role === 'admin' ? '👑' : '👤'}
                    </div>
                    <div className="conversation-details">
                      <div className="conversation-name-row">
                        <span className="conversation-name">{conv.other_participant_name}</span>
                        {conv.unread_count > 0 && (
                          <span className="unread-badge-small">{conv.unread_count}</span>
                        )}
                      </div>
                      <div className="conversation-meta">
                        <span className="conversation-last-message">{conv.last_message || 'No messages yet'}</span>
                        <span className="conversation-time">{conv.last_message_time ? formatTime(conv.last_message_time) : ''}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}