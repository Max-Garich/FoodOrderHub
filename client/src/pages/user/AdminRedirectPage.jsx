import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

// Адрес админ-панели (отдельный контейнер на порту 3002)
const ADMIN_URL =
  import.meta.env.VITE_ADMIN_URL || `${window.location.protocol}//${window.location.hostname}:3002`;

// Админ-роуты вынесены в отдельное приложение. Если SUPER_ADMIN / CANTEEN_HEAD
// входят на основной сайт — показываем ссылку на админ-панель.
export default function AdminRedirectPage() {
  const { logout } = useAuth();

  return (
    <div className="login-page">
      <ThemeToggle style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }} />
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🔐</div>
          <h1>Панель управления</h1>
          <p>Админ-панель находится на отдельном адресе</p>
        </div>

        <a className="btn btn-primary btn-block btn-lg" href={ADMIN_URL}>
          Перейти в админ-панель
        </a>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => { logout(); window.location.href = '/login'; }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
