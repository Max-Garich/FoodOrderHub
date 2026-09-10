import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle({ style }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Переключить тему"
      style={style}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${theme === 'dark' ? 'dark' : 'light'}`}>
          {theme === 'light' ? '☀' : '☾'}
        </span>
      </span>
    </button>
  );
}
