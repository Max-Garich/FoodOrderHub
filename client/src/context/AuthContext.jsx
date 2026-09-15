import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Подгружаем актуальный профиль (роль/статус/баланс) при наличии токена
  useEffect(() => {
    let cancelled = false;
    if (token) {
      userApi.profile()
        .then((profile) => {
          if (cancelled) return;
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [token]);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await userApi.profile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      return profile;
    } catch (e) {
      return null;
    }
  }, []);

  const isAuthenticated = !!token;
  const isPending = user?.status === 'PENDING';
  // Менеджер-препод (managerIsTeacher) — без баланса, как преподаватель
  const balance = (user?.role === 'TEACHER' || user?.managerIsTeacher) ? null : (user?.balance ?? null);

  return (
    <AuthContext.Provider value={{
      user, token, balance, loading,
      login, logout, refreshProfile,
      isAuthenticated, isPending,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Домашний маршрут по роли
export function roleHome(user) {
  if (!user) return '/login';
  if (user.status === 'PENDING') return '/pending';
  switch (user.role) {
    case 'SUPER_ADMIN': return '/admin';
    case 'CANTEEN_HEAD': return '/canteen';
    case 'MANAGER': return '/manager';
    default: return '/';
  }
}
