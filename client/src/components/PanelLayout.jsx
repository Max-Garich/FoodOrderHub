import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const ROLE_TITLES = {
  MANAGER: 'Менеджер группы',
  CANTEEN_HEAD: 'Глава столовой',
  SUPER_ADMIN: 'Главный администратор',
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

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <span>🍽️</span>
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {topbarExtra}
          <ThemeToggle />
          {user?.role === 'MANAGER' && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
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
