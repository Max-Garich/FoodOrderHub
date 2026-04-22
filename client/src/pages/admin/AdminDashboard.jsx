import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/index.js';
import { useAdminAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [summary, setSummary] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSession = useCallback(async () => {
    try {
      const data = await adminApi.currentSession();
      setSessionData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await adminApi.startSession();
      showToast('🟢 Приём заказов начат!');
      loadSession();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Закончить приём заказов?')) return;
    setActionLoading(true);
    try {
      const data = await adminApi.stopSession();
      setSummary(data);
      showToast('🔴 Приём заказов завершён');
      loadSession();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="page page-admin"><div className="loader"><div className="spinner"></div></div></div>;
  }

  const isActive = sessionData?.isActive;
  const stats = sessionData?.stats;
  const menuCount = sessionData?.session?.dailyMenus?.length || 0;

  return (
    <div className="page page-admin">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <h2>🏠 Панель управления</h2>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Выйти</button>
      </div>

      {/* Status */}
      <div className={`status-banner ${isActive ? 'open' : 'closed'}`}>
        {isActive ? '🟢 Заказы принимаются' : '🔴 Заказы закрыты'}
      </div>

      {/* Stats */}
      {isActive && stats && (
        <div className="admin-stat-grid">
          <div className="card admin-stat">
            <div className="admin-stat-value">{stats.orderCount}</div>
            <div className="admin-stat-label">Заказов</div>
          </div>
          <div className="card admin-stat">
            <div className="admin-stat-value">₽{stats.totalRevenue?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
            <div className="admin-stat-label">Выручка</div>
          </div>
        </div>
      )}

      {/* Menu info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>📋 Меню на сегодня</h3>
            <p className="text-sm text-muted">{menuCount} позиций</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/menu')}>
            Редактировать →
          </button>
        </div>
      </div>

      {/* Action buttons */}
      {isActive ? (
        <button
          className="btn btn-danger big-action-btn"
          onClick={handleStop}
          disabled={actionLoading}
        >
          {actionLoading ? 'Завершение...' : '🔴 ЗАКОНЧИТЬ ЗАКАЗЫ'}
        </button>
      ) : (
        <button
          className="btn btn-success big-action-btn"
          onClick={handleStart}
          disabled={actionLoading}
        >
          {actionLoading ? 'Запуск...' : '🟢 НАЧАТЬ ЗАКАЗЫ'}
        </button>
      )}

      {/* Summary after stop */}
      {summary && (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ marginBottom: 16 }}>📊 Сводка дня</h2>

          <div className="summary-total">
            <div className="summary-total-label">Общая выручка</div>
            <div className="summary-total-value">₽{summary.totalRevenue?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
            <div className="summary-total-label">Заказов: {summary.totalOrders}</div>
          </div>

          {summary.dishes?.length > 0 && (
            <div className="summary-section">
              <h3>🍽️ По блюдам</h3>
              <div className="card">
                {summary.dishes.map((d, i) => (
                  <div className="summary-row" key={i}>
                    <span>{d.name}</span>
                    <span style={{ fontWeight: 600 }}>{d.totalQuantity} порц.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.users?.length > 0 && (
            <div className="summary-section">
              <h3>👥 По пользователям</h3>
              <div className="card">
                {summary.users.map((u, i) => (
                  <div className="summary-row" key={i}>
                    <span>{u.userName}</span>
                    <span style={{ fontWeight: 600 }}>₽{u.totalSpent?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
