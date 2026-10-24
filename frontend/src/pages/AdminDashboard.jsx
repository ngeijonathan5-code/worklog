import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api.js';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, logsData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getWorklogs({ limit: 10 }),
        ]);
        setStats(statsData);
        setRecentLogs(logsData);
        setPendingCount(logsData.filter(l => l.status === 'pending').length);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>System overview and quick actions</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.hoursByUser?.length || 0}</span>
            <span className="stat-label">Active Staff</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.hoursByUser?.reduce((sum, u) => sum + u.total_hours, 0).toFixed(1) || 0}</span>
            <span className="stat-label">Total Approved Hours</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending Reviews</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{recentLogs.length}</span>
            <span className="stat-label">Recent Logs</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/admin/worklogs" className="action-card">
            <span className="action-icon">✅</span>
            <h3>Review Pending Logs</h3>
            <p>{pendingCount} logs awaiting approval</p>
          </Link>
          <Link to="/admin/users" className="action-card">
            <span className="action-icon">👥</span>
            <h3>Manage Users</h3>
            <p>Add or edit staff accounts</p>
          </Link>
          <Link to="/admin/reports" className="action-card">
            <span className="action-icon">📈</span>
            <h3>View Reports</h3>
            <p>Team analytics & exports</p>
          </Link>
          <Link to="/admin/worklogs" className="action-card">
            <span className="action-icon">📋</span>
            <h3>All Work Logs</h3>
            <p>View and manage all entries</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Work Logs</h2>
          <Link to="/admin/worklogs" className="btn-secondary">View All</Link>
        </div>
        <div className="table-container">
          {recentLogs.length === 0 ? (
            <div className="empty-state">No work logs yet</div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Staff</th>
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
                    <td>{log.user_name}</td>
                    <td>{formatDate(log.date)}</td>
                    <td className="task-cell">{log.task}</td>
                    <td><span className="hours-badge">{log.hours}h</span></td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {log.status === 'pending' && (
                        <div className="action-buttons">
                          <button
                            className="btn-icon success"
                            onClick={async () => {
                              await adminApi.updateWorklogStatus(log.id, 'approved');
                              const updated = recentLogs.map(l => l.id === log.id ? { ...l, status: 'approved' } : l);
                              setRecentLogs(updated);
                              setPendingCount(c => c - 1);
                            }}
                            title="Approve"
                          >✅</button>
                          <button
                            className="btn-icon danger"
                            onClick={async () => {
                              if (confirm('Reject this log?')) {
                                await adminApi.updateWorklogStatus(log.id, 'rejected');
                                const updated = recentLogs.map(l => l.id === log.id ? { ...l, status: 'rejected' } : l);
                                setRecentLogs(updated);
                                setPendingCount(c => c - 1);
                              }
                            }}
                            title="Reject"
                          >❌</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Hours by User Chart */}
      {stats?.hoursByUser?.length > 0 && (
        <div className="dashboard-section">
          <h2>Hours by Staff (Approved)</h2>
          <div className="chart-container">
            {stats.hoursByUser.map((user, index) => (
              <div key={index} className="chart-bar">
                <div className="chart-bar-label">{user.name}</div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${Math.min((user.total_hours / (stats.hoursByUser[0]?.total_hours || 1)) * 100, 100)}%` }}
                  >
                    {user.total_hours.toFixed(1)}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}