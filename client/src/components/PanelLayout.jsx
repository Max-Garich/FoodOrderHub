import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { mainSiteUrl } from '../utils/adminUrl.js';

const ROLE_TITLES = {
  MANAGER: 'Менеджер группы',
  CANTEEN_HEAD: 'Глава столовой',
  SUPER_ADMIN: 'Главный администратор',
};

// Короткие заголовки для узких экранов (иначе topbar не влезает)
const ROLE_TITLES_SHORT = {
  MANAGER: 'Менеджер',
  CANTEEN_HEAD: 'Столовая',
  SUPER_ADMIN: 'Админ',
};

// Общий layout для панелей ролей: topbar (роль + «На сайт» для менеджера + выход)
// и bottom-nav с вкладками текущей панели (табы — внутреннее состояние панели)
export default function PanelLayout({ tabs, activeTab, onTabChange, topbarExtra, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const title = ROLE_TITLES[user?.role] || 'Панель управления';
  const titleShort = ROLE_TITLES_SHORT[user?.role] || 'Панель';

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <span>🍽️</span>
          <span className="topbar-title-full">{title}</span>
          <span className="topbar-title-short">{titleShort}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {topbarExtra}
          <ThemeToggle />
          {user?.role === 'MANAGER' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { window.location.href = mainSiteUrl('/'); }}
              title="Перейти на основной сайт в режиме участника и заказать обед"
            >
              Заказать обед
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>

      {children}

      <nav className="bottom-nav panel-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
