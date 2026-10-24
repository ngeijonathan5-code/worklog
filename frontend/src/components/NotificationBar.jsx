import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeIcon(type) {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return 'ℹ️';
  }
}

export default function NotificationBar() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, createNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    recipientId: '',
    title: '',
    message: '',
    type: 'info',
    isGlobal: false,
  });
  const [composeLoading, setComposeLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const dropdownRef = useRef(null);

  // Fetch users for admin compose
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await fetch('/api/notifications/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (data.ok) {
          const userList = await data.json();
          setUsers(userList);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleComposeSubmit = async (e) => {
    e.preventDefault();
    if (!composeData.title.trim() || !composeData.message.trim()) return;
    if (!composeData.isGlobal && !composeData.recipientId) {
      alert('Please select a recipient or choose global notification');
      return;
    }

    setComposeLoading(true);
    try {
      await createNotification({
        recipientId: composeData.isGlobal ? undefined : parseInt(composeData.recipientId),
        title: composeData.title,
        message: composeData.message,
        type: composeData.type,
        isGlobal: composeData.isGlobal,
      });
      setShowCompose(false);
      setComposeData({ recipientId: '', title: '', message: '', type: 'info', isGlobal: false });
    } catch (error) {
      alert(error.message);
    } finally {
      setComposeLoading(false);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="notification-bar" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        className={`notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button className="mark-all-read" onClick={markAllAsRead}>Mark all read</button>
              )}
              <button className="compose-btn" onClick={() => setShowCompose(true)}>Compose</button>
            </div>
          </div>

          {/* Compose Form */}
          {showCompose && (
            <form className="compose-form" onSubmit={handleComposeSubmit}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={composeData.isGlobal}
                    onChange={(e) => setComposeData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                  />
                  Send to all users (Global)
                </label>
              </div>
              {!composeData.isGlobal && users.length > 0 && (
                <div className="form-group">
                  <label>
                    Recipient:
                    <select
                      value={composeData.recipientId}
                      onChange={(e) => setComposeData(prev => ({ ...prev, recipientId: e.target.value }))}
                      required
                    >
                      <option value="">Select recipient</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Title"
                  value={composeData.title}
                  onChange={(e) => setComposeData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Message"
                  value={composeData.message}
                  onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Type:
                  <select
                    value={composeData.type}
                    onChange={(e) => setComposeData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </label>
              </div>
              <div className="compose-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={composeLoading}>
                  {composeLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          )}

          {/* Notifications List */}
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">No notifications yet</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${notification.type}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="notification-icon">{getTypeIcon(notification.type)}</div>
                  <div className="notification-content">
                    <div className="notification-title-row">
                      <span className="notification-title">{notification.title}</span>
                      <span className="notification-time">{formatDate(notification.created_at)}</span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    <div className="notification-meta">
                      <span className="notification-sender">From: {notification.sender_name}</span>
                      {notification.is_global && <span className="global-badge">Global</span>}
                    </div>
                  </div>
                  {!notification.is_read && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}