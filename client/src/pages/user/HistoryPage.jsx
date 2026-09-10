import { useState, useEffect, useRef } from 'react';
import { orderApi } from '../../api/index.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Пн=0
}

function formatDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [orderDates, setOrderDates] = useState(new Map());
  const calendarRef = useRef(null);

  // Загрузка заказов за дату
  useEffect(() => {
    setLoading(true);
    orderApi.history(date)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  // Загрузка дат с заказами за месяц
  useEffect(() => {
    const monthStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}`;
    orderApi.dates(monthStr)
      .then((dates) => {
        const map = new Map();
        dates.forEach(d => map.set(d.date, d));
        setOrderDates(map);
      })
      .catch(() => setOrderDates(new Map()));
  }, [calendarMonth]);

  // Закрытие календаря при клике вне
  useEffect(() => {
    if (!showCalendar) return;
    const handler = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalendar]);

  const formatDateLabel = () => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const handleDayClick = (day) => {
    const dateStr = formatDateStr(calendarMonth.year, calendarMonth.month, day);
    setDate(dateStr);
    setShowCalendar(false);
  };

  const changeMonth = (delta) => {
    setCalendarMonth(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 11) { newMonth = 0; newYear++; }
      if (newMonth < 0) { newMonth = 11; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  // Дни календаря
  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month);
  const firstDay = getFirstDayOfMonth(calendarMonth.year, calendarMonth.month);
  const todayStr = new Date().toISOString().split('T')[0];
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>История заказов</h2>

      {/* Выбор даты — кликабарная строка */}
      <div className="date-nav" style={{ position: 'relative' }}>
        <button onClick={() => {
          const d = new Date(date + 'T12:00:00');
          d.setDate(d.getDate() - 1);
          setDate(d.toISOString().split('T')[0]);
        }}>←</button>
        <button 
          className="date-label" 
          onClick={() => setShowCalendar(prev => !prev)}
          style={{ cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit' }}
        >
          📅 {formatDateLabel()}
        </button>
        <button onClick={() => {
          const d = new Date(date + 'T12:00:00');
          d.setDate(d.getDate() + 1);
          setDate(d.toISOString().split('T')[0]);
        }}>→</button>

        {/* Календарь-попап */}
        {showCalendar && (
          <div className="calendar-popup" ref={calendarRef}>
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={() => changeMonth(-1)}>←</button>
              <span className="calendar-title">{MONTHS[calendarMonth.month]} {calendarMonth.year}</span>
              <button className="calendar-nav-btn" onClick={() => changeMonth(1)}>→</button>
            </div>
            <div className="calendar-weekdays">
              {WEEKDAYS.map(d => <span key={d} className="calendar-weekday">{d}</span>)}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="calendar-day empty" />;
                const dateStr = formatDateStr(calendarMonth.year, calendarMonth.month, day);
                const hasOrders = orderDates.has(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === date;
                return (
                  <button
                    key={dateStr}
                    className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasOrders ? 'has-orders' : ''}`}
                    onClick={() => handleDayClick(day)}
                  >
                    {day}
                    {hasOrders && <span className="calendar-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>Нет заказов за эту дату</p>
        </div>
      ) : (
        <>
          <div className="summary-total" style={{ marginBottom: 16 }}>
            <div className="summary-total-label">Потрачено за день</div>
            <div className="summary-total-value">₽{totalSpent.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
            <div className="summary-total-label">{orders.length} заказ(ов)</div>
          </div>

          {orders.map((order) => (
            <div className="card order-card" key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="order-time">
                  {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="badge badge-primary">#{order.id}</span>
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
        </>
      )}
    </div>
  );
}
