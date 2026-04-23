import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/index.js';
import { useAdminAuth } from '../../context/AuthContext.jsx';

export default function AdminUsers() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.isSuperAdmin;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [topupUser, setTopupUser] = useState(null);
  const [topupMode, setTopupMode] = useState('add');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupComment, setTopupComment] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all'); // all, zero, positive
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminApi.users();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;

    setTopupLoading(true);
    try {
      let result;
      if (topupMode === 'add') {
        result = await adminApi.topup(topupUser.id, amount, topupComment);
      } else {
        result = await adminApi.subtract(topupUser.id, amount, topupComment);
      }
      showToast(`✅ ${result.message}. Новый баланс: ₽${result.newBalance}`);
      setTopupUser(null);
      setTopupAmount('');
      setTopupComment('');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Удалить пользователя из системы? (История заказов сохранится)')) return;
    try {
      await adminApi.deleteUser(id);
      showToast('Пользователь удален');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleRole = async (id, isAdmin) => {
    if (!confirm(isAdmin ? 'Сделать пользователя администратором?' : 'Отозвать права администратора?')) return;
    try {
      await adminApi.updateUserRole(id, isAdmin);
      showToast(isAdmin ? 'Права администратора выданы' : 'Права отозваны');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showToast('Пароль должен быть не менее 4 символов', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await adminApi.resetPassword(resetUser.id, newPassword);
      showToast('✅ Пароль успешно изменён');
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                         u.email.toLowerCase().includes(search.toLowerCase());
    
    let matchesBalance = true;
    if (balanceFilter === 'zero') matchesBalance = u.balance <= 0;
    if (balanceFilter === 'positive') matchesBalance = u.balance > 0;
    
    return matchesSearch && matchesBalance;
  });

  if (loading) {
    return <div className="page page-admin"><div className="loader"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="page page-admin">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <h2 style={{ marginBottom: 16 }}>👥 Пользователи</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="🔍 Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select 
          className="input" 
          style={{ width: 'auto' }}
          value={balanceFilter}
          onChange={(e) => setBalanceFilter(e.target.value)}
        >
          <option value="all">Все балансы</option>
          <option value="zero">Нулевые/Долг</option>
          <option value="positive">Положительные</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <p>Пользователи не найдены</p>
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div className="card" key={user.id}>
            <div className="user-item">
              <div className="user-info">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                {isSuperAdmin && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={user.isAdmin} 
                        onChange={(e) => handleToggleRole(user.id, e.target.checked)} 
                      />
                      Права администратора
                    </label>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${user.balance > 0 ? 'badge-success' : 'badge-danger'}`}>
                    ₽{user.balance.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setTopupUser(user); setTopupMode('add'); }}>
                  Пополнить
                </button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { setTopupUser(user); setTopupMode('subtract'); }}>
                  Вычесть
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: 0 }} onClick={() => handleDeleteUser(user.id)}>
                  🗑️ Удалить
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => setResetUser(user)}>
                  🔑 Пароль
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Topup Modal */}
      {topupUser && (
        <div className="modal-overlay modal-center" onClick={() => setTopupUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>{topupMode === 'add' ? 'Пополнение баланса' : 'Списание средств'}</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{topupUser.name}</p>

            <div style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
              padding: 12, marginBottom: 16, textAlign: 'center'
            }}>
              <div className="text-sm text-muted">Текущий баланс</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                ₽{topupUser.balance.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
              </div>
            </div>

            <form onSubmit={handleTopup}>
              <div className="input-group">
                <label>Сумма {topupMode === 'add' ? 'пополнения' : 'списания'} (₽)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="500"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Комментарий</label>
                <input
                  className="input"
                  placeholder="Апрель, пополнение..."
                  value={topupComment}
                  onChange={(e) => setTopupComment(e.target.value)}
                />
              </div>

              {topupAmount && parseFloat(topupAmount) > 0 && (
                <div style={{
                  background: topupMode === 'add' ? 'var(--success-bg)' : '#fee2e2', borderRadius: 'var(--radius-sm)',
                  padding: 12, marginBottom: 16, textAlign: 'center'
                }}>
                  <div className="text-sm" style={{ color: topupMode === 'add' ? 'var(--success)' : 'var(--danger)' }}>Баланс после {topupMode === 'add' ? 'пополнения' : 'списания'}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: topupMode === 'add' ? 'var(--success)' : 'var(--danger)' }}>
                    ₽{(topupUser.balance + (topupMode === 'add' ? parseFloat(topupAmount || 0) : -parseFloat(topupAmount || 0))).toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setTopupUser(null)}>
                  Отмена
                </button>
                <button className="btn btn-primary" style={topupMode === 'subtract' ? {background: 'var(--danger)'} : {}} type="submit" disabled={topupLoading}>
                  {topupLoading ? 'Обработка...' : topupMode === 'add' ? 'Пополнить ✓' : 'Списать ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="modal-overlay modal-center" onClick={() => setResetUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Смена пароля</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{resetUser.name}</p>

            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label>Новый пароль</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={4}
                />
              </div>

              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Минимум 4 символа
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => { setResetUser(null); setNewPassword(''); }}>
                  Отмена
                </button>
                <button className="btn btn-primary" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
