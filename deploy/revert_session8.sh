#!/bin/bash
# Откат случайного старта сессии 8 скриптом verify_people_count.py (15.09.2026).
# Сессия 8 — черновик меню, который Джокер готовил вручную (блюда 20-34).
# Скрипт проверки добавил блюдо 35 «Проверка Людей» и запустил сессию.
# Здесь: удаляем блюдо 35 и возвращаем сессию в состояние черновика.
# Реальные данные (блюда 20-34, заказы в сессиях 5-6) НЕ трогаем.
set -e

docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
BEGIN;

-- Удаляем тестовое блюдо скрипта (заказов по нему нет)
DELETE FROM daily_menus WHERE session_id = 8 AND item_name = 'Проверка Людей';

-- Возвращаем сессию 8 в состояние черновика (как было до случайного старта)
UPDATE order_sessions
SET is_active = false, started_at = NULL, ended_at = NULL
WHERE id = 8;

COMMIT;

\echo === Состояние после отката ===
SELECT id, session_date, is_active, started_at, ended_at,
  (SELECT COUNT(*) FROM daily_menus dm WHERE dm.session_id = s.id) AS dishes,
  (SELECT COUNT(*) FROM orders o WHERE o.session_id = s.id) AS orders
FROM order_sessions s ORDER BY id;
SQL
