import { useState, useEffect, useCallback } from 'react';
import PanelLayout from '../../components/PanelLayout.jsx';
import { adminApi, managerApi, canteenApi } from '../../api/index.js';
import DishesTab from '../../components/DishesTab.jsx';

const TABS = [
  { id: 'groups', label: 'Группы' },
  { id: 'teachers', label: 'Преподаватели' },
  { id: 'users', label: 'Пользователи' },
  { id: 'dishes', label: 'Блюда' },
  { id: 'reports', label: 'Отчёты' },
];

const ROLES = [
  { value: 'USER', label: 'Пользователь' },
  { value: 'TEACHER', label: 'Преподаватель' },
  { value: 'MANAGER', label: 'Менеджер группы' },
  { value: 'CANTEEN_HEAD', label: 'Глава столовой' },
  { value: 'SUPER_ADMIN', label: 'Главный администратор' },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

export default function SuperAdminPanel() {
  const [tab, setTab] = useState('groups');
  const [toast, setToast] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);

  // useCallback — стабильная ссылка, иначе дочерние useEffect([showToast]) ушли бы в бесконечный цикл
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Счётчик всех заявок для кнопки сверху
  const refreshRequestsCount = useCallback(async () => {
    try {
      setRequestsCount((await managerApi.requests()).length);
    } catch {
      /* не критично */
    }
  }, []);

  useEffect(() => { refreshRequestsCount(); }, [refreshRequestsCount, tab, showRequests]);

  return (
    <PanelLayout
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      topbarExtra={
        <button className="btn btn-ghost btn-sm topbar-requests-btn" onClick={() => setShowRequests(true)}>
          <span className="topbar-requests-full">Все заявки</span>
          <span className="topbar-requests-short">Заявки</span>
          {requestsCount > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 6 }}>{requestsCount}</span>
          )}
        </button>
      }
    >
      <div className="page page-admin">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        {tab === 'groups' && <GroupsTab showToast={showToast} />}
        {tab === 'teachers' && <TeachersTab showToast={showToast} />}
        {tab === 'users' && <UsersTab showToast={showToast} />}
        {tab === 'dishes' && <DishesTab showToast={showToast} />}
        {tab === 'reports' && <ReportsTab showToast={showToast} />}
        {showRequests && (
          <AllRequestsModal
            onClose={() => setShowRequests(false)}
            onChanged={refreshRequestsCount}
            showToast={showToast}
          />
        )}
      </div>
    </PanelLayout>
  );
}

