import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(name, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>📊 WorkLog</h1>
          <p>Staff Work Log & Admin System</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="demo-accounts">
          <h3>Demo Accounts</h3>
          <div className="demo-grid">
            <button
              type="button"
              className="demo-btn"
              onClick={() => { setName('jonathan'); setPassword('1027'); }}
            >
              <strong>Admin</strong><br />
              jonathan / 1027
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => { setName('John Staff'); setPassword('staff123'); }}
            >
              <strong>Staff</strong><br />
              John Staff / staff123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}