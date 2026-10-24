import { useState, useEffect } from 'react';
import { adminApi } from '../api.js';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminWorklogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    status: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        adminApi.getWorklogs(filters),
        adminApi.getUsers(),
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ userId: '', startDate: '', endDate: '', status: '' });
  };

  const handleStatusChange = async (logId, newStatus) => {
    try {
      await adminApi.updateWorklogStatus(logId, newStatus);
      setLogs(logs.map(log => log.id === logId ? { ...log, status: newStatus } : log));
    } catch (error) {
      alert(error.message);
    }
  };

  const exportData = async () => {
    try {
      const blob = await adminApi.export(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklogs-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-worklogs">
      <div className="page-header">
        <h1>All Work Logs</h1>
        <button className="btn-secondary" onClick={exportData}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <select name="userId" value={filters.userId} onChange={handleFilterChange}>
            <option value="">All Staff</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
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
          {(filters.userId || filters.startDate || filters.endDate || filters.status) && (
            <button className="btn-secondary" onClick={clearFilters}>Clear</button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        {logs.length === 0 ? (
          <div className="empty-state">No work logs found</div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Staff</th>
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
                  <td>{log.user_name}</td>
                  <td>{formatDate(log.date)}</td>
                  <td className="task-cell">{log.task}</td>
                  <td><span className="hours-badge">{log.hours}h</span></td>
                  <td className="description-cell">{log.description || '-'}</td>
                  <td>
                    <select
                      className={`status-select ${log.status}`}
                      value={log.status}
                      onChange={e => handleStatusChange(log.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {log.status === 'pending' && (
                        <>
                          <button
                            className="btn-icon success"
                            onClick={() => handleStatusChange(log.id, 'approved')}
                            title="Approve"
                          >✅</button>
                          <button
                            className="btn-icon danger"
                            onClick={() => handleStatusChange(log.id, 'rejected')}
                            title="Reject"
                          >❌</button>
                        </>
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