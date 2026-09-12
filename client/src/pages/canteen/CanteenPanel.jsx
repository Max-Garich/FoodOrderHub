import { useState, useEffect, useCallback } from 'react';
import PanelLayout from '../../components/PanelLayout.jsx';
import { canteenApi } from '../../api/index.js';

const TABS = [
  { id: 'menu', label: 'Меню' },
  { id: 'additional', label: 'Доп-меню' },
  { id: 'session', label: 'Сессия' },
  { id: 'reports', label: 'Отчёты' },
];

const CATEGORIES = ['Супы', 'Второе', 'Салаты', 'Котлеты', 'Булочки', 'Напитки', 'Прочее'];

export default function CanteenPanel() {
  const [tab, setTab] = useState('menu');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <PanelLayout tabs={TABS} activeTab={tab} onTabChange={setTab}>
      <div className="page page-admin">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        {tab === 'menu' && <MenuTab showToast={showToast} />}
        {tab === 'additional' && <AdditionalTab showToast={showToast} />}
        {tab === 'session' && <SessionTab showToast={showToast} />}
        {tab === 'reports' && <ReportsTab showToast={showToast} />}
      </div>
    </PanelLayout>
  );
}

// ===== Меню (основное, с лимитами) =====
function MenuTab({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Прочее');
  const [newMax, setNewMax] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('Прочее');
  const [editMax, setEditMax] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await canteenApi.dailyMenu();
      setItems((data.items || []).filter(i => !i.isAdditional));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice || newMax === '') return;
    setSaving(true);
    try {
      await canteenApi.addDailyItem({
        itemName: newName,
        price: parseFloat(newPrice),
        category: newCategory,
        maxQuantity: parseInt(newMax),
      });
      setNewName(''); setNewPrice(''); setNewMax('');
      showToast('Позиция добавлена');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await canteenApi.updateDailyItem(editId, {
        itemName: editName,
        price: parseFloat(editPrice),
        category: editCategory,
        maxQuantity: parseInt(editMax),
      });
      setEditId(null);
      showToast('Позиция обновлена');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить позицию из меню?')) return;
    try {
      await canteenApi.deleteDailyItem(id);
      showToast('Позиция удалена');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.itemName);
    setEditPrice(item.price.toString());
    setEditCategory(item.category || 'Прочее');
    setEditMax((item.maxQuantity ?? 0).toString());
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Меню на сегодня</h2>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Меню пусто. Добавьте позиции.</p>
        </div>
      ) : (
        items.map((item) => {
          const remaining = item.remaining ?? Math.max(0, (item.maxQuantity || 0) - (item.orderedQuantity || 0));
          return (
            <div className="card" key={item.id} style={{ marginBottom: 8 }}>
              {editId === item.id ? (
                <form onSubmit={handleEdit}>
                  <div className="input-group">
                    <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" type="number" step="0.01" value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)} style={{ flex: 1 }} required placeholder="Цена" />
                    <select className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ flex: 1 }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="input" type="number" min="0" value={editMax}
                      onChange={(e) => setEditMax(e.target.value)} style={{ flex: 1 }} required placeholder="Лимит" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>Сохранить</button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditId(null)}>Отмена</button>
                  </div>
                </form>
              ) : (
                <div className="menu-item-admin">
                  <div className="text-xs text-muted">{item.category || 'Прочее'}</div>
                  <div className="menu-item-admin-main">
                    {item.photoUrl && (
                      <img className="menu-card-photo" src={item.photoUrl} alt={item.itemName} loading="lazy" />
                    )}
                    <div className="menu-card-name">{item.itemName}</div>
                    <div className="menu-card-price">
                      ₽{item.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="menu-item-admin-badges">
                    <span className="badge badge-primary">Лимит: {item.maxQuantity ?? '—'}</span>
                    <span className="badge badge-warning">Заказано: {item.orderedQuantity ?? 0}</span>
                    <span className={`badge ${remaining <= 0 ? 'badge-danger' : 'badge-success'}`}>
                      Осталось: {remaining}
                    </span>
                  </div>
                  <div className="menu-item-admin-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>Изменить</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(item.id)}>Удалить</button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Форма добавления */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Новая позиция</h3>
        <form onSubmit={handleAdd}>
          <div className="input-group">
            <label>Название</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Борщ" required />
          </div>
          <div className="input-group" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)} placeholder="150" required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Категория</label>
              <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Лимит порций (общий для всех групп)</label>
            <input className="input" type="number" min="0" value={newMax}
              onChange={(e) => setNewMax(e.target.value)} placeholder="50" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Добавление...' : 'Добавить в меню'}
          </button>
        </form>
      </div>
    </>
  );
}

// ===== Доп-меню =====
function AdditionalTab({ showToast }) {
  const [items, setItems] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Прочее');
  const [newMax, setNewMax] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [daily, session] = await Promise.all([
        canteenApi.dailyMenu(),
        canteenApi.currentSession(),
      ]);
      setItems((daily.items || []).filter(i => i.isAdditional));
      setSessionActive(!!session.isActive);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice || newMax === '') return;
    setSaving(true);
    try {
      await canteenApi.addAdditionalItem({
        itemName: newName,
        price: parseFloat(newPrice),
        category: newCategory,
        maxQuantity: parseInt(newMax),
      });
      setNewName(''); setNewPrice(''); setNewMax('');
      showToast('Позиция добавлена в доп-меню');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить позицию из доп-меню?')) return;
    try {
      await canteenApi.deleteDailyItem(id);
      showToast('Позиция удалена');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Доп-меню</h2>

      {!sessionActive && (
        <div className="status-banner closed" style={{ marginBottom: 16 }}>
          Доп-меню можно добавлять только во время активной сессии
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Доп-меню пусто</p>
        </div>
      ) : (
        items.map((item) => {
          const remaining = item.remaining ?? Math.max(0, (item.maxQuantity || 0) - (item.orderedQuantity || 0));
          return (
            <div className="card" key={item.id} style={{ marginBottom: 8 }}>
              <div className="menu-item-admin">
                <div className="text-xs text-muted">{item.category || 'Прочее'}</div>
                <div className="menu-item-admin-main">
                  <div className="menu-card-name">{item.itemName}</div>
                  <div className="menu-card-price">
                    ₽{item.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="menu-item-admin-badges">
                  <span className="badge badge-primary">Лимит: {item.maxQuantity ?? '—'}</span>
                  <span className="badge badge-warning">Заказано: {item.orderedQuantity ?? 0}</span>
                  <span className={`badge ${remaining <= 0 ? 'badge-danger' : 'badge-success'}`}>
                    Осталось: {remaining}
                  </span>
                </div>
                <div className="menu-item-admin-actions">
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(item.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Новая позиция доп-меню</h3>
        <form onSubmit={handleAdd}>
          <div className="input-group">
            <label>Название</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Пирожок с капустой" required />
          </div>
          <div className="input-group" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Цена (₽)</label>
              <input className="input" type="number" step="0.01" min="1" value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)} placeholder="60" required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Категория</label>
              <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Лимит порций</label>
            <input className="input" type="number" min="0" value={newMax}
              onChange={(e) => setNewMax(e.target.value)} placeholder="30" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving || !sessionActive}>
            {saving ? 'Добавление...' : 'Добавить в доп-меню'}
          </button>
        </form>
      </div>
    </>
  );
}

// ===== Раскрывающаяся строка группы (аккордеон) =====
// Название группы + стрелка вниз; по клику раскрывается список блюд с порциями.
function GroupExpandRow({ name, subtitle, dishes }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`group-expand ${open ? 'open' : ''}`}>
      <button type="button" className="group-expand-header" onClick={() => setOpen(!open)}>
        <span className="group-expand-name">
          {name}
          <span className="expand-arrow">{open ? '▲' : '▼'}</span>
        </span>
        {subtitle && <span className="group-expand-subtitle">{subtitle}</span>}
      </button>
      {open && (
        <div className="group-expand-body">
          {(dishes || []).map((d, i) => (
            <div className="summary-row" key={i}>
              <span>{d.name}</span>
              <span className="group-expand-qty">{d.totalQuantity} порц.</span>
            </div>
          ))}
          {(!dishes || dishes.length === 0) && (
            <p className="text-sm text-muted" style={{ margin: 0 }}>Пока ничего не заказано</p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Сессия =====
function SessionTab({ showToast }) {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    try {
      setSessionData(await canteenApi.currentSession());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await canteenApi.startSession();
      showToast('Приём заказов начат');
      setSummary(null);
      load();
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
      const data = await canteenApi.stopSession();
      setSummary(data);
      showToast('Приём заказов завершён');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  const isActive = sessionData?.isActive;
  const stats = sessionData?.stats;
  const menuCount = sessionData?.session?.dailyMenus?.length || 0;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Сессия заказов</h2>

      <div className={`status-banner ${isActive ? 'open' : 'closed'}`}>
        {isActive ? 'Заказы принимаются' : 'Заказы закрыты'}
      </div>

      {isActive && stats && (
        <div className="admin-stat-grid">
          <div className="card admin-stat">
            <div className="admin-stat-value">{stats.orderCount}</div>
            <div className="admin-stat-label">Заказов</div>
          </div>
          <div className="card admin-stat">
            <div className="admin-stat-value">
              ₽{stats.totalRevenue?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
            <div className="admin-stat-label">Выручка</div>
          </div>
        </div>
      )}

      {/* Живые заказы по группам — аккордеон: нажми на группу, увидишь блюда */}
      {isActive && stats?.groups?.length > 0 && (
        <div className="summary-section">
          <h3>Заказы по группам</h3>
          <div className="card">
            {stats.groups.map((g) => (
              <GroupExpandRow
                key={g.groupId}
                name={g.groupName}
                subtitle={`${g.orderCount} зак. · ₽${g.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}`}
                dishes={g.dishes}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Меню на сегодня</h3>
        <p className="text-sm text-muted">{menuCount} позиций</p>
      </div>

      {isActive ? (
        <button className="btn btn-danger big-action-btn" onClick={handleStop} disabled={actionLoading}>
          {actionLoading ? 'Завершение...' : 'Закончить приём заказов'}
        </button>
      ) : (
        <button className="btn btn-success big-action-btn" onClick={handleStart} disabled={actionLoading}>
          {actionLoading ? 'Запуск...' : 'Начать приём заказов'}
        </button>
      )}

      {/* Сводка после завершения */}
      {summary && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Сводка дня</h2>

          <div className="summary-total">
            <div className="summary-total-label">Общая выручка</div>
            <div className="summary-total-value">
              ₽{summary.totalRevenue?.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
            <div className="summary-total-label">Заказов: {summary.totalOrders}</div>
          </div>

          {summary.groups?.length > 0 && (
            <div className="summary-section">
              <h3>Группы</h3>
              <div className="card">
                {summary.groups.map((g) => (
                  <GroupExpandRow
                    key={g.groupId}
                    name={g.groupName}
                    subtitle={`${g.orderCount} зак. · ₽${g.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}`}
                    dishes={g.dishes}
                  />
                ))}
              </div>
            </div>
          )}

          {summary.teachers?.length > 0 && (
            <div className="summary-section">
              <h3>Преподаватели</h3>
              <div className="card">
                {summary.teachers.map((t, i) => (
                  <div className="summary-row" key={i}>
                    <span>{t.name} {t.surname}</span>
                    <span style={{ fontWeight: 600 }}>
                      {t.orderCount} заказ. / ₽{t.totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ===== Отчёты =====
function ReportsTab({ showToast }) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    canteenApi.dailyReport(date)
      .then(setReport)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Отчёты</h2>

      <div className="date-nav">
        <button onClick={() => changeDate(-1)}>←</button>
        <span className="date-label">{formatDateLabel()}</span>
        <button onClick={() => changeDate(1)}>→</button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : !report || report.totalRevenue === 0 ? (
        <div className="empty-state">
          <p>Нет данных за эту дату</p>
        </div>
      ) : (
        <>
          <div className="summary-total" style={{ marginBottom: 20 }}>
            <div className="summary-total-label">Выручка за день</div>
            <div className="summary-total-value">
              ₽{report.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Общая сводка по блюдам за день: все группы + преподаватели + доп-меню */}
          {report.dishes?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 12 }}>Всего заказано за день</h3>
              {report.dishes.map((d, i) => (
                <div className="summary-row" key={i}>
                  <span>{d.name}</span>
                  <span style={{ fontWeight: 600 }}>
                    {d.totalQuantity} порц. (₽{d.totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 0 })})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Группы */}
          {report.groups?.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Группы</h3>
              {report.groups.map((g) => (
                <div className="card group-card" key={g.groupId} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>{g.groupName}</h3>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      ₽{g.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-muted" style={{ margin: '0 0 8px' }}>
                    Заказов: {g.orderCount}
                  </p>
                  {g.dishes?.map((d, i) => (
                    <div className="summary-row" key={i}>
                      <span>{d.name}</span>
                      <span style={{ fontWeight: 600 }}>
                        {d.totalQuantity} порц. (₽{d.totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })})
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Преподаватели */}
          {report.teachers?.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Преподаватели</h3>
              <div className="card">
                {report.teachers.map((t) => (
                  <div className="summary-row" key={t.userId}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.name} {t.surname}</div>
                      <div className="text-xs text-muted">{t.position}</div>
                      <div className="text-xs text-muted">Заказов: {t.orderCount}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      ₽{t.totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
