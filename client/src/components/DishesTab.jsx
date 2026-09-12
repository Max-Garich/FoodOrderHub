import { useState, useEffect, useCallback } from 'react';
import { canteenApi } from '../api/index.js';
import { fileToPhotoDataUrl } from '../utils/photo.js';
import LightboxImg from './LightboxImg.jsx';

// Справочник блюд с фото — общий для супер-админа (вкладка «Блюда»)
// и главы столовой (вкладка «Блюда»): сохраняешь блюдо один раз,
// потом кнопкой «В меню» добавляешь его в дневное меню,
// вводя только цену и количество порций (предзаполнены последними использованными).

const DISH_CATEGORIES = ['Супы', 'Второе', 'Салаты', 'Котлеты', 'Булочки', 'Напитки', 'Прочее'];

export default function DishesTab({ showToast }) {
  const [items, setItems] = useState(null);
  const [dailyIds, setDailyIds] = useState(new Set()); // блюда, уже добавленные в меню
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [addToMenu, setAddToMenu] = useState(null);   // блюдо для модалки «В меню»
  const [editItem, setEditItem] = useState(null);     // редактирование блюда

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Прочее');
  const [newPrice, setNewPrice] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);

  const load = useCallback(async () => {
    try {
      const [catalog, daily] = await Promise.all([
        canteenApi.menuItems(),
        canteenApi.dailyMenu(),
      ]);
      setItems(catalog);
      setDailyIds(new Set((daily.items || []).map((i) => i.menuItemId).filter(Boolean)));
    } catch (err) {
      showToast(err.message, 'error');
      setItems([]);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const pickPhoto = async (file, setPhoto) => {
    if (!file) return;
    try {
      setPhoto(await fileToPhotoDataUrl(file));
    } catch {
      showToast('Не удалось загрузить фото', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName) return;
    setSaving(true);
    try {
      await canteenApi.createMenuItem({
        name: newName,
        category: newCategory,
        defaultPrice: newPrice ? parseFloat(newPrice) : null,
        defaultMaxQuantity: newMax === '' ? null : parseInt(newMax),
        photoUrl: newPhoto,
      });
      setNewName(''); setNewPrice(''); setNewMax(''); setNewPhoto(null);
      showToast('Блюдо сохранено в справочник');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Удалить «${item.name}» из справочника?`)) return;
    try {
      await canteenApi.deleteCatalogItem(item.id);
      showToast('Блюдо удалено');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Добавить все блюда справочника в меню с последними сохранёнными ценой/порциями
  const handleAddAll = async () => {
    const toAdd = (items || []).filter((i) => !dailyIds.has(i.id) && i.defaultPrice != null);
    const noPrice = (items || []).filter((i) => !dailyIds.has(i.id) && i.defaultPrice == null);
    if (toAdd.length === 0) {
      showToast(noPrice.length > 0 ? 'Нет блюд с сохранённой ценой' : 'Все блюда уже в меню', 'error');
      return;
    }
    if (!confirm(`Добавить в меню ${toAdd.length} блюд(а) с сохранённой ценой и порциями?`)) return;
    setBulkLoading(true);
    let ok = 0;
    for (const item of toAdd) {
      try {
        await canteenApi.addDailyItem({
          menuItemId: item.id,
          itemName: item.name,
          category: item.category || 'Прочее',
          price: item.defaultPrice,
          maxQuantity: item.defaultMaxQuantity ?? 20,
        });
        ok += 1;
      } catch (err) {
        showToast(`«${item.name}»: ${err.message}`, 'error');
      }
    }
    setBulkLoading(false);
    showToast(`Добавлено в меню: ${ok}`);
    load();
  };

  if (items === null) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Справочник блюд</h2>
        {(items || []).some((i) => !dailyIds.has(i.id)) && (
          <button className="btn btn-primary btn-sm" onClick={handleAddAll} disabled={bulkLoading}>
            {bulkLoading ? 'Добавление...' : 'Добавить всё в меню'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Справочник пуст. Добавьте блюда — потом их можно будет добавлять в меню одной кнопкой.</p>
        </div>
      ) : (
        <div className="dish-grid">
          {items.map((item) => {
            const inMenu = dailyIds.has(item.id);
            return (
              <div className="card dish-card" key={item.id}>
                <div className="dish-photo-box">
                  {item.photoUrl ? (
                    <LightboxImg className="dish-photo" src={item.photoUrl} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="dish-photo dish-photo-placeholder">🍽️</div>
                  )}
                  {inMenu && <span className="badge badge-success dish-in-menu-badge">В меню</span>}
                </div>
                <div className="dish-card-body">
                  <div className="text-xs text-muted">{item.category || 'Прочее'}</div>
                  <div className="dish-card-name">{item.name}</div>
                  <div className="dish-card-meta">
                    {item.defaultPrice != null
                      ? `₽${item.defaultPrice.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}`
                      : 'цена не задана'}
                    {item.defaultMaxQuantity != null && ` · ${item.defaultMaxQuantity} порц.`}
                  </div>
                  <div className="dish-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setAddToMenu(item)}
                      style={{ flex: 1 }}
                    >
                      В меню
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditItem({ ...item })}>Изменить</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleDelete(item)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Новое блюдо */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Новое блюдо</h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label>Название</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Борщ" required />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)} placeholder="150" />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
              <label>Порции по умолчанию</label>
              <input className="input" type="number" min="0" value={newMax}
                onChange={(e) => setNewMax(e.target.value)} placeholder="50" />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
              <label>Категория</label>
              <select className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {DISH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Фото (необязательно)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {newPhoto ? (
                <img className="dish-photo" src={newPhoto} alt="превью" style={{ width: 56, height: 56 }} />
              ) : (
                <div className="dish-photo dish-photo-placeholder" style={{ width: 56, height: 56 }}>🍽️</div>
              )}
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => pickPhoto(e.target.files?.[0], setNewPhoto)}
              />
              {newPhoto && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewPhoto(null)}>Убрать</button>
              )}
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить блюдо'}
          </button>
        </form>
      </div>

      {addToMenu && (
        <AddToMenuModal
          item={addToMenu}
          onClose={() => setAddToMenu(null)}
          showToast={showToast}
          onAdded={() => { setAddToMenu(null); load(); }}
        />
      )}
      {editItem && (
        <EditDishModal
          item={editItem}
          onClose={() => setEditItem(null)}
          showToast={showToast}
          onSaved={() => { setEditItem(null); load(); }}
        />
      )}
    </>
  );
}

// Модалка «В меню»: блюдо с фото и названием уже готово,
// остаётся ввести только цену и количество порций (предзаполнены последними использованными)
function AddToMenuModal({ item, onClose, showToast, onAdded }) {
  const [price, setPrice] = useState((item.defaultPrice ?? '').toString());
  const [maxQuantity, setMaxQuantity] = useState((item.defaultMaxQuantity ?? 20).toString());
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!price || maxQuantity === '') return;
    setSaving(true);
    try {
      await canteenApi.addDailyItem({
        menuItemId: item.id,
        itemName: item.name,
        category: item.category || 'Прочее',
        price: parseFloat(price),
        maxQuantity: parseInt(maxQuantity),
      });
      showToast(`«${item.name}» добавлено в меню`);
      onAdded();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-center" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          {item.photoUrl ? (
            <LightboxImg className="dish-photo" src={item.photoUrl} alt={item.name} style={{ width: 56, height: 56 }} />
          ) : (
            <div className="dish-photo dish-photo-placeholder" style={{ width: 56, height: 56 }}>🍽️</div>
          )}
          <h2 style={{ margin: 0, fontSize: 20 }}>{item.name}</h2>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={price}
                onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Количество порций</label>
              <input className="input" type="number" min="0" value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)} required />
            </div>
          </div>
          <p className="text-xs text-muted" style={{ margin: '4px 0 12px' }}>
            Подставлены последние использованные значения — можно изменить или оставить как есть
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Добавление...' : 'Добавить'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Модалка редактирования блюда справочника
function EditDishModal({ item, onClose, showToast, onSaved }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || 'Прочее');
  const [price, setPrice] = useState(item.defaultPrice != null ? item.defaultPrice.toString() : '');
  const [maxQuantity, setMaxQuantity] = useState(item.defaultMaxQuantity != null ? item.defaultMaxQuantity.toString() : '');
  const [photo, setPhoto] = useState(item.photoUrl || null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      await canteenApi.updateCatalogItem(item.id, {
        name,
        category,
        defaultPrice: price ? parseFloat(price) : null,
        defaultMaxQuantity: maxQuantity === '' ? null : parseInt(maxQuantity),
        photoUrl: photo,
      });
      showToast('Блюдо обновлено');
      onSaved();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-center" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Изменить блюдо</h2>
        <form onSubmit={submit}>
          <div className="input-group">
            <label>Название</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: 120 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={price}
                onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 120 }}>
              <label>Порции</label>
              <input className="input" type="number" min="0" value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 130 }}>
              <label>Категория</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {DISH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Фото</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {photo ? (
                <img className="dish-photo" src={photo} alt="превью" style={{ width: 56, height: 56 }} />
              ) : (
                <div className="dish-photo dish-photo-placeholder" style={{ width: 56, height: 56 }}>🍽️</div>
              )}
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setPhoto(await fileToPhotoDataUrl(f));
                  } catch {
                    showToast('Не удалось загрузить фото', 'error');
                  }
                }}
              />
              {photo && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>Убрать</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
