import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBar from './NotificationBar';
import MessagesPanel from './MessagesPanel';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/worklog', label: 'Work Log', icon: '📝' },
    { path: '/history', label: 'History', icon: '📋' },
  ];

  const adminNavItems = [
    { path: '/admin', label: 'Admin Dashboard', icon: '👑' },
    { path: '/admin/worklogs', label: 'All Work Logs', icon: '📋' },
    { path: '/admin/users', label: 'Manage Users', icon: '👥' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>WorkLog</h1>
          <span className="user-role">{user?.role}</span>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
            {user?.role === 'admin' && (
              <>
                <li className="nav-divider"><span>ADMIN TOOLS</span></li>
                {adminNavItems.map(item => (
                  <li key={item.path}>
                    <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </>
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <MessagesPanel />
            <NotificationBar />
          </div>
          <div className="top-bar-right">
            <h2>{user?.name}</h2>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}