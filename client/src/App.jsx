import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, roleHome } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import LoginPage from './pages/user/LoginPage.jsx';
import RegisterPage from './pages/user/RegisterPage.jsx';
import PendingPage from './pages/user/PendingPage.jsx';
import MenuPage from './pages/user/MenuPage.jsx';
import HistoryPage from './pages/user/HistoryPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import AdminRedirectPage from './pages/user/AdminRedirectPage.jsx';
import UserLayout from './components/UserLayout.jsx';

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

// Пользовательский сайт FoodOrderHub.
// Админ-панели (супер-админ, глава столовой, менеджер) вынесены
// в отдельное приложение на порту 3002 (см. AppAdmin.jsx).
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

            {/* Панели управления — в отдельной админ-панели (:3002).
                Менеджер на основном сайте = обычный участник своей группы. */}
            <Route path="/manager" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<AdminRedirectPage />} />
            <Route path="/canteen" element={<AdminRedirectPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
