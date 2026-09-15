#!/bin/bash
# Инспекция блюд сессии 8 (кто и когда создавал) — разбор после случайного старта сессии скриптом.
docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
SELECT id, item_name, price, max_quantity, ordered_quantity, created_at
FROM daily_menus WHERE session_id = 8 ORDER BY id;
SQL
