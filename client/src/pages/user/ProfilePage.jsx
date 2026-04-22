import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { userApi } from '../../api/index.js';

export default function ProfilePage() {
  const { user, balance, logout, refreshBalance } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    refreshBalance();
    userApi.balanceHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>👤 Профиль</h2>

      <div className="profile-balance-card">
        <div className="profile-balance-label">Ваш баланс</div>
        <div className="profile-balance-amount">
          ₽{balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
        </div>
        <div className="profile-balance-note">
          Для пополнения обратитесь к администратору
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>{user?.name}</h3>
        <p className="text-sm text-muted">{user?.email}</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>📊 История баланса</h3>
        {loading ? (
          <div className="loader"><div className="spinner"></div></div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">Нет операций</p>
        ) : (
          history.slice(0, 20).map((item) => (
            <div className="bh-item" key={item.id}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {item.type === 'topup' ? 'Пополнение' : 'Заказ'}
                </div>
                <div className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              <div className={`bh-amount ${item.amount > 0 ? 'positive' : 'negative'}`}>
                {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})} ₽
              </div>
            </div>
          ))
        )}
      </div>

      <button
        className="btn btn-outline btn-block"
        style={{ marginTop: 20 }}
        onClick={handleLogout}
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}
