import { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AuthContext.jsx';

export default function AdminLayout() {
  const { isAuthenticated } = useAdminAuth();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
           <span>⚙️</span>
          <span>Admin Panel</span>
        </div>
        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '1.25rem' }} onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <Outlet />

      <nav className="bottom-nav">
        <NavLink to="/admin" end>
          <span className="nav-icon">🏠</span>
          <span>Главная</span>
        </NavLink>
        <NavLink to="/admin/menu">
          <span className="nav-icon">📋</span>
          <span>Меню</span>
        </NavLink>
        <NavLink to="/admin/users">
          <span className="nav-icon">👥</span>
          <span>Пользователи</span>
        </NavLink>
        <NavLink to="/admin/reports">
          <span className="nav-icon">📊</span>
          <span>Отчёты</span>
        </NavLink>
      </nav>
    </>
  );
}
