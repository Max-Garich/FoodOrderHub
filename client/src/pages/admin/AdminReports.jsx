import { useState, useEffect } from 'react';
import { adminApi } from '../../api/index.js';

export default function AdminReports() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Edit item state
  const [editItem, setEditItem] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedDishes, setExpandedDishes] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startEdit = (orderId, item) => {
    setEditItem({ orderId, ...item });
    setEditQty(item.quantity.toString());
    setEditPrice(item.price.toString());
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await adminApi.updateOrderItem(editItem.orderId, editItem.id, {
        quantity: parseInt(editQty) || 0,
        price: parseFloat(editPrice) || 0
      });
      setEditItem(null);
      showToast('Заказ обновлен');
      const data = await adminApi.dailyReport(date);
      setReport(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    adminApi.dailyReport(date)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const changeDate = (delta) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = () => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const toggleOrder = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleDish = (dishName) => {
    setExpandedDishes(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };

  return (
    <div className="page page-admin">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <h2 style={{ marginBottom: 16 }}>📊 Отчёты</h2>

      <div className="date-nav">
        <button onClick={() => changeDate(-1)}>←</button>
        <span className="date-label">{formatDateLabel()}</span>
        <button onClick={() => changeDate(1)}>→</button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : !report || report.sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Нет данных за эту дату</p>
        </div>
      ) : (
        <>
          {/* Total revenue */}
          <div className="summary-total" style={{ marginBottom: 20 }}>
            <div className="summary-total-label">Выручка за день</div>
            <div className="summary-total-value">₽{report.totalRevenue.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
          </div>

          {report.sessions.map((session) => (
            <div key={session.sessionId} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3>Сессия #{session.sessionId}</h3>
                <span className={`badge ${session.isActive ? 'badge-success' : 'badge-primary'}`}>
                  {session.isActive ? 'Активна' : 'Завершена'}
                </span>
              </div>

              {/* Menu */}
              {session.menu.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>🍽️ Меню</h3>
                  {session.menu.map((m) => (
                    <div className="summary-row" key={m.id}>
                      <span>{m.itemName}</span>
                      <span style={{ fontWeight: 600 }}>₽{m.price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary aggregation */}
              {session.summary && (
                <>
                  <div className="card" style={{ marginBottom: 12 }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 8 }}
                      onClick={() => setExpandedDishes(prev => ({ ...prev, dishes: !prev.dishes }))}
                    >
                      <h3 style={{ margin: 0 }}>📦 По блюдам</h3>
                      <span style={{ transform: expandedDishes.dishes ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                    </div>
                    {(!expandedDishes.dishes ? (
                      <div className="text-sm text-muted" style={{ textAlign: 'center', padding: '12px 0' }}>
                        Нажмите ▶ чтобы увидеть детали
                      </div>
                    ) : (
                      session.summary.dishes?.map((d, i) => (
                        <div className="summary-row" key={i}>
                          <span>{d.name}</span>
                          <span style={{ fontWeight: 600 }}>
                            {d.totalQuantity} порц. (₽{d.totalAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2})})
                          </span>
                        </div>
                      ))
                    ))}
                  </div>

                  <div className="card" style={{ marginBottom: 12 }}>
                    <h3 style={{ marginBottom: 8 }}>👥 По пользователям</h3>
                    {session.summary.users?.map((u, i) => (
                      <div className="summary-row" key={i}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.userName}</div>
                          <div className="text-xs text-muted">{u.orderCount} заказ(ов)</div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          ₽{u.totalSpent.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Individual orders */}
              {session.orders.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 8 }}>📝 Заказы ({session.orders.length})</h3>
                  {session.orders.map((order) => (
                    <div key={order.orderId} style={{
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          marginBottom: expandedOrders[order.orderId] ? 4 : 0
                        }}
                        onClick={() => toggleOrder(order.orderId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            transform: expandedOrders[order.orderId] ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            fontSize: '1.2rem'
                          }}>▶</span>
                          <span style={{ fontWeight: 600 }}>{order.userName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="text-sm text-muted">
                            {new Date(order.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            ₽{order.total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                      {expandedOrders[order.orderId] && (
                        <div className="text-sm" style={{ marginLeft: 28, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                          {order.items.map((item, i) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                              <span>
                                {item.itemName} ×{item.quantity} 
                                <span className="text-muted" style={{ marginLeft: 6 }}>₽{item.price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                              </span>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(order.orderId, item)}>✏️</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Edit Item Modal */}
          {editItem && (
            <div className="modal-overlay modal-center" onClick={() => setEditItem(null)}>
              <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginBottom: 4 }}>Редактирование заказа</h2>
                <p className="text-muted" style={{ marginBottom: 16 }}>
                  Позиция: <strong>{editItem.itemName}</strong>
                </p>

                <form onSubmit={handleEditSubmit}>
                  <div className="input-group">
                    <label>Количество (0 чтобы удалить)</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Стоимость (за ед.)</label>
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

                  <div style={{
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                    padding: 12, marginBottom: 16, textAlign: 'center'
                  }}>
                    <div className="text-sm">Итог за позицию</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      ₽{((parseInt(editQty) || 0) * (parseFloat(editPrice) || 0)).toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setEditItem(null)}>
                      Отмена
                    </button>
                    <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={editLoading}>
                      {editLoading ? 'Сохранение...' : 'Сохранить ✓'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
