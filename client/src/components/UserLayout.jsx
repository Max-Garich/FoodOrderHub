import { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth, roleHome } from '../context/AuthContext.jsx';
import { orderApi } from '../api/index.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function UserLayout() {
  const { user, balance, loading, isAuthenticated, isPending } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [todaySpent, setTodaySpent] = useState(0);

  const isTeacher = user?.role === 'TEACHER';
  const group = user?.group || null;
  const paymentPhone = group?.paymentPhone || '';
  const paymentBank = group?.paymentBank || '';

  // Для препода: сумма заказов сегодня
  useEffect(() => {
    if (!isTeacher || !isAuthenticated) return;
    const today = new Date().toISOString().split('T')[0];
    orderApi.history(today)
      .then((orders) => setTodaySpent(orders.reduce((s, o) => s + o.totalAmount, 0)))
      .catch(() => {});
  }, [isTeacher, isAuthenticated]);

  const copyPhone = async () => {
    if (!paymentPhone) return;
    const digits = paymentPhone.replace(/[^\d+]/g, '');
    try {
      await navigator.clipboard.writeText(digits);
    } catch {
      const input = document.createElement('input');
      input.value = digits;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isPending) {
    return <Navigate to="/pending" replace />;
  }

  // Глава столовой / супер-админ не имеют юзерских страниц
  if (user && !['USER', 'TEACHER', 'MANAGER'].includes(user.role)) {
    return <Navigate to={roleHome(user)} replace />;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <span>🍽️</span>
          <span>FoodOrderHub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
          {isTeacher ? (
            <div className="balance-display" style={{
              border: '2px solid var(--primary)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              background: 'var(--primary-bg)',
            }}>
              <span>Заказано: ₽{todaySpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <div
              className="balance-display"
              onClick={() => group && setShowPaymentModal(true)}
              style={{
                cursor: group ? 'pointer' : 'default',
                border: '2px solid var(--primary)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                background: 'var(--primary-bg)',
              }}
            >
              <span>₽{(balance ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && group && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal-center payment-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center', margin: 0 }}>Пополнение баланса</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '12px 0 20px' }}>
              Чтобы оплатить обеды, переведите деньги:
            </p>
            <button className="copy-btn" onClick={copyPhone}>
              {copySuccess ? 'Скопировано' : paymentPhone}
            </button>
            <div className="payment-bank-box">
              <span className="payment-bank-label">Банк</span>
              <span className="payment-bank-value">{paymentBank}</span>
            </div>
            <p className="payment-note">
              После перевода сообщите менеджеру группы для зачисления на баланс
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
          <span>Меню</span>
        </NavLink>
        <NavLink to="/history">
          <span>История</span>
        </NavLink>
        <NavLink to="/profile">
          <span>Профиль</span>
        </NavLink>
        {user?.role === 'MANAGER' && (
          <a href={`${window.location.protocol}//${window.location.hostname}:3002/manager`}>
            <span>Управление</span>
          </a>
        )}
      </nav>
    </>
  );
}