// ===== Все заявки (модалка по кнопке сверху): имя, фамилия, email, группа =====
function AllRequestsModal({ onClose, onChanged, showToast }) {
  const [requests, setRequests] = useState(null);

  const load = useCallback(async () => {
    try {
      setRequests(await managerApi.requests());
    } catch (err) {
      showToast(err.message, 'error');
      setRequests([]);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id) => {
    try {
      const res = await managerApi.acceptRequest(id);
      showToast(res.message);
      await load();
      onChanged();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Отклонить заявку?')) return;
    try {
      const res = await managerApi.rejectRequest(id);
      showToast(res.message);
      await load();
      onChanged();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay modal-center" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Все заявки</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {requests === null ? (
          <div className="loader"><div className="spinner"></div></div>
        ) : requests.length === 0 ? (
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
                    {r.role === 'TEACHER' && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Преподаватель</span>}
                  </div>
                  <div className="text-sm text-muted">{r.email}</div>
                  <div className="text-xs text-muted">
                    {r.role === 'TEACHER'
                      ? (r.position || 'Без должности')
                      : `Группа: ${r.group?.name || '—'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.id)}>Принять</button>
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
      </div>
    </div>
  );
}

// ===== Группы: главный экран с кнопками + детальная страница группы =====
const pluralRequests = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заявка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'заявки';
  return 'заявок';
};

function GroupsTab({ showToast }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBank, setEditBank] = useState('');

  const load = useCallback(async (silent = false) => {
    try {
      setGroups(await adminApi.groups());
    } catch (err) {
      if (!silent) showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Живое обновление счётчика «сегодня заказали» (раз в 30 сек, тихо — без тостов)
  useEffect(() => {
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleToggleActive = async (g) => {
    try {
      await adminApi.updateGroup(g.id, { name: g.name, paymentPhone: g.paymentPhone, paymentBank: g.paymentBank, isActive: !g.isActive });
      showToast(g.isActive ? 'Группа деактивирована' : 'Группа активирована');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEdit = (g) => {
    setEditId(g.id);
    setEditName(g.name);
    setEditPhone(g.paymentPhone || '');
    setEditBank(g.paymentBank || '');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateGroup(editId, { name: editName, paymentPhone: editPhone, paymentBank: editBank });
      setEditId(null);
      showToast('Группа обновлена');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  // ═══ Детальная страница группы ═══
  if (selectedGroupId !== null) {
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return null;
    return (
      <GroupDetail
        group={group}
        onBack={() => { setSelectedGroupId(null); load(); }}
        reload={load}
        showToast={showToast}
      />
    );
  }

  // ═══ Главный экран: кнопки групп ═══
  return (
    <>
      <div className="page-header">
        <h2>Группы</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Скрыть форму' : 'Новая группа'}
        </button>
      </div>

      {/* Сетка кнопок групп */}
      <div className="groups-grid">
        {groups.map((g) => (
          <button
            key={g.id}
            className={`group-btn ${!g.isActive ? 'inactive' : ''}`}
            onClick={() => setSelectedGroupId(g.id)}
          >
            <span className="group-btn-name">{g.name}</span>
            <span className="group-btn-meta">
              {g.memberCount} участник(ов)
              {g.managerName && <span className="text-xs text-muted"> · менеджер: {g.managerName}</span>}
              {g.pendingCount > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                  {g.pendingCount} {pluralRequests(g.pendingCount)}
                </span>
              )}
            </span>
            {g.todayOrderedPeople > 0 && (
              <span className="badge badge-success" style={{ marginTop: 6 }}>
                🍽 Сегодня заказали: {g.todayOrderedPeople} чел.
              </span>
            )}
            {!g.isActive && <span className="badge badge-danger" style={{ marginTop: 6 }}>Неактивна</span>}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="empty-state">
          <p>Групп пока нет. Создайте первую.</p>
        </div>
      )}

      {/* Управление группами (редактирование/вкл-выкл) */}
      <h3 style={{ margin: '24px 0 12px' }}>Управление группами</h3>
      {groups.map((g) => (
        <div className="card" key={g.id} style={{ marginBottom: 12 }}>
          {editId === g.id ? (
            <form onSubmit={handleEdit}>
              <div className="input-group">
                <label>Название</label>
                <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="input-group" style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Телефон</label>
                  <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Банк</label>
                  <input className="input" value={editBank} onChange={(e) => setEditBank(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" type="submit">Сохранить</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditId(null)}>Отмена</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{g.name}</div>
                <div className="text-sm text-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{g.paymentPhone || 'телефон не задан'}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>· {g.paymentBank || 'банк не задан'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(g)}>Изменить</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(g)}>
                  {g.isActive ? 'Отключить' : 'Включить'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Форма создания */}
      {showCreate && <CreateGroupForm showToast={showToast} onCreated={() => { setShowCreate(false); load(); }} />}
    </>
  );
}

// ===== Форма создания группы =====
function CreateGroupForm({ showToast, onCreated }) {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBank, setNewBank] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName) return;
    setSaving(true);
    try {
      await adminApi.createGroup({ name: newName, paymentPhone: newPhone, paymentBank: newBank });
      setNewName(''); setNewPhone(''); setNewBank('');
      showToast('Группа создана');
      onCreated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 12 }}>Новая группа</h3>
      <form onSubmit={handleCreate}>
        <div className="input-group">
          <label>Название</label>
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Группа 104" required />
        </div>
        <div className="input-group" style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Телефон для оплаты</label>
            <input className="input" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+79001234567" />
          </div>
          <div style={{ flex: 1 }}>
            <label>Банк</label>
            <input className="input" value={newBank} onChange={(e) => setNewBank(e.target.value)} placeholder="Сбербанк" />
          </div>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? 'Создание...' : 'Создать группу'}
        </button>
      </form>
    </div>
  );
}

// ===== Детальная страница группы: участники, заказы, заявки =====
function GroupDetail({ group, onBack, reload, showToast }) {
  const [tab, setTab] = useState('members');
  const today = new Date().toISOString().split('T')[0];

  const TABS = [
    { id: 'members', label: 'Участники' },
    { id: 'orders', label: 'Заказы' },
    { id: 'requests', label: 'Заявки' },
  ];

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={onBack}>
        ← Все группы
      </button>

      <div className="summary-total" style={{ marginBottom: 16 }}>
        <div className="summary-total-label">Оплата группы</div>
        <div className="summary-total-value" style={{ fontSize: '1.375rem' }}>{group.name}</div>
        <div className="summary-total-label" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 6px' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{group.paymentPhone || 'телефон не задан'}</span>
          <span style={{ whiteSpace: 'nowrap' }}>· {group.paymentBank || 'банк не задан'}</span>
        </div>
      </div>

      <GroupManagerCard group={group} onChanged={reload} showToast={showToast} />

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && <GroupMembers groupId={group.id} showToast={showToast} />}
      {tab === 'orders' && <GroupOrders groupId={group.id} date={today} showToast={showToast} />}
      {tab === 'requests' && <GroupRequests groupId={group.id} showToast={showToast} />}
    </>
  );
}

// ===== Менеджер группы: показать текущего и назначить преподавателя =====
function GroupManagerCard({ group, onChanged, showToast }) {
  const [teachers, setTeachers] = useState(null);
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.teachers()
      .then((list) => setTeachers(list.filter((t) => t.status === 'ACTIVE')))
      .catch(() => setTeachers([]));
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!userId) return;
    if (!confirm(`Назначить менеджером группы «${group.name}»? Прежний менеджер (если был) станет обычным участником.`)) return;
    setSaving(true);
    try {
      const res = await adminApi.assignManager(group.id, parseInt(userId));
      showToast(res.message);
      setUserId('');
      onChanged?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Менеджер группы</h3>
      <p className="text-sm text-muted" style={{ margin: '0 0 12px' }}>
        {group.managerName
          ? `Текущий менеджер: ${group.managerName}`
          : 'Менеджер не назначен'}
      </p>
      {teachers === null ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          Нет активных преподавателей. Сначала примите заявку преподавателя во вкладке «Преподаватели».
        </p>
      ) : (
        <form onSubmit={handleAssign} style={{ display: 'flex', gap: 8 }}>
          <select
            className="input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            <option value="" disabled>Выберите преподавателя</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.surname}{t.position ? ` — ${t.position}` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving || !userId} style={{ flexShrink: 0 }}>
            {saving ? '...' : 'Назначить'}
          </button>
        </form>
      )}
    </div>
  );
}

// ===== Участники группы: список, балансы, пополнение =====
function GroupMembers({ groupId, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topupUser, setTopupUser] = useState(null);
  const [topupMode, setTopupMode] = useState('add');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupComment, setTopupComment] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await managerApi.users(groupId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

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

  const handleDelete = async (id) => {
    if (!confirm('Удалить пользователя из системы? (История заказов сохранится)')) return;
    try {
      await adminApi.deleteUser(id);
      showToast('Пользователь удалён');
      load();
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
      const res = await adminApi.resetPassword(resetUser.id, newPassword);
      showToast(res.message);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return `${u.name} ${u.surname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <input
        className="input"
        style={{ marginBottom: 16 }}
        placeholder="Поиск по имени или email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>В группе пока нет участников</p>
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
                  <span className={`badge ${(u.balance ?? 0) > 0 ? 'badge-success' : 'badge-danger'}`}>
                    ₽{(u.balance ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
                <button className="btn btn-ghost btn-sm" onClick={() => setResetUser(u)}>Пароль</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(u.id)}>
                  Удалить
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

            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, textAlign: 'center' }}>
              <div className="text-sm text-muted">Текущий баланс</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                ₽{(topupUser.balance ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['100', '200', '500', '1000'].map(amt => (
                  <button key={amt} type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setTopupAmount(amt)}>
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
                    ₽{((topupUser.balance ?? 0) + (topupMode === 'add' ? 1 : -1) * parseFloat(topupAmount || 0)).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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

      {/* Модалка смены пароля */}
      {resetUser && (
        <div className="modal-overlay modal-center" onClick={() => setResetUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Смена пароля</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{resetUser.name} {resetUser.surname}</p>
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label>Новый пароль</label>
                <input className="input" type="text" placeholder="Введите новый пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus minLength={4} />
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Минимум 4 символа</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => { setResetUser(null); setNewPassword(''); }}>Отмена</button>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={resetLoading}>{resetLoading ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Заказы группы за дату (с редактированием позиций) =====
function GroupOrders({ groupId, date, showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    try {
      setOrders(await managerApi.groupOrders(date, groupId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [date, groupId, showToast]);

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
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>Заказов за сегодня нет</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="card" key={order.id} style={{ marginBottom: 12 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
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
                <input className="input" type="number" min="0" value={editQty} onChange={(e) => setEditQty(e.target.value)} required autoFocus />
              </div>
              <div className="input-group">
                <label>Цена за порцию (₽)</label>
                <input className="input" type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
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

// ===== Заявки группы (приём/отклонение) =====
function GroupRequests({ groupId, showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRequests(await managerApi.requests(groupId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

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

  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <p>Новых заявок в эту группу нет</p>
      </div>
    );
  }

  return requests.map((r) => (
    <div className="card" key={r.id} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            {r.name} {r.surname}
            {r.role === 'TEACHER' && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Преподаватель</span>}
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
  ));
}

// ===== Преподаватели: активные, заявки, история заказов =====
function TeachersTab({ showToast }) {
  const [teachers, setTeachers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        adminApi.teachers(date),
        managerApi.requests(),
      ]);
      setTeachers(t);
      // Фильтруем заявки — только преподаватели
      setRequests(r.filter(x => x.role === 'TEACHER'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, date]);

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
    if (!confirm('Отклонить заявку преподавателя?')) return;
    try {
      const res = await managerApi.rejectRequest(id);
      showToast(res.message);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить пользователя из системы? (История заказов сохранится)')) return;
    try {
      await adminApi.deleteUser(id);
      showToast('Пользователь удалён');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showToast('Пароль не менее 4 символов', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await adminApi.resetPassword(resetUser.id, newPassword);
      showToast('Пароль обновлён');
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const changeDate = (delta) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = () => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Преподаватели</h2>

      {/* Активные преподаватели */}
      <h3 style={{ marginBottom: 12 }}>Активные</h3>
      {teachers.filter(t => t.status === 'ACTIVE').length === 0 ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="text-muted">Активных преподавателей нет</p>
        </div>
      ) : (
        teachers.filter(t => t.status === 'ACTIVE').map((t) => (
          <div className="card" key={t.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {t.name} {t.surname}
                  <span className="badge badge-primary" style={{ marginLeft: 8 }}>Преподаватель</span>
                </div>
                <div className="text-sm text-muted">{t.email}</div>
                {t.position && <div className="text-xs text-muted">{t.position}</div>}
                <div style={{ marginTop: 6 }}>
                  <span className="badge badge-success">
                    Заказов: {t.orderCount} · ₽{t.totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setResetUser(t)}>Пароль</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(t.id)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Заявки от преподавателей */}
      <h3 style={{ margin: '24px 0 12px' }}>Заявки на подключение</h3>
      {requests.length === 0 ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="text-muted">Новых заявок от преподавателей нет</p>
        </div>
      ) : (
        requests.map((r) => (
          <div className="card" key={r.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {r.name} {r.surname}
                  <span className="badge badge-primary" style={{ marginLeft: 8 }}>Преподаватель</span>
                </div>
                <div className="text-sm text-muted">{r.email}</div>
                {r.position && <div className="text-xs text-muted">{r.position}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.id)}>Принять</button>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleReject(r.id)}>Отклонить</button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* История заказов преподавателей */}
      <h3 style={{ margin: '24px 0 12px' }}>История заказов</h3>
      <div className="date-nav">
        <button onClick={() => changeDate(-1)}>←</button>
        <span className="date-label">{formatDateLabel()}</span>
        <button onClick={() => changeDate(1)}>→</button>
      </div>

      {teachers.filter(t => t.orderCount > 0).length === 0 ? (
        <div className="card">
          <p className="text-muted">Заказов за эту дату нет</p>
        </div>
      ) : (
        teachers.filter(t => t.orderCount > 0).map((t) => (
          <div className="card" key={t.id} style={{ marginBottom: 12 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedOrders(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.name} {t.surname}</div>
                <div className="text-xs text-muted">{t.position}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="text-sm text-muted">{t.orderCount} заказ(ов)</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  ₽{t.totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </span>
                <span style={{
                  transform: expandedOrders[t.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s', fontSize: '0.8rem', color: 'var(--text-muted)'
                }}>▶</span>
              </div>
            </div>

            {expandedOrders[t.id] && t.orders.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                {t.orders.map((order) => (
                  <div key={order.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span className="text-muted">
                        {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontWeight: 700 }}>₽{order.totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {order.items.map(i => `${i.itemName} ×${i.quantity}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Модалка сброса пароля */}
      {resetUser && (
        <div className="modal-overlay modal-center" onClick={() => setResetUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Смена пароля</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{resetUser.name} {resetUser.surname}</p>
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label>Новый пароль</label>
                <input className="input" type="text" placeholder="Введите новый пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus minLength={4} />
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Минимум 4 символа</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => { setResetUser(null); setNewPassword(''); }}>Отмена</button>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={resetLoading}>{resetLoading ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Пользователи =====
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, g] = await Promise.all([adminApi.users(), adminApi.groups()]);
      setUsers(u);
      setGroups(g);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (id, role) => {
    if (!confirm(`Назначить роль «${ROLE_LABELS[role]}»?`)) return;
    try {
      const res = await adminApi.setUserRole(id, role);
      showToast(res.message);
      load();
    } catch (err) {
      showToast(err.message, 'error');
      load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить пользователя из системы? (История заказов сохранится)')) return;
    try {
      await adminApi.deleteUser(id);
      showToast('Пользователь удалён');
      load();
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
      const res = await adminApi.resetPassword(resetUser.id, newPassword);
      showToast(res.message);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const groupName = (groupId) => groups.find(g => g.id === groupId)?.name || '—';

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return `${u.name} ${u.surname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Пользователи</h2>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {u.name} {u.surname}
                  {u.status === 'PENDING' && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Ожидает</span>}
                  {u.status === 'REJECTED' && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Отклонён</span>}
                </div>
                <div className="text-sm text-muted">{u.email}</div>
                <div className="text-xs text-muted">
                  {u.role === 'TEACHER'
                    ? `Преподаватель · ${u.position || 'без должности'}`
                    : `Группа: ${groupName(u.groupId)}`}
                </div>
                {u.balance !== null && (
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${u.balance > 0 ? 'badge-success' : 'badge-danger'}`}>
                      ₽{u.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 150 }}>
                <select
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => setResetUser(u)}>
                  Пароль
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(u.id)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Модалка сброса пароля */}
      {resetUser && (
        <div className="modal-overlay modal-center" onClick={() => setResetUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Смена пароля</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>{resetUser.name} {resetUser.surname}</p>

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
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={resetLoading}>
                  {resetLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Отчёты (те же отчёты главы столовой) =====
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
