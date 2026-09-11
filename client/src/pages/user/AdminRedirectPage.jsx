import { useAuth, roleHome } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

// Страница на ОСНОВНОМ сайте (:3001) для админов (супер-админ, глава столовой).
// Их панели живут в отдельной админ-панели на порту 3002.
export default function AdminRedirectPage() {
  const { user, logout } = useAuth();

  const adminUrl = () => {
    const path = roleHome(user); // /admin, /canteen или /manager
    return `${window.location.protocol}//${window.location.hostname}:3002${path}`;
  };

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
