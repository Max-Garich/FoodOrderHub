// Бесшовный переход между юзер-сайтом и админ-панелью (разные домены/origins,
// localStorage у каждого свой). Отправляющая сторона добавляет к ссылке
// #token=<jwt>, принимающая — до монтирования React — сохраняет токен
// и вычищает hash из адресной строки (history.replaceState, без перезагрузки).
//
// Токен передаётся в hash, а не в query: fragment не уходит на сервер
// и не попадает в access-логи nginx. JWT живёт 4 часа, после истечения
// принимающая сторона просто покажет страницу входа.

// Вызвать в main.jsx / main-admin.jsx ДО createRoot().render(...).
// Возвращает true, если токен был принят.
export function consumeTokenFromHash() {
  try {
    const m = window.location.hash.match(/[#&]token=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    if (!m) return false;

    localStorage.setItem('token', m[1]);
    // Старый профиль мог быть от другого аккаунта/сессии — вычищаем,
    // AuthProvider подтянет свежий по токену (пока грузится — спиннер)
    localStorage.removeItem('user');
    // Убираем token из hash, не оставляя его в истории браузера
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return true;
  } catch {
    return false;
  }
}

// Ссылка с токеном для перехода на другой сайт (null, если токена нет)
export function withToken(url) {
  const token = localStorage.getItem('token');
  return token ? `${url}#token=${token}` : url;
}
