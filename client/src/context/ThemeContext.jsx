import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// Изначально тема подстраивается под системную (тёмная/светлая на устройстве).
// Если пользователь переключил тему вручную — его выбор хранится в localStorage
// (ключ themeChoice) и больше не зависит от системы.
// Важно: ключ записывается ТОЛЬКО при ручном переключении, поэтому у тех,
// кто ни разу не трогал переключатель, тема всегда следует за устройством.
function getInitialTheme() {
  const saved = localStorage.getItem('themeChoice');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeChoice', next); // фиксируем только ручной выбор
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
