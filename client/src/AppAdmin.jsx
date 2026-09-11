import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, roleHome } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import LoginPage from './pages/user/LoginPage.jsx';
import ManagerPanel from './pages/manager/ManagerPanel.jsx';
import CanteenPanel from './pages/canteen/CanteenPanel.jsx';
import SuperAdminPanel from './pages/admin/SuperAdminPanel.jsx';

import './index.css';

// Адрес основного (пользовательского) сайта — для ссылки «На сайт»
export const APP_URL =
  import.meta.env.VITE_APP_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

const ADMIN_ROLES = ['SUPER_ADMIN', 'CANTEEN_HEAD', 'MANAGER'];

// Экран для тех, кто зашёл в админ-панель без административной роли
function NoAccess() {
  const { logout, user } = useAuth();
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🔒</div>
          <h1>Нет доступа</h1>
          <p>Админ-панель доступна только администрации</p>
        </div>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Вы вошли как {user?.name} {user?.surname} ({user?.role}).
          <br />Заказ обеда — на основном сайте.
        </p>
        <a className="btn btn-primary btn-block btn-lg" href={APP_URL}>Перейти на основной сайт</a>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => { logout(); window.location.href = '/login'; }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
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
    return <NoAccess />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <NoAccess />;
  }
  return children;
}

// Корневой редирект: админ — в свою панель, остальные — на логин/NoAccess
function RootRedirect() {
  const { user, loading, isAuthenticated, isPending } = useAuth();

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }
  if (isAuthenticated && !isPending && ADMIN_ROLES.includes(user?.role)) {
    return <Navigate to={roleHome(user)} replace />;
  }
  if (isAuthenticated) {
    return <NoAccess />;
  }
  return <Navigate to="/login" replace />;
}

// Отдельное приложение админ-панели (собирается в dist-admin, served nginx-контейнером на :3002)
export default function AppAdmin() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Вход */}
            <Route path="/login" element={<LoginPage />} />

            {/* Панель менеджера группы */}
            <Route path="/manager" element={
              <RequireRole roles={['MANAGER', 'SUPER_ADMIN']}>
                <ManagerPanel />
              </RequireRole>
            } />

            {/* Панель главы столовой */}
            <Route path="/canteen" element={
              <RequireRole roles={['CANTEEN_HEAD', 'SUPER_ADMIN']}>
                <CanteenPanel />
              </RequireRole>
            } />

            {/* Панель супер-админа */}
            <Route path="/admin" element={
              <RequireRole roles={['SUPER_ADMIN']}>
                <SuperAdminPanel />
              </RequireRole>
            } />

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
