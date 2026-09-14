#!/bin/bash
# Чистка тестовых данных FoodOrderHub перед пилотным запуском.
# УДАЛЯЕТ: все заказы, сессии, ежедневные меню, историю балансов (всё — тестовые),
#          юзеров-автотестов (smoke1, autotest*).
# СОХРАНЯЕТ: пользователей (кроме 2 мусорных), группы, справочник блюд,
#            балансы, избранное.
set -e

docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
BEGIN;

-- Юзеры-автотесты (сначала балансы и историю, потом самих)
DELETE FROM balances WHERE user_id IN (SELECT id FROM users WHERE email IN ('smoke1@example.com', 'autotest1789117839@example.com'));
DELETE FROM balance_history WHERE user_id IN (SELECT id FROM users WHERE email IN ('smoke1@example.com', 'autotest1789117839@example.com'));
DELETE FROM users WHERE email IN ('smoke1@example.com', 'autotest1789117839@example.com');

-- Транзакции: все заказы/сессии/меню — тестовая эпоха
DELETE FROM order_items;
DELETE FROM balance_history;  -- вся история балансов тестовая (балансы сохраняем!)
DELETE FROM orders;
DELETE FROM daily_menus;
DELETE FROM order_sessions;

COMMIT;

\echo === Итог после чистки ===
SELECT 'юзеров: ' || COUNT(*) FROM users WHERE is_deleted = false;
SELECT 'групп: ' || COUNT(*) FROM groups;
SELECT 'блюд в справочнике: ' || COUNT(*) FROM menu_items WHERE is_deleted = false;
SELECT 'заказов: ' || COUNT(*) FROM orders;
SELECT 'сессий: ' || COUNT(*) FROM order_sessions;
SELECT 'активных сессий: ' || COUNT(*) FROM order_sessions WHERE is_active = true;
SQL
