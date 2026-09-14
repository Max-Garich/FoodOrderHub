#!/bin/bash
# Подготовка данных для нагрузочного теста (стек foodloadtest, порт 3101).
# Создаёт: группу, 1000 ACTIVE-пользователей с балансом, активную сессию с 10 блюдами.
# Запуск на VPS: bash deploy/loadtest_setup.sh [N_USERS]
set -e

N_USERS="${1:-1000}"
APP=foodloadtest-app-1
DB=foodloadtest-db-1
PASS='pass1234'

# Ждём health (контейнер при старте делает prisma db push + seed)
echo "Жду готовности приложения..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3101/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done
curl -sf http://127.0.0.1:3101/api/health > /dev/null || { echo "Приложение не поднялось"; exit 1; }
echo "Приложение готово."

# bcrypt-хэш пароля — генерируем внутри контейнера приложения (там есть bcryptjs)
HASH=$(docker exec -w /app/server $APP node -e "console.log(require('bcryptjs').hashSync('$PASS',8))")
echo "Хэш пароля сгенерирован."

docker exec -i $DB psql -U foodorderhub -d foodorderhub <<SQL
-- Чистим возможные остатки прошлого прогона
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest%@test.local'));
DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest%@test.local');
DELETE FROM balance_history WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest%@test.local');
DELETE FROM balances WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest%@test.local');
DELETE FROM users WHERE email LIKE 'loadtest%@test.local';
DELETE FROM daily_menus WHERE session_id IN (SELECT id FROM order_sessions WHERE session_date = '2026-09-14' AND is_active = true);
DELETE FROM order_sessions WHERE session_date = '2026-09-14' AND is_active = true;
DELETE FROM groups WHERE name = 'Нагрузка';

-- Группа
INSERT INTO groups (name, payment_phone, payment_bank, is_active, created_at)
VALUES ('Нагрузка', '+70000000000', 'Тест', true, now());

-- N пользователей: сразу ACTIVE (минуя модерацию), с балансом
INSERT INTO users (email, password_hash, name, surname, role, status, group_id, is_deleted, created_at, updated_at)
SELECT 'loadtest' || g || '@test.local', '$HASH', 'Тест', 'Юзер' || g, 'USER', 'ACTIVE',
       (SELECT id FROM groups WHERE name = 'Нагрузка'), false, now(), now()
FROM generate_series(1, $N_USERS) g;

INSERT INTO balances (user_id, amount, updated_at)
SELECT id, 100000, now() FROM users WHERE email LIKE 'loadtest%@test.local';

-- Активная сессия заказов (создатель — супер-админ из сида, id=1)
INSERT INTO order_sessions (created_by_user_id, session_date, is_active, started_at)
VALUES (1, '2026-09-14', true, now());

-- 10 блюд с большим запасом порций
INSERT INTO daily_menus (session_id, item_name, category, price, max_quantity, ordered_quantity, is_additional, is_available, created_at)
SELECT (SELECT id FROM order_sessions WHERE is_active = true ORDER BY id DESC LIMIT 1),
       'Блюдо ' || g, 'Прочее', 50.0, 1000000, 0, false, true, now()
FROM generate_series(1, 10) g;
SQL

echo ""
echo "Готово:"
docker exec $DB psql -U foodorderhub -d foodorderhub -t -c "
  SELECT 'юзеров: ' || COUNT(*) FROM users WHERE email LIKE 'loadtest%@test.local';
  SELECT 'балансов: ' || COUNT(*) FROM balances WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest%@test.local');
  SELECT 'активных сессий: ' || COUNT(*) FROM order_sessions WHERE is_active = true;
  SELECT 'блюд в меню: ' || COUNT(*) FROM daily_menus WHERE session_id IN (SELECT id FROM order_sessions WHERE is_active = true);
"
