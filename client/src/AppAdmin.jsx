import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, roleHome } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { mainSiteUrl } from './utils/adminUrl.js';

import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import ManagerPanel from './pages/manager/ManagerPanel.jsx';
import CanteenPanel from './pages/canteen/CanteenPanel.jsx';
import SuperAdminPanel from './pages/admin/SuperAdminPanel.jsx';

import './index.css';

// Экран «нет доступа» для не-админов, заглянувших в админ-панель
function NoAccess({ title = 'Нет доступа', message }) {
  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo">
          <div className="logo-icon">🔒</div>
          <h1>{title}</h1>
        </div>
        <p className="text-muted" style={{ marginBottom: 20 }}>
          {message || 'Эта панель доступна только администраторам, главе столовой и менеджерам групп.'}
        </p>
        <a className="btn btn-primary btn-block" href={mainSiteUrl('/')}>
          Перейти на основной сайт
        </a>
      </div>
    </div>
  );
}

// Корень админ-панели: админа отправляем на его панель, остальных — на NoAccess
function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.status === 'PENDING') {
    return <NoAccess title="Заявка на рассмотрении" message="Ваш аккаунт ещё не подтверждён. Ожидайте, пока администратор примет заявку." />;
  }
  if (user && ['SUPER_ADMIN', 'CANTEEN_HEAD', 'MANAGER'].includes(user.role)) {
    return <Navigate to={roleHome(user)} replace />;
  }
  return <NoAccess />;
}

// Wrapper: требует авторизацию, ACTIVE-статус и одну из ролей
function RequireRole({ roles, children }) {
  const { user, loading, isAuthenticated, isPending } = useAuth();

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (isPending) {
    return <NoAccess title="Заявка на рассмотрении" message="Ваш аккаунт ещё не подтверждён. Ожидайте, пока администратор примет заявку." />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <NoAccess />;
  }
  return children;
}

export default function AppAdmin() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Вход в админ-панель */}
            <Route path="/login" element={<AdminLoginPage />} />

            {/* Панель супер-админа */}
            <Route path="/admin" element={
              <RequireRole roles={['SUPER_ADMIN']}>
                <SuperAdminPanel />
              </RequireRole>
            } />

            {/* Панель главы столовой */}
            <Route path="/canteen" element={
              <RequireRole roles={['CANTEEN_HEAD', 'SUPER_ADMIN']}>
                <CanteenPanel />
              </RequireRole>
            } />

            {/* Панель менеджера группы */}
            <Route path="/manager" element={
              <RequireRole roles={['MANAGER', 'SUPER_ADMIN']}>
                <ManagerPanel />
              </RequireRole>
            } />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
