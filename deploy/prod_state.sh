#!/bin/bash
# Состояние прода FoodOrderHub перед пилотным запуском.
docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
\echo === Группы ===
SELECT id, name, is_active FROM groups ORDER BY id;
\echo === Пользователи (по ролям) ===
SELECT role, status, COUNT(*) FROM users WHERE is_deleted = false GROUP BY role, status ORDER BY role;
\echo === Активные сессии заказов ===
SELECT id, session_date, is_active, started_at FROM order_sessions WHERE is_active = true;
\echo === Последние сессии ===
SELECT id, session_date, is_active FROM order_sessions ORDER BY id DESC LIMIT 5;
\echo === Блюда в меню активных сессий ===
SELECT dm.id, dm.item_name, dm.price, dm.max_quantity, dm.ordered_quantity
FROM daily_menus dm JOIN order_sessions s ON s.id = dm.session_id
WHERE s.is_active = true ORDER BY dm.id;
\echo === Справочник блюд (последние 10) ===
SELECT id, name, category FROM menu_items WHERE is_deleted = false ORDER BY id DESC LIMIT 10;
\echo === Заказы (всего) ===
SELECT COUNT(*) AS total_orders FROM orders;
\echo === Тестовый мусор (smoke/example/loadtest) ===
SELECT COUNT(*) AS test_users FROM users WHERE email LIKE '%example.com' OR email LIKE '%test%';
SELECT COUNT(*) AS smoke_dishes FROM menu_items WHERE name LIKE 'Smoke%';
SQL
