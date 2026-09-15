#!/usr/bin/env python3
"""Проверка счётчика «сколько людей заказало» на проде.

Сценарий: регистрируем 2 юзеров в группу ИСиП-302, менеджер принимает,
оба заказывают → проверяем peopleCount в живой сессии, кнопках групп
супер-админа и отчёте за день. Мусор чистится cleanup_test_data.sh.
"""
import json
import urllib.request
from datetime import date

BASE = 'https://food-hub27.online'
TODAY = date.today().isoformat()
GROUP_ID = 1  # ИСиП-302
PASS = 'verify1234'

ok = True


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or '{}')
        except Exception:
            return e.code, {}


def check(name, cond, detail=''):
    global ok
    mark = 'OK  ' if cond else 'FAIL'
    if not cond:
        ok = False
    print(f'{mark} {name} {detail}')


# ── Логины админов ──
_, canteen = req('POST', '/api/auth/login', {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})
CT = canteen['token']
_, admin = req('POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
AT = admin['token']
_, mgr = req('POST', '/api/auth/login', {'email': 'manager101@foodorderhub.ru', 'password': 'manager123'})
MT = mgr['token']
check('логины админов', all([CT, AT, MT]))

# ── Меню + сессия (сессия может уже висеть от прошлого прогона — переиспользуем) ──
_, cur0 = req('GET', '/api/canteen/sessions/current', token=CT)
if not cur0.get('isActive'):
    _, m = req('POST', '/api/canteen/menu/daily',
               {'itemName': 'Проверка Людей', 'price': 50, 'category': 'Прочее', 'maxQuantity': 100},
               token=CT)
    _, s = req('POST', '/api/canteen/sessions/start', token=CT)
    check('сессия запущена', 'начат' in s.get('message', ''), s.get('message', s.get('error', '')))

_, menu = req('GET', '/api/menu/status', token=CT)
# Берём id блюда из живой сессии
_, cur1 = req('GET', '/api/canteen/sessions/current', token=CT)
daily_menus = cur1.get('session', {}).get('dailyMenus', [])
mid = daily_menus[0]['id'] if daily_menus else None
check('блюдо в меню найдено', bool(mid), f'id={mid}, позиций={len(daily_menus)}')

# ── Регистрируем 2 юзеров ──
tokens = []
for i in (1, 2):
    email = f'verifypeople{i}@example.com'
    _, reg = req('POST', '/api/auth/register', {
        'name': 'Проверка', 'surname': f'Людей{i}', 'email': email,
        'password': PASS, 'groupId': GROUP_ID,
    })
    check(f'регистрация юзера {i}', 'token' in reg, reg.get('error', ''))
    tokens.append(reg.get('token'))

# ── Менеджер принимает заявки ──
_, reqs = req('GET', '/api/manager/requests', token=MT)
for r_ in reqs:
    if r_['email'].startswith('verifypeople'):
        _, acc = req('POST', f"/api/manager/requests/{r_['id']}/accept", token=MT)
        check(f"заявка {r_['email']} принята", 'принята' in acc.get('message', ''), acc.get('error', ''))

# ── Логин юзеров (после принятия) + пополнение ──
utokens = []
for i in (1, 2):
    email = f'verifypeople{i}@example.com'
    _, lu = req('POST', '/api/auth/login', {'email': email, 'password': PASS})
    check(f'логин юзера {i}', 'token' in lu, lu.get('error', ''))
    utokens.append(lu.get('token'))
    # id юзера для пополнения
    _, mu = req('GET', '/api/manager/users', token=MT)
    uid = next((u['id'] for u in mu if u['email'] == email), None)
    if uid:
        _, tp = req('POST', f'/api/manager/users/{uid}/topup',
                    {'amount': 200, 'comment': 'verify people count'}, token=MT)
        check(f'пополнение юзера {i}', 'newBalance' in tp, tp.get('error', ''))

# ── Оба заказывают ──
for i, t in enumerate(utokens, 1):
    _, o = req('POST', '/api/orders', {'items': [{'dailyMenuId': mid, 'quantity': 1}]}, token=t)
    check(f'заказ юзера {i} оформлен', 'order' in o, o.get('error', ''))

# ── Проверка 1: живая сессия ──
_, cur = req('GET', '/api/canteen/sessions/current', token=CT)
stats = cur.get('stats', {})
check('сессия: людей в сессии >= 2', (stats.get('peopleCount') or 0) >= 2,
      f"peopleCount={stats.get('peopleCount')}")
g = next((g for g in stats.get('groups', []) if g.get('groupName') == 'ИСиП-302'), {})
check('сессия: в ИСиП-302 людей >= 2', (g.get('peopleCount') or 0) >= 2,
      f"people={g.get('peopleCount')}, orders={g.get('orderCount')}")

# ── Проверка 2: кнопки групп супер-админа ──
_, groups = req('GET', '/api/admin/groups', token=AT)
g1 = next((g for g in groups if g['name'] == 'ИСиП-302'), {})
check('админ: ИСиП-302 todayOrderedPeople >= 2', (g1.get('todayOrderedPeople') or 0) >= 2,
      f"todayOrderedPeople={g1.get('todayOrderedPeople')}")
g2 = next((g for g in groups if g['name'] == 'Группа 102'), {})
check('админ: Группа 102 сегодня = 0', (g2.get('todayOrderedPeople') or 0) == 0,
      f"todayOrderedPeople={g2.get('todayOrderedPeople')}")

# ── Проверка 3: отчёт за день ──
_, rep = req('GET', f'/api/canteen/reports/daily?date={TODAY}', token=CT)
check('отчёт: людей за день >= 2', (rep.get('peopleCount') or 0) >= 2, f"peopleCount={rep.get('peopleCount')}")
rg = next((g for g in rep.get('groups', []) if g['groupName'] == 'ИСиП-302'), {})
check('отчёт: в ИСиП-302 людей >= 2', (rg.get('peopleCount') or 0) >= 2,
      f"people={rg.get('peopleCount')}, orders={rg.get('orderCount')}")

print()
print('ИТОГ:', '✅ СЧЁТЧИК ЛЮДЕЙ РАБОТАЕТ' if ok else '⚠️ ЕСТЬ ПРОБЛЕМЫ')
raise SystemExit(0 if ok else 1)
