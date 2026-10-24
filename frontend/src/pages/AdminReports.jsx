import { useState, useEffect } from 'react';
import { adminApi } from '../api.js';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getStats(dateRange);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const exportData = async () => {
    try {
      const blob = await adminApi.export(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklogs-report-${dateRange.startDate || 'all'}-to-${dateRange.endDate || 'now'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-reports">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportData}>📥 Export CSV</button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="filters-bar">
        <div className="filter-group">
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            placeholder="From"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            placeholder="To"
          />
          {(dateRange.startDate || dateRange.endDate) && (
            <button className="btn-secondary" onClick={() => setDateRange({ startDate: '', endDate: '' })}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
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
            <span className="stat-value">
              {stats?.hoursByUser?.reduce((sum, u) => sum + u.total_hours, 0).toFixed(1) || 0}h
            </span>
            <span className="stat-label">Total Approved Hours</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">
              {stats?.hoursByUser?.reduce((sum, u) => sum + u.log_count, 0) || 0}
            </span>
            <span className="stat-label">Total Log Entries</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.pendingCount || 0}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
      </div>

      {/* Hours by User */}
      <div className="dashboard-section">
        <h2>Hours by Staff Member</h2>
        <div className="table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Email</th>
                <th>Total Hours</th>
                <th>Log Entries</th>
                <th>Avg Hours/Entry</th>
              </tr>
            </thead>
            <tbody>
              {stats?.hoursByUser?.map((user, index) => (
                <tr key={index}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className="hours-badge">{user.total_hours.toFixed(1)}h</span></td>
                  <td>{user.log_count}</td>
                  <td>{(user.total_hours / user.log_count).toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hours by Date Chart */}
      {stats?.hoursByDate?.length > 0 && (
        <div className="dashboard-section">
          <h2>Hours by Date</h2>
          <div className="chart-container">
            {stats.hoursByDate.slice(-30).map((day, index) => (
              <div key={index} className="chart-bar">
                <div className="chart-bar-label">{formatDate(day.date)}</div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${Math.min((day.total_hours / (stats.hoursByDate.reduce((max, d) => Math.max(max, d.total_hours), 0) || 1)) * 100, 100)}%`
                    }}
                  >
                    {day.total_hours.toFixed(1)}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {stats?.statusBreakdown?.length > 0 && (
        <div className="dashboard-section">
          <h2>Status Breakdown</h2>
          <div className="status-breakdown">
            {stats.statusBreakdown.map((item, index) => (
              <div key={index} className={`status-item ${item.status}`}>
                <span className="status-label">{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                <span className="status-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}