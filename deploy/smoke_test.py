#!/usr/bin/env python3
"""Smoke-тест API FoodOrderHub на VPS через SSH."""
import sys
import json
import os
import paramiko

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, 'creds.json'), 'r', encoding='utf-8') as f:
    creds = json.load(f)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(creds['host'], username=creds['user'], password=creds['password'],
               timeout=15, look_for_keys=False, allow_agent=False)

# Скрипт smoke-теста на bash (экранирование JSON в bash проще через heredoc)
SMOKE = r'''
BASE=http://localhost:3001
PASS=0; FAIL=0
check() {
  local name="$1"; local expect="$2"; local actual="$3"
  if echo "$actual" | grep -q "$expect"; then PASS=$((PASS+1)); echo "OK   $name";
  else FAIL=$((FAIL+1)); echo "FAIL $name — ожидал '$expect', получено: $(echo $actual | head -c 120)"; fi
}

# 1. Health
R=$(curl -s $BASE/api/health)
check "health" '"status":"ok"' "$R"

# 2. Логин супер-админа
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"superadmin@foodorderhub.ru","password":"super123"}')
check "login superadmin" '"role":"SUPER_ADMIN"' "$R"
TOKEN=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])" 2>/dev/null)
AUTH="Authorization: Bearer $TOKEN"

# 3. Список групп (публичный)
R=$(curl -s $BASE/api/groups)
check "groups list" 'Группа 101' "$R"

# 4. Админские группы со счётчиками
R=$(curl -s -H "$AUTH" $BASE/api/admin/groups)
check "admin groups" 'memberCount' "$R"

# 5. Логин главы столовой
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"canteen@foodorderhub.ru","password":"canteen123"}')
check "login canteen" '"role":"CANTEEN_HEAD"' "$R"

# 6. Логин менеджера
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"manager101@foodorderhub.ru","password":"manager123"}')
check "login manager" '"role":"MANAGER"' "$R"
MTOKEN=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])" 2>/dev/null)
MAUTH="Authorization: Bearer $MTOKEN"

# 7. Логин юзера
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"user123"}')
check "login user" '"role":"USER"' "$R"
UTOKEN=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])" 2>/dev/null)
UAUTH="Authorization: Bearer $UTOKEN"

# 8. Менеджер: список юзеров группы
R=$(curl -s -H "$MAUTH" $BASE/api/manager/users)
check "manager users" 'test@example.com' "$R"

# 9. Менеджер: заявки
R=$(curl -s -H "$MAUTH" $BASE/api/manager/requests)
check "manager requests" 'pending@example.com' "$R"

# 10. Менеджер: принять заявку pending@example.com
PID=$(echo "$R" | python3 -c "import sys,json;print([x['id'] for x in json.load(sys.stdin) if x['email']=='pending@example.com'][0])" 2>/dev/null)
if [ -n "$PID" ]; then
  R=$(curl -s -X POST -H "$MAUTH" $BASE/api/manager/requests/$PID/accept)
  check "accept pending user" 'принята' "$R"
else
  echo "SKIP accept (заявка уже принята ранее)"
fi

# 11. Менеджер: пополнить баланс test@example.com на 500 (ищем ID динамически)
TID=$(curl -s -H "$MAUTH" $BASE/api/manager/users | python3 -c "import sys,json;print([x['id'] for x in json.load(sys.stdin) if x['email']=='test@example.com'][0])" 2>/dev/null)
if [ -n "$TID" ]; then
  R=$(curl -s -X POST -H "$MAUTH" -H 'Content-Type: application/json' -d '{"amount":500,"comment":"smoke test"}' $BASE/api/manager/users/$TID/topup)
  check "topup 500" 'newBalance' "$R"
else
  echo "FAIL topup — test@example.com не найден"; FAIL=$((FAIL+1))
fi

# 12. Глава столовой: создать позицию меню с лимитом
R=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"canteen@foodorderhub.ru","password":"canteen123"}')
CTOKEN=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])" 2>/dev/null)
CAUTH="Authorization: Bearer $CTOKEN"
R=$(curl -s -X POST -H "$CAUTH" -H 'Content-Type: application/json' -d '{"itemName":"Smoke Борщ","price":100,"category":"Супы","maxQuantity":10}' $BASE/api/canteen/menu/daily)
check "canteen add menu item" 'Smoke' "$R"

# 13. Старт сессии
R=$(curl -s -X POST -H "$CAUTH" $BASE/api/canteen/sessions/start)
check "session start" 'начат' "$R"

# 14. Юзер: меню сегодня (должна быть позиция с remaining)
R=$(curl -s -H "$UAUTH" $BASE/api/menu/today)
check "menu today" 'remaining' "$R"
MID=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print([i['id'] for i in d['items'] if i['itemName']=='Smoke Борщ'][0])" 2>/dev/null)

# 15. Юзер: заказать 2 порции
if [ -n "$MID" ]; then
  R=$(curl -s -X POST -H "$UAUTH" -H 'Content-Type: application/json' -d "{\"items\":[{\"dailyMenuId\":$MID,\"quantity\":2}]}" $BASE/api/orders)
  check "order 2 portions" 'newBalance' "$R"
else
  echo "FAIL order — Smoke Борщ не найден в меню"
  FAIL=$((FAIL+1))
fi

# 16. Юзер: остаток должен уменьшиться (remaining 8)
R=$(curl -s -H "$UAUTH" $BASE/api/menu/today)
check "remaining decreased" '"remaining":8' "$R"

# 17. Юзер: история заказов
R=$(curl -s -H "$UAUTH" $BASE/api/orders/history)
check "order history" 'Smoke Борщ' "$R"

# 18. Отчёт главы столовой по группам
R=$(curl -s -H "$CAUTH" "$BASE/api/canteen/reports/daily?date=$(date +%F)")
check "canteen report groups" 'Группа 101' "$R"

# 19. Супер-админ: преподаватели
R=$(curl -s -H "$AUTH" $BASE/api/admin/teachers)
check "admin teachers" 'teacher@example.com' "$R"

# 20. Регистрация нового юзера (группа 101)
R=$(curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Тест","surname":"Смоков","email":"smoke1@example.com","password":"test1234","groupId":1}')
check "register new user" 'PENDING' "$R"

echo ""
echo "════ ИТОГ: PASS=$PASS FAIL=$FAIL ════"
'''

stdin, stdout, stderr = client.exec_command(SMOKE, timeout=120)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out)
if err:
    print('[STDERR]', err[:2000], file=sys.stderr)
client.close()
