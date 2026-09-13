import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/index.js';
import { useAuth, roleHome } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

// Вход в админ-панель (отдельный сайт на порту 3002).
// Отличается от пользовательского логина: нет ссылки на регистрацию.
export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      login(data);
      if (remember) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      const home = roleHome(data.user);
      // Не-админам в админ-панели показываем «Нет доступа» (корень)
      navigate(['SUPER_ADMIN', 'CANTEEN_HEAD', 'MANAGER'].includes(data.user.role) ? home : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page login-page-admin">
      <ThemeToggle style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }} />
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon"><img src="/logo.png" alt="Логотип Ирбитского политехникума" /></div>
          <h1>Админ-панель</h1>
          <p>foodIPThub · управление системой</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>Пароль</label>
            <input
              className="input"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="remember-me">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember">Запомнить меня</label>
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
