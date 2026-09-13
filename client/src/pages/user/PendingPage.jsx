import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

// Лёгкие inline SVG-градиенты (data-URI) — «тарелки» на тёплых градиентах, не грузят телефон
function makeSlide(g1, g2, accent) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1200'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${g1}'/>
      <stop offset='1' stop-color='${g2}'/>
    </linearGradient>
    <radialGradient id='plate' cx='0.5' cy='0.5'>
      <stop offset='0' stop-color='#ffffff' stop-opacity='0.32'/>
      <stop offset='0.75' stop-color='#ffffff' stop-opacity='0.10'/>
      <stop offset='1' stop-color='#ffffff' stop-opacity='0.22'/>
    </radialGradient>
  </defs>
  <rect width='800' height='1200' fill='url(#bg)'/>
  <circle cx='400' cy='540' r='270' fill='url(#plate)'/>
  <circle cx='400' cy='540' r='200' fill='none' stroke='#ffffff' stroke-opacity='0.30' stroke-width='3'/>
  <circle cx='400' cy='540' r='95' fill='${accent}' fill-opacity='0.35'/>
  <circle cx='400' cy='540' r='42' fill='#ffffff' fill-opacity='0.30'/>
  <circle cx='140' cy='940' r='55' fill='#ffffff' fill-opacity='0.10'/>
  <circle cx='660' cy='210' r='85' fill='#ffffff' fill-opacity='0.08'/>
  <circle cx='700' cy='1020' r='35' fill='#ffffff' fill-opacity='0.12'/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const SLIDES = [
  makeSlide('#FF6B2C', '#1B3A4B', '#FFB38A'),
  makeSlide('#1B3A4B', '#F59E0B', '#1B3A4B'),
  makeSlide('#B23A0F', '#0F2A38', '#FFD9A8'),
  makeSlide('#E85D22', '#2C5A6E', '#FFE8CE'),
];

export default function PendingPage() {
  const { user, loading, isAuthenticated, logout, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const checkStatus = useCallback(async () => {
    setChecking(true);
    const profile = await refreshProfile();
    setChecking(false);
    if (profile && profile.status === 'ACTIVE') {
      navigate('/', { replace: true });
    }
  }, [refreshProfile, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user && user.status !== 'PENDING') {
      navigate('/', { replace: true });
      return;
    }
    // Автопроверка раз в 30 секунд
    const interval = setInterval(() => {
      refreshProfile().then((p) => {
        if (p && p.status === 'ACTIVE') navigate('/', { replace: true });
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, isAuthenticated, user, navigate, refreshProfile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading || !user) {
    return <div className="loader"><div className="spinner"></div></div>;
  }

  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="pending-page">
      {/* Слайдшоу: 4 слайда, crossfade 1.5s, интервал 4s */}
      <div className="pending-slides">
        {SLIDES.map((bg, i) => (
          <div key={i} className="pending-slide" style={{ backgroundImage: bg, animationDelay: `${i * 4}s` }} />
        ))}
      </div>

      <ThemeToggle style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }} />

      <div className="pending-card glass">
        <div className="logo-icon"><img src="/logo.png" alt="Логотип Ирбитского политехникума" /></div>
        <h1>Заявка отправлена</h1>
        <p className="pending-text">
          {isTeacher
            ? 'Заявку преподавателя рассматривает главный администратор.'
            : 'Дождитесь, пока менеджер вас подключит.'}
        </p>
        <p className="pending-sub">
          {user.name} {user.surname}{isTeacher && user.position ? ` — ${user.position}` : ''}
        </p>

        <button
          className="btn btn-primary btn-block"
          onClick={checkStatus}
          disabled={checking}
        >
          {checking ? 'Проверка...' : 'Обновить статус'}
        </button>
        <button className="btn btn-ghost btn-block" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
