import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { worklogApi } from '../api.js';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await worklogApi.list(filters);
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', status: '' });
  };

  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const approvedHours = logs.filter(l => l.status === 'approved').reduce((sum, log) => sum + log.hours, 0);
  const pendingHours = logs.filter(l => l.status === 'pending').reduce((sum, log) => sum + log.hours, 0);

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Work Log History</h1>
        <Link to="/worklog" className="btn-primary">+ New Log</Link>
      </div>

      {/* Summary Stats */}
      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-value">{totalHours.toFixed(1)}h</span>
          <span className="summary-label">Total Hours</span>
        </div>
        <div className="summary-card approved">
          <span className="summary-value">{approvedHours.toFixed(1)}h</span>
          <span className="summary-label">Approved</span>
        </div>
        <div className="summary-card pending">
          <span className="summary-value">{pendingHours.toFixed(1)}h</span>
          <span className="summary-label">Pending</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{logs.length}</span>
          <span className="summary-label">Total Entries</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            placeholder="From"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            placeholder="To"
          />
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {filters.startDate || filters.endDate || filters.status ? (
            <button className="btn-secondary" onClick={clearFilters}>Clear</button>
          ) : null}
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <p>No work logs found.</p>
            <Link to="/worklog" className="btn-primary">Create Your First Log</Link>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task</th>
                <th>Hours</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.date)}</td>
                  <td className="task-cell">{log.task}</td>
                  <td><span className="hours-badge">{log.hours}h</span></td>
                  <td className="description-cell">{log.description || '-'}</td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {log.status === 'pending' && (
                        <>
                          <Link to={`/worklog/${log.id}`} className="btn-icon" title="Edit">✏️</Link>
                          <button
                            className="btn-icon danger"
                            onClick={async () => {
                              if (confirm('Delete this log?')) {
                                await worklogApi.delete(log.id);
                                fetchLogs();
                              }
                            }}
                            title="Delete"
                          >🗑️</button>
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
  );
}