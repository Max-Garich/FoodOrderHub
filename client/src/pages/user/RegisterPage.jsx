import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, groupsApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

const CYRILLIC_RE = /^[А-ЯЁа-яё]+(?:[ -][А-ЯЁа-яё]+)*$/;

function validateCyrillic(value, field) {
  if (!value.trim()) return `Заполните поле «${field}»`;
  if (!CYRILLIC_RE.test(value.trim())) {
    return `«${field}» — только кириллица (буквы, пробел или дефис)`;
  }
  return null;
}

export default function RegisterPage() {
  const [mode, setMode] = useState('student'); // student | teacher
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    groupsApi.list()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидация кириллицы
    const nameErr = validateCyrillic(name, 'Имя');
    if (nameErr) return setError(nameErr);
    const surnameErr = validateCyrillic(surname, 'Фамилия');
    if (surnameErr) return setError(surnameErr);

    if (mode === 'student' && !groupId) {
      return setError('Выберите группу');
    }
    if (mode === 'teacher' && !position.trim()) {
      return setError('Заполните поле «Должность»');
    }

    setLoading(true);
    try {
      const body = mode === 'student'
        ? { name: name.trim(), surname: surname.trim(), email, password, groupId: parseInt(groupId) }
        : { name: name.trim(), surname: surname.trim(), email, password, position: position.trim() };
      const data = mode === 'student'
        ? await authApi.register(body)
        : await authApi.registerTeacher(body);
      login(data);
      navigate('/pending');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <ThemeToggle style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }} />
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🍽️</div>
          <h1>foodIPThub</h1>
          <p>Пара парой, а обед по расписанию</p>
        </div>

        {/* Переключатель Студент / Преподаватель */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-btn ${mode === 'student' ? 'active' : ''}`}
            onClick={() => { setMode('student'); setError(''); }}
          >
            Студент
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'teacher' ? 'active' : ''}`}
            onClick={() => { setMode('teacher'); setError(''); }}
          >
            Преподаватель
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Имя</label>
            <input
              className="input"
              type="text"
              placeholder="Иван"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Фамилия</label>
            <input
              className="input"
              type="text"
              placeholder="Петров"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>

          {mode === 'student' ? (
            <div className="input-group">
              <label>Группа</label>
              {groups.length === 0 ? (
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Нет активных групп. Регистрация временно недоступна.
                </p>
              ) : (
                <select
                  className="input"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  required
                >
                  <option value="" disabled>Выберите группу</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="input-group">
              <label>Должность</label>
              <input
                className="input"
                type="text"
                placeholder="Преподаватель математики"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Пароль</label>
            <input
              className="input"
              type="password"
              placeholder="Минимум 4 символа"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              required
            />
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            type="submit"
            disabled={loading || (mode === 'student' && groups.length === 0)}
          >
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="login-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>

      <div className="login-seo">
        <p>Регистрация в foodIPThub — сервисе заказа еды в столовой Ирбитского политехникума (ИПТ).</p>
      </div>
    </div>
  );
}
