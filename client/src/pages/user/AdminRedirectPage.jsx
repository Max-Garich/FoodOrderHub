import { useAuth, roleHome } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { adminPanelUrl } from '../../utils/adminUrl.js';

// Страница на ОСНОВНОМ сайте для админов (супер-админ, глава столовой).
// Их панели живут в отдельной админ-панели: https://admin.food-hub27.online
// (на проде) или http://<host>:3002 (локальная разработка / доступ по IP).
export default function AdminRedirectPage() {
  const { user, logout } = useAuth();

  const adminUrl = () => adminPanelUrl(roleHome(user)); // /admin, /canteen или /manager

  return (
    <div className="login-page">
      <ThemeToggle style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }} />
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo">
          <div className="logo-icon">🍽️</div>
          <h1>Вы вошли как администратор</h1>
          <p>Панели управления находятся в отдельной админ-панели</p>
        </div>
        <a className="btn btn-primary btn-block btn-lg" href={adminUrl()}>
          Открыть админ-панель
        </a>
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
