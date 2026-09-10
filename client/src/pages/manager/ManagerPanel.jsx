import { useState, useEffect, useCallback } from 'react';
import PanelLayout from '../../components/PanelLayout.jsx';
import { managerApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

const TABS = [
  { id: 'requests', label: 'Заявки' },
  { id: 'balances', label: 'Балансы' },
  { id: 'orders', label: 'Заказы' },
  { id: 'payment', label: 'Оплата' },
];

export default function ManagerPanel() {
  const { user, refreshProfile } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState('requests');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <PanelLayout tabs={TABS} activeTab={tab} onTabChange={setTab}>
      <div className="page page-admin">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        {tab === 'requests' && <RequestsTab showToast={showToast} isSuperAdmin={isSuperAdmin} />}
        {tab === 'balances' && <BalancesTab showToast={showToast} />}
        {tab === 'orders' && <OrdersTab showToast={showToast} onBalanceChanged={refreshProfile} />}
        {tab === 'payment' && <PaymentTab showToast={showToast} />}
      </div>
    </PanelLayout>
  );
}

// ===== Заявки =====
function RequestsTab({ showToast, isSuperAdmin }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRequests(await managerApi.requests());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id) => {
    try {
      const res = await managerApi.acceptRequest(id);
      showToast(res.message);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Отклонить заявку?')) return;
    try {
      const res = await managerApi.rejectRequest(id);
      showToast(res.message);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Заявки на подключение</h2>
      {requests.length === 0 ? (
        <div className="empty-state">
          <p>Новых заявок нет</p>
        </div>
      ) : (
        requests.map((r) => (
          <div className="card" key={r.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {r.name} {r.surname}
                  {r.role === 'TEACHER' && (
                    <span className="badge badge-primary" style={{ marginLeft: 8 }}>Преподаватель</span>
                  )}
                </div>
                <div className="text-sm text-muted">{r.email}</div>
                {r.position && <div className="text-xs text-muted">{r.position}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.id)}>
                  Принять
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleReject(r.id)}
                >
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      {isSuperAdmin && (
        <p className="text-xs text-muted" style={{ marginTop: 12 }}>
          Как главный администратор вы видите все заявки, включая преподавателей.
        </p>
      )}
    </>
  );
}

// ===== Балансы =====
function BalancesTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topupUser, setTopupUser] = useState(null);
  const [topupMode, setTopupMode] = useState('add');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupComment, setTopupComment] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await managerApi.users());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;
    setTopupLoading(true);
    try {
      const result = topupMode === 'add'
        ? await managerApi.topup(topupUser.id, amount, topupComment)
        : await managerApi.subtract(topupUser.id, amount, topupComment);
      showToast(`${result.message}. Новый баланс: ₽${result.newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`);
      setTopupUser(null);
      setTopupAmount('');
      setTopupComment('');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTopupLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return `${u.name} ${u.surname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Балансы группы</h2>

      <input
        className="input"
        style={{ marginBottom: 16 }}
        placeholder="Поиск по имени или email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Пользователи не найдены</p>
        </div>
      ) : (
        filtered.map((u) => (
          <div className="card" key={u.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {u.name} {u.surname}
                  {u.role === 'MANAGER' && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Менеджер</span>}
                </div>
                <div className="text-sm text-muted">{u.email}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${u.balance > 0 ? 'badge-success' : 'badge-danger'}`}>
                    ₽{u.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setTopupUser(u); setTopupMode('add'); }}>
                  Пополнить
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => { setTopupUser(u); setTopupMode('subtract'); }}
                >
                  Вычесть
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Модалка пополнения/списания */}
      {topupUser && (
        <div className="modal-overlay modal-center" onClick={() => setTopupUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>{topupMode === 'add' ? 'Пополнение баланса' : 'Списание средств'}</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{topupUser.name} {topupUser.surname}</p>

            <div style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
              padding: 12, marginBottom: 16, textAlign: 'center'
            }}>
              <div className="text-sm text-muted">Текущий баланс</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                ₽{topupUser.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
              {/* Быстрые суммы */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['100', '200', '500', '1000'].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setTopupAmount(amt)}
                  >
                    ₽{amt}
                  </button>
                ))}
              </div>
              <div className="input-group">
                <label>Комментарий</label>
                <input
                  className="input"
                  placeholder="Пополнение за месяц..."
                  value={topupComment}
                  onChange={(e) => setTopupComment(e.target.value)}
                />
              </div>

              {topupAmount && parseFloat(topupAmount) > 0 && (
                <div style={{
                  background: topupMode === 'add' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12, marginBottom: 16, textAlign: 'center'
                }}>
                  <div className="text-sm" style={{ color: topupMode === 'add' ? 'var(--success)' : 'var(--danger)' }}>
                    Баланс после {topupMode === 'add' ? 'пополнения' : 'списания'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: topupMode === 'add' ? 'var(--success)' : 'var(--danger)' }}>
                    ₽{(topupUser.balance + (topupMode === 'add' ? 1 : -1) * parseFloat(topupAmount || 0)).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setTopupUser(null)}>
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  style={topupMode === 'subtract' ? { background: 'var(--danger)' } : {}}
                  type="submit"
                  disabled={topupLoading}
                >
                  {topupLoading ? 'Обработка...' : topupMode === 'add' ? 'Пополнить' : 'Списать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Заказы группы =====
function OrdersTab({ showToast, onBalanceChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      setOrders(await managerApi.groupOrders(today));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, today]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (order, item) => {
    setEditItem({ orderId: order.id, ...item });
    setEditQty(item.quantity.toString());
    setEditPrice(item.price.toString());
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await managerApi.updateOrderItem(editItem.orderId, editItem.id, {
        quantity: parseInt(editQty) || 0,
        price: parseFloat(editPrice) || 0,
      });
      setEditItem(null);
      showToast('Заказ обновлён');
      onBalanceChanged();
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Заказы группы за сегодня</h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>Заказов пока нет</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="card" key={order.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setExpanded(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  transform: expanded[order.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s', fontSize: '0.8rem', color: 'var(--text-muted)'
                }}>▶</span>
                <span style={{ fontWeight: 600 }}>{order.userName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="text-sm text-muted">
                  {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  ₽{order.totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {expanded[order.id] && (
              <div className="text-sm" style={{ marginLeft: 28, paddingLeft: 12, borderLeft: '2px solid var(--border)', marginTop: 8 }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                    <span>
                      {item.itemName} ×{item.quantity}
                      <span className="text-muted" style={{ marginLeft: 6 }}>
                        ₽{item.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(order, item)}>
                      Изменить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Модалка редактирования позиции */}
      {editItem && (
        <div className="modal-overlay modal-center" onClick={() => setEditItem(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Редактирование заказа</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              Позиция: <strong>{editItem.itemName}</strong>
            </p>

            <form onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label>Количество (0 — удалить позицию)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Цена за порцию (₽)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setEditItem(null)}>
                  Отмена
                </button>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={editLoading}>
                  {editLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Оплата группы =====
function PaymentTab({ showToast }) {
  const { user, refreshProfile } = useAuth();
  const group = user?.group;
  const [phone, setPhone] = useState(group?.paymentPhone || '');
  const [bank, setBank] = useState(group?.paymentBank || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await managerApi.updatePayment(phone.trim(), bank.trim());
      showToast(res.message);
      refreshProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Реквизиты оплаты группы</h2>
      {!group ? (
        <div className="empty-state">
          <p>Вы не привязаны к группе</p>
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            {group.name} — на этот номер участники группы переводят деньги за обеды.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Номер телефона</label>
              <input
                className="input"
                type="tel"
                placeholder="+79001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Банк</label>
              <input
                className="input"
                type="text"
                placeholder="Сбербанк, Т-Банк, ВТБ..."
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
