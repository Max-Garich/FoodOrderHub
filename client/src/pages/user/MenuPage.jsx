import { useState, useEffect, useCallback } from 'react';
import { menuApi, orderApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MenuPage() {
  const { balance, refreshBalance } = useAuth();
  const [menuData, setMenuData] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const loadMenu = useCallback(async () => {
    try {
      const data = await menuApi.today();
      setMenuData(data);
      const q = {};
      data.items.forEach((item) => (q[item.id] = 0));
      setQuantities(q);
      if (data.favorites) {
        setFavorites(new Set(data.favorites));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateQuantity = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const toggleFav = async (e, menuItemId) => {
    e.stopPropagation();
    if (!menuItemId) return;
    try {
      const res = await menuApi.toggleFavorite(menuItemId);
      setFavorites(prev => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(menuItemId);
        else next.delete(menuItemId);
        return next;
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const cartItems = menuData?.items.filter((item) => (quantities[item.id] || 0) > 0) || [];
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * quantities[item.id],
    0
  );
  const hasItems = cartItems.length > 0;
  const canAfford = totalAmount <= balance + 100;
  const isOrdering = menuData?.isOrderingActive;

  const handleOrder = async () => {
    setSubmitting(true);
    try {
      const items = cartItems.map((item) => ({
        dailyMenuId: item.id,
        quantity: quantities[item.id],
      }));
      await orderApi.create(items);
      await refreshBalance();
      setShowConfirm(false);
      setQuantities((prev) => {
        const reset = {};
        Object.keys(prev).forEach((k) => (reset[k] = 0));
        return reset;
      });
      showToast('✅ Заказ принят!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loader"><div className="spinner"></div></div>
      </div>
    );
  }

  const formatDate = () => {
    const d = menuData?.sessionDate ? new Date(menuData.sessionDate + 'T12:00:00') : new Date();
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Group by category, and handle favorites pseudo-category
  const categories = {};
  const favItems = [];

  if (menuData?.items) {
    menuData.items.forEach(item => {
      if (item.menuItemId && favorites.has(item.menuItemId)) {
        favItems.push(item);
      }
      const cat = item.category || 'Прочее';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    });
  }

  const categoryOrder = ['Супы', 'Второе', 'Салаты', 'Котлеты', 'Булочки', 'Напитки', 'Прочее'];
  const activeCategories = categoryOrder.filter(cat => categories[cat]?.length > 0);
  const otherCategories = Object.keys(categories).filter(c => !categoryOrder.includes(c));
  const sortedCategories = [...activeCategories, ...otherCategories];

  const renderItem = (item) => (
    <div className="card menu-card scale-on-hover" key={item.id} style={{ marginBottom: 8 }}>
      <div className="menu-card-info" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {item.menuItemId && (
          <button 
            className="btn btn-ghost" 
            style={{ padding: '4px', fontSize: '1.25rem', color: favorites.has(item.menuItemId) ? 'var(--warning)' : 'var(--text-muted)' }}
            onClick={(e) => toggleFav(e, item.menuItemId)}
          >
            {favorites.has(item.menuItemId) ? '★' : '☆'}
          </button>
        )}
        <div>
          <div className="menu-card-name">{item.itemName}</div>
          <div className="menu-card-price">₽{item.price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
        </div>
      </div>
      {isOrdering ? (
        <div className="counter">
          <button
            className="counter-btn"
            onClick={() => updateQuantity(item.id, -1)}
            disabled={!quantities[item.id]}
          >
            −
          </button>
          <span className="counter-value">{quantities[item.id] || 0}</span>
          <button
            className="counter-btn"
            onClick={() => updateQuantity(item.id, 1)}
          >
            +
          </button>
        </div>
      ) : (
        <span className="badge badge-danger animate-pulse-slow">Закрыто</span>
      )}
    </div>
  );

  return (
    <div className="page">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h2>📋 Меню на сегодня</h2>
          <p className="text-sm text-muted">{formatDate()}</p>
        </div>
      </div>

      {!isOrdering && (
        <div className="status-banner closed">
          🔴 Приём заказов закрыт
        </div>
      )}

      {isOrdering && balance < 0 && (
        <div className="status-banner" style={{ background: '#fee2e2', color: 'var(--danger)', marginBottom: '12px' }}>
          ⚠️ Ваш баланс отрицательный, желательно пополнить счет
        </div>
      )}

      {isOrdering && (
        <div className="status-banner open">
          🟢 Приём заказов открыт
        </div>
      )}

      {(!menuData?.items || menuData.items.length === 0) ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <p>Меню ещё не готово.<br />Загляните позже!</p>
        </div>
      ) : (
        <>
          {favItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, color: 'var(--warning)', display: 'flex', gap: 6 }}>
                <span>★</span> Избранное
              </h3>
              {favItems.map(renderItem)}
            </div>
          )}

          {sortedCategories.map(cat => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, opacity: 0.8 }}>{cat}</h3>
              {categories[cat].map(renderItem)}
            </div>
          ))}

          {hasItems && isOrdering && (
            <>
              <div style={{ height: '160px' }}></div>
              <div className="floating-cart glass">
              <div className="cart-total">
                <span>Итого к оплате:</span>
                <span>₽{totalAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
              </div>
              {!canAfford && (
                <div className="cart-warning">
                  ⚠️ Превышен лимит долга (нужно ещё ₽{(totalAmount - (balance + 100)).toLocaleString('ru-RU', {minimumFractionDigits: 2})})
                </div>
              )}
              <button
                className="btn btn-primary btn-block btn-lg"
                disabled={!canAfford}
                onClick={() => setShowConfirm(true)}
              >
                {canAfford ? '🚀 Оформить заказ' : '🔒 Пополните баланс'}
              </button>
            </div>
          </>
          )}
        </>
      )}

      {/* Confirmation Bottom Sheet */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h2 style={{ marginBottom: 16 }}>Ваш заказ</h2>

            {cartItems.map((item) => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span>{item.itemName}</span>
                <span style={{ fontWeight: 600 }}>
                  {quantities[item.id]} × ₽{item.price.toLocaleString('ru-RU', {minimumFractionDigits: 2})} = ₽{(item.price * quantities[item.id]).toLocaleString('ru-RU', {minimumFractionDigits: 2})}
                </span>
              </div>
            ))}

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', fontWeight: 700, fontSize: '1.1rem'
            }}>
              <span>Итого:</span>
              <span>₽{totalAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
            </div>

            <div style={{
              padding: '10px 0', fontSize: '0.9375rem', color: 'var(--text-secondary)'
            }}>
              Баланс после заказа: <strong>₽{(balance - totalAmount).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</strong>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}
              >
                Отменить
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
                onClick={handleOrder}
              >
                {submitting ? 'Отправка...' : 'Подтвердить ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
