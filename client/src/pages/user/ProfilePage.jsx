import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { userApi, orderApi } from '../../api/index.js';

export default function ProfilePage() {
  const { user, balance, logout, refreshProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [todaySpent, setTodaySpent] = useState(0);
  const navigate = useNavigate();

  const isTeacher = user?.role === 'TEACHER';
  const hasBalance = !isTeacher && balance !== null;
  const group = user?.group || null;
  const paymentPhone = group?.paymentPhone || '';
  const paymentBank = group?.paymentBank || '';

  useEffect(() => {
    refreshProfile();
    if (isTeacher) {
      // Препод: сумма заказов сегодня + без истории баланса
      const today = new Date().toISOString().split('T')[0];
      orderApi.history(today)
        .then((orders) => setTodaySpent(orders.reduce((s, o) => s + o.totalAmount, 0)))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      userApi.balanceHistory()
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Профиль</h2>

      {/* Карточка баланса — только для юзеров с балансом */}
      {hasBalance ? (
        <div className="profile-balance-card">
          <div className="profile-balance-label">Ваш баланс</div>
          <div className="profile-balance-amount">
            ₽{(balance ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
          </div>
        </div>
      ) : isTeacher ? (
        <div className="profile-balance-card">
          <div className="profile-balance-label">Заказано сегодня</div>
          <div className="profile-balance-amount">
            ₽{todaySpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
          </div>
        </div>
      ) : null}

      {/* Пополнение — только для юзеров с балансом и группой */}
      {hasBalance && group && (
        <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
          <h3 style={{ marginBottom: 8 }}>Пополнение баланса</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: '0.9rem' }}>
            Переведите деньги и сообщите менеджеру группы
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => setShowPaymentModal(true)}
          >
            Пополнить
          </button>
        </div>
      )}

      {/* Данные профиля — только чтение */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="summary-row">
          <span className="text-muted">Имя</span>
          <span style={{ fontWeight: 600 }}>{user?.name}</span>
        </div>
        <div className="summary-row">
          <span className="text-muted">Фамилия</span>
          <span style={{ fontWeight: 600 }}>{user?.surname}</span>
        </div>
        {isTeacher && user?.position && (
          <div className="summary-row">
            <span className="text-muted">Должность</span>
            <span style={{ fontWeight: 600 }}>{user.position}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="text-muted">Email</span>
          <span style={{ fontWeight: 600 }}>{user?.email}</span>
        </div>
        <div className="summary-row">
          <span className="text-muted">Группа</span>
          <span style={{ fontWeight: 600 }}>{group ? group.name : (isTeacher ? 'Преподаватель' : '—')}</span>
        </div>
      </div>

      {/* История баланса — только для юзеров с балансом */}
      {hasBalance && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>История баланса</h3>
          {loading ? (
            <div className="loader"><div className="spinner"></div></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted">Нет операций</p>
          ) : (
            history.slice(0, 20).map((item) => (
              <div className="bh-item" key={item.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {item.type === 'topup' ? 'Пополнение' : item.type === 'order_adjust' ? 'Корректировка' : 'Заказ'}
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
      )}

      <button
        className="btn btn-outline btn-block"
        style={{ marginTop: 20 }}
        onClick={handleLogout}
      >
        Выйти из аккаунта
      </button>

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
    </div>
  );
}
