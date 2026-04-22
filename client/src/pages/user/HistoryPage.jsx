import { useState, useEffect } from 'react';
import { orderApi } from '../../api/index.js';

export default function HistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    orderApi.history(date)
      .then(setOrders)
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

  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>📋 История заказов</h2>

      <div className="date-nav">
        <button onClick={() => changeDate(-1)}>←</button>
        <span className="date-label">{formatDateLabel()}</span>
        <button onClick={() => changeDate(1)}>→</button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Нет заказов за эту дату</p>
        </div>
      ) : (
        <>
          {orders.map((order) => (
            <div className="card order-card" key={order.id}>
              <div className="order-time">
                {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="order-items-list">
                {order.items.map((item, i) => (
                  <span key={item.id}>
                    {item.itemName} ×{item.quantity}
                    {i < order.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
              <div className="order-total">
                Итого: ₽{order.totalAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
              </div>
            </div>
          ))}

          <div style={{
            textAlign: 'center', marginTop: 16, fontWeight: 700,
            color: 'var(--text-secondary)', fontSize: '0.9375rem'
          }}>
            Потрачено за день: ₽{totalSpent.toLocaleString('ru-RU', {minimumFractionDigits: 2})}
          </div>
        </>
      )}
    </div>
  );
}
