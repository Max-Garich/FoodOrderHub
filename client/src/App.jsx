import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, roleHome } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import LoginPage from './pages/user/LoginPage.jsx';
import RegisterPage from './pages/user/RegisterPage.jsx';
import PendingPage from './pages/user/PendingPage.jsx';
import MenuPage from './pages/user/MenuPage.jsx';
import HistoryPage from './pages/user/HistoryPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import UserLayout from './components/UserLayout.jsx';

import ManagerPanel from './pages/manager/ManagerPanel.jsx';
import CanteenPanel from './pages/canteen/CanteenPanel.jsx';
import SuperAdminPanel from './pages/admin/SuperAdminPanel.jsx';

import './index.css';

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
    return <Navigate to="/pending" replace />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={roleHome(user)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Публичные */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Ожидание приёма заявки */}
            <Route path="/pending" element={<PendingPage />} />

            {/* Юзерские страницы (USER, TEACHER, MANAGER) */}
            <Route element={
              <RequireRole roles={['USER', 'TEACHER', 'MANAGER']}>
                <UserLayout />
              </RequireRole>
            }>
              <Route path="/" element={<MenuPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
