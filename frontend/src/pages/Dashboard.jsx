import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { worklogApi, adminApi, notificationApi } from '../api.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [todayLog, setTodayLog] = useState(null);
  const [stats, setStats] = useState({ totalHours: 0, pendingLogs: 0, approvedLogs: 0 });
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get today's log
        const logs = await worklogApi.list({ startDate: today, endDate: today });
        setTodayLog(logs[0] || null);

        // Get stats for current user
        const allLogs = await worklogApi.list();
        const totalHours = allLogs.reduce((sum, log) => sum + log.hours, 0);
        const pendingLogs = allLogs.filter(log => log.status === 'pending').length;
        const approvedLogs = allLogs.filter(log => log.status === 'approved').length;
        setStats({ totalHours, pendingLogs, approvedLogs });
        
        // Get recent logs (last 5)
        setRecentLogs(allLogs.slice(0, 5));

        // Get admin stats if admin
        if (user?.role === 'admin') {
          const statsData = await adminApi.getStats();
          setAdminStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.role]);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Cards - Different layout for staff vs admin */}
      <div className="stats-grid">
        {user?.role === 'staff' && (
          <>
            {/* Large total hours card for staff */}
            <div className="stat-card total-hours-card">
              <div className="stat-icon-large">⏱️</div>
              <div className="stat-info">
                <span className="stat-value-large">{stats.totalHours.toFixed(1)}</span>
                <span className="stat-label">Total Hours Logged</span>
                <span className="stat-subtitle">Auto-calculated from all entries</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-value">{stats.approvedLogs}</span>
                <span className="stat-label">Approved Entries</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <span className="stat-value">{stats.pendingLogs}</span>
                <span className="stat-label">Pending Review</span>
              </div>
            </div>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <span className="stat-value">{adminStats?.hoursByUser?.length || 0}</span>
                <span className="stat-label">Active Staff</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-info">
                <span className="stat-value">{adminStats?.hoursByUser?.reduce((sum, u) => sum + u.total_hours, 0).toFixed(1) || 0}</span>
                <span className="stat-label">Total Approved Hours</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <span className="stat-value">{adminStats?.pendingCount || 0}</span>
                <span className="stat-label">Pending Reviews</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <span className="stat-value">{recentLogs.length}</span>
                <span className="stat-label">Recent Entries</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Today's Log */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Today's Work Log</h2>
          {todayLog ? (
            <span className={`status-badge ${todayLog.status}`}>{todayLog.status}</span>
          ) : (
            <Link to="/worklog" className="btn-primary">Log Hours</Link>
          )}
        </div>
        {todayLog ? (
          <div className="today-log-card">
            <div className="log-header">
              <h3>{todayLog.task}</h3>
              <span className="log-hours">{todayLog.hours}h</span>
            </div>
            <p className="log-description">{todayLog.description || 'No description'}</p>
            <div className="log-meta">
              <span>Status: <strong>{todayLog.status}</strong></span>
              <span>Date: {todayLog.date}</span>
            </div>
            {todayLog.status === 'pending' && (
              <Link to="/worklog" className="btn-secondary">Edit Log</Link>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>No work log for today yet.</p>
            <Link to="/worklog" className="btn-primary">Create Work Log</Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>{user?.role === 'admin' ? 'Recent Team Activity' : 'Your Recent Logs'}</h2>
          <Link to={user?.role === 'admin' ? '/admin/worklogs' : '/history'} className="btn-secondary">View All</Link>
        </div>
        <div className="table-container">
          {recentLogs.length === 0 ? (
            <div className="empty-state">
              <p>No work logs yet.</p>
              <Link to="/worklog" className="btn-primary">Create Your First Log</Link>
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  {user?.role === 'admin' && <th>Staff</th>}
                  <th>Date</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(log => (
                  <tr key={log.id}>
                    {user?.role === 'admin' && <td>{log.user_name}</td>}
                    <td>{new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="task-cell">{log.task}</td>
                    <td><span className="hours-badge">{log.hours}h</span></td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {log.status === 'pending' && (
                          <>
                            {user?.role === 'staff' && (
                              <Link to={`/worklog/${log.id}`} className="btn-icon" title="Edit">✏️</Link>
                            )}
                            {user?.role === 'admin' && (
                              <>
                                <button
                                  className="btn-icon success"
                                  onClick={async () => {
                                    await adminApi.updateWorklogStatus(log.id, 'approved');
                                    setRecentLogs(recentLogs.map(l => l.id === log.id ? { ...l, status: 'approved' } : l));
                                  }}
                                  title="Approve"
                                >✅</button>
                                <button
                                  className="btn-icon danger"
                                  onClick={async () => {
                                    if (confirm('Reject this log?')) {
                                      await adminApi.updateWorklogStatus(log.id, 'rejected');
                                      setRecentLogs(recentLogs.map(l => l.id === log.id ? { ...l, status: 'rejected' } : l));
                                    }
                                  }}
                                  title="Reject"
                                >❌</button>
                              </>
                            )}
                          </>
                        )}
                        {log.status !== 'pending' && (
                          <span className="locked" title="Cannot edit approved/rejected logs">🔒</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/worklog" className="action-card">
            <span className="action-icon">📝</span>
            <h3>Log Work Hours</h3>
            <p>Record today's work</p>
          </Link>
          <Link to="/history" className="action-card">
            <span className="action-icon">📋</span>
            <h3>View History</h3>
            <p>See all your logs</p>
          </Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/worklogs" className="action-card">
                <span className="action-icon">✅</span>
                <h3>Review Logs</h3>
                <p>Approve pending logs</p>
              </Link>
              <Link to="/admin/reports" className="action-card">
                <span className="action-icon">📈</span>
                <h3>View Reports</h3>
                <p>Team analytics</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}