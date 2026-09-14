#!/bin/bash
# Список пользователей прода (email/роль/статус/баланс) — перед чисткой тестовых данных.
docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
SELECT u.id, u.email, u.name || ' ' || u.surname AS fio, u.role, u.status,
       COALESCE(b.amount, 0) AS balance, g.name AS grp
FROM users u
LEFT JOIN balances b ON b.user_id = u.id
LEFT JOIN groups g ON g.id = u.group_id
WHERE u.is_deleted = false
ORDER BY u.id;
SQL
