import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/index.js';
import { useAdminAuth } from '../../context/AuthContext.jsx';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.adminLogin({ email, password });
      login(data);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ background: 'linear-gradient(150deg, #E8F0FE 0%, #F0F0F5 100%)' }}>
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">⚙️</div>
          <h1>Админ-панель</h1>
          <p>FoodOrderHub</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email администратора</label>
            <input
              className="input"
              type="email"
              placeholder="admin@foodorderhub.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
          <button className="btn btn-accent btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти как администратор'}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: 16 }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            ← Вход для пользователей
          </Link>
        </div>
      </div>
    </div>
  );
}
