#!/bin/bash
# Откат теста назначения менеджера (deploy/verify_manager.py):
# возвращаем pre@gmail.com роль TEACHER без группы и удаляем его тестовый баланс.
docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub <<'SQL'
BEGIN;
UPDATE users SET role = 'TEACHER', group_id = NULL WHERE email = 'pre@gmail.com';
DELETE FROM balances WHERE user_id = (SELECT id FROM users WHERE email = 'pre@gmail.com');
COMMIT;
SELECT email, role, group_id FROM users WHERE email = 'pre@gmail.com';
SQL
