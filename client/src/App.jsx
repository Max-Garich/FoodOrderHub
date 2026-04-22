import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminAuthProvider } from './context/AuthContext.jsx';

import LoginPage from './pages/user/LoginPage.jsx';
import RegisterPage from './pages/user/RegisterPage.jsx';
import MenuPage from './pages/user/MenuPage.jsx';
import HistoryPage from './pages/user/HistoryPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import UserLayout from './components/UserLayout.jsx';

import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminMenu from './pages/admin/AdminMenu.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* User */}
            <Route element={<UserLayout />}>
              <Route path="/" element={<MenuPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/menu" element={<AdminMenu />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/reports" element={<AdminReports />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
