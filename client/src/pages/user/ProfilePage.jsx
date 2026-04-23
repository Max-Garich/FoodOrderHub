import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { userApi } from '../../api/index.js';

const PAYMENT_PHONE = '+79028703832';
const PAYMENT_BANK = 'Сбербанк';

export default function ProfilePage() {
  const { user, balance, logout, refreshBalance } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
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

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_PHONE.replace(/[^\d+]/g, ''));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = PAYMENT_PHONE.replace(/[^\d+]/g, '');
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>👤 Профиль</h2>

      <div className="profile-balance-card">
        <div className="profile-balance-label">Ваш баланс</div>
        <div className="profile-balance-amount">
          ₽{balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
        </div>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: 12 }}
          onClick={() => setShowPaymentModal(true)}
        >
          Пополнить баланс
        </button>
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

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal-center payment-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', margin: 0 }}>Пополнение баланса</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '12px 0 20px' }}>
              Чтобы оплатить обеды, переведите деньги:
            </p>
            <button className="copy-btn" onClick={copyPhone}>
              {copySuccess ? '✓ Скопировано!' : `📋 ${PAYMENT_PHONE}`}
            </button>
            <div className="payment-bank-box">
              <span className="payment-bank-label">Банк</span>
              <span className="payment-bank-value">{PAYMENT_BANK}</span>
            </div>
            <p className="payment-note">
              После перевода сообщите администратору для зачисления на баланс
            </p>
            <button className="btn btn-primary" onClick={() => setShowPaymentModal(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
