import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { worklogApi } from '../api.js';

export default function WorkLogPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    task: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch existing log if editing
  useEffect(() => {
    if (isEditing) {
      const fetchLog = async () => {
        setLoading(true);
        try {
          const log = await worklogApi.get(id);
          setFormData({
            date: log.date,
            hours: log.hours,
            task: log.task,
            description: log.description || '',
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchLog();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const data = {
        date: formData.date,
        hours: parseFloat(formData.hours),
        task: formData.task,
        description: formData.description,
      };

      if (isEditing) {
        await worklogApi.update(id, data);
      } else {
        await worklogApi.create(data);
      }
      navigate('/history');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this work log?')) return;
    try {
      await worklogApi.delete(id);
      navigate('/history');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="worklog-page">
      <div className="page-header">
        <h1>{isEditing ? 'Edit Work Log' : 'Log Work Hours'}</h1>
        <p>{isEditing ? 'Update your work log entry' : 'Record your hours for today'}</p>
      </div>

      <form onSubmit={handleSubmit} className="worklog-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              disabled={isEditing}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hours">Hours *</label>
            <input
              id="hours"
              name="hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={formData.hours}
              onChange={handleChange}
              required
              placeholder="e.g., 8"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="task">Task *</label>
          <input
            id="task"
            name="task"
            type="text"
            value={formData.task}
            onChange={handleChange}
            required
            placeholder="What did you work on?"
            maxLength="200"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe what you accomplished..."
            maxLength="1000"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/history')}>
            Cancel
          </button>
          {isEditing && formData.status !== 'approved' && (
            <button type="button" className="btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (isEditing ? 'Update' : 'Save Work Log')}
          </button>
        </div>
      </form>
    </div>
  );
}