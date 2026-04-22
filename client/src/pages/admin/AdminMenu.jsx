import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/index.js';

export default function AdminMenu() {
  const [dailyItems, setDailyItems] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // New item form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Прочее');
  const [showCatalog, setShowCatalog] = useState(false);

  // New Catalog item
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');
  const [newCatalogCategory, setNewCatalogCategory] = useState('Прочее');

  // Edit item
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('Прочее');

  const CATEGORIES = ['Супы', 'Второе', 'Салаты', 'Котлеты', 'Булочки', 'Напитки', 'Прочее'];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [daily, catalog] = await Promise.all([
        adminApi.dailyMenu(),
        adminApi.menuItems(),
      ]);
      setDailyItems(daily.items || []);
      setCatalogItems(catalog);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    try {
      await adminApi.addDailyItem({ itemName: newName, price: parseFloat(newPrice), category: newCategory });
      setNewName('');
      setNewPrice('');
      setNewCategory('Прочее');
      showToast('Позиция добавлена');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddFromCatalog = async (item) => {
    const price = prompt(`Цена для "${item.name}" на сегодня:`, item.defaultPrice || '150');
    if (!price) return;
    try {
      await adminApi.addDailyItem({
        menuItemId: item.id,
        itemName: item.name,
        price: parseFloat(price),
        category: item.category || 'Прочее',
      });
      showToast(`${item.name} добавлено в меню`);
      setShowCatalog(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddCatalogItem = async (e) => {
    e.preventDefault();
    if (!newCatalogName) return;
    try {
      await adminApi.createMenuItem({ 
        name: newCatalogName, 
        defaultPrice: newCatalogPrice || null,
        category: newCatalogCategory,
      });
      setNewCatalogName('');
      setNewCatalogPrice('');
      setNewCatalogCategory('Прочее');
      showToast('Добавлено в справочник');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCatalogItem = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Удалить блюдо из справочника?')) return;
    try {
      await adminApi.deleteCatalogItem(id);
      showToast('Блюдо удалено');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить позицию из меню?')) return;
    try {
      await adminApi.deleteDailyItem(id);
      showToast('Позиция удалена');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateDailyItem(editId, {
        itemName: editName,
        price: parseFloat(editPrice),
        category: editCategory,
      });
      setEditId(null);
      showToast('Позиция обновлена');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.itemName);
    setEditPrice(item.price.toString());
    setEditCategory(item.category || 'Прочее');
  };

  if (loading) {
    return <div className="page page-admin"><div className="loader"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="page page-admin">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <h2 style={{ marginBottom: 16 }}>📋 Меню на сегодня</h2>

      {/* Current daily items */}
      {dailyItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>Меню пусто. Добавьте позиции.</p>
        </div>
      ) : (
        dailyItems.map((item) => (
          <div className="card" key={item.id}>
            {editId === item.id ? (
              <form onSubmit={handleEdit}>
                <div className="input-group">
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="input-group" style={{ display: 'flex', gap: 8 }}>
                  <input className="input" type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{flex: 1}} required />
                  <select className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{flex: 1}}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" type="submit">Сохранить</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditId(null)}>Отмена</button>
                </div>
              </form>
            ) : (
              <div className="menu-card">
                <div className="menu-card-info">
                  <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{item.category || 'Прочее'}</div>
                  <div className="menu-card-name">{item.itemName}</div>
                  <div className="menu-card-price">₽{item.price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add new item */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>+ Новая позиция</h3>
        <form onSubmit={handleAddNew}>
          <div className="input-group">
            <label>Название</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Борщ" required />
          </div>
          <div className="input-group" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="150" required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Категория</label>
              <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit">Добавить в меню</button>
        </form>
      </div>

      {/* Add from catalog */}
      <button
        className="btn btn-outline btn-block"
        style={{ marginTop: 12 }}
        onClick={() => setShowCatalog(!showCatalog)}
      >
        {showCatalog ? 'Скрыть справочник' : '📚 Добавить из справочника'}
      </button>

      {showCatalog && (
        <div style={{ marginTop: 12 }}>
          <div className="card" style={{ marginBottom: 16, background: 'var(--bg-secondary)', padding: "12px" }}>
            <h4 style={{ marginBottom: 8, fontSize: "0.95rem" }}>+ Новое блюдо в справочник</h4>
            <form onSubmit={handleAddCatalogItem} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Название блюда" value={newCatalogName} onChange={e => setNewCatalogName(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} type="number" step="0.01" placeholder="Цена (не обяз.)" value={newCatalogPrice} onChange={e => setNewCatalogPrice(e.target.value)} />
                <select className="input" style={{ flex: 1 }} value={newCatalogCategory} onChange={e => setNewCatalogCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Создать</button>
            </form>
          </div>
          {catalogItems.length === 0 ? (
            <p className="text-sm text-muted">Справочник пуст</p>
          ) : (
            catalogItems.map((item) => (
              <div className="card" key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleAddFromCatalog(item)}>
                <div className="menu-card">
                  <div className="menu-card-info">
                    <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{item.category || 'Прочее'}</div>
                    <div className="menu-card-name">{item.name} {item.defaultPrice && <span style={{color: 'var(--primary)', fontSize: '0.9em', marginLeft: 6}}>₽{item.defaultPrice}</span>}</div>
                    <div className="text-sm text-muted">{item.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>+ Добавить</span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleDeleteCatalogItem(e, item.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
