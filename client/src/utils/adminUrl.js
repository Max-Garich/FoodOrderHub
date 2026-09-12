// URL админ-панели.
// На проде (домен food-hub27.online) — https://admin.food-hub27.online,
// чтобы не светить порт :3002 и не ловить проблему «браузер подставляет
// https://...:3002, а там нет TLS».
// При локальной разработке / доступе по IP — старый вариант http://<host>:3002.
const PROD_DOMAIN = 'food-hub27.online';

export function adminPanelUrl(path = '') {
  const host = window.location.hostname;
  if (host === PROD_DOMAIN || host.endsWith(`.${PROD_DOMAIN}`)) {
    return `https://admin.${PROD_DOMAIN}${path}`;
  }
  return `${window.location.protocol}//${host}:3002${path}`;
}
