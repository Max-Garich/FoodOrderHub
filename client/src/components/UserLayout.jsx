import { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PAYMENT_PHONE = '+79028703832';
const PAYMENT_BANK = 'Сбербанк';

export default function UserLayout() {
  const { isAuthenticated, balance, loading } = useAuth();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
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

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <span>🍽️</span>
          <span>FoodOrderHub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '1.25rem' }} onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="balance-display" onClick={() => setShowPaymentModal(true)} style={{ cursor: 'pointer' }}>
            <span>₽{balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

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

      <Outlet />

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <span className="nav-icon">🍽️</span>
          <span>Меню</span>
        </NavLink>
        <NavLink to="/history">
          <span className="nav-icon">📋</span>
          <span>История</span>
        </NavLink>
        <NavLink to="/profile">
          <span className="nav-icon">👤</span>
          <span>Профиль</span>
        </NavLink>
      </nav>
    </>
  );
}
