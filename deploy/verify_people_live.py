#!/usr/bin/env python3
"""Проверка ЖИВОЙ статистики сессии (peopleCount) на тестовом стеке (порт 3101).

Запуск на VPS против docker-compose.loadtest.yml:
  python3 deploy/verify_people_live.py
Перед этим: bash deploy/loadtest_setup.sh 5 (создаёт юзеров + активную сессию с блюдами).
"""
import json
import sys
import urllib.request

BASE = 'http://127.0.0.1:3101'
PASS = 'pass1234'

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
    print(('OK  ' if cond else 'FAIL'), name, detail)
    if not cond:
        ok = False


# Логин главы столовой (из сида)
_, c = req('POST', '/api/auth/login', {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})
CT = c.get('token')
check('логин главы столовой', bool(CT), c.get('error', ''))

# Активная сессия с блюдами (создана loadtest_setup.sh)
_, cur = req('GET', '/api/canteen/sessions/current', token=CT)
check('сессия активна', cur.get('isActive') is True)
menus = cur.get('session', {}).get('dailyMenus', [])
mid = menus[0]['id'] if menus else None
check('блюда в меню', bool(mid), f'позиций={len(menus)}')

# До заказов: 0 людей
stats0 = cur.get('stats', {})
check('до заказов: peopleCount = 0', stats0.get('peopleCount') == 0, f"={stats0.get('peopleCount')}")

# Два разных юзера заказывают (у loadtest-юзеров баланс 100000)
for i in (1, 2):
    _, u = req('POST', '/api/auth/login', {'email': f'loadtest{i}@test.local', 'password': PASS})
    check(f'логин юзера {i}', 'token' in u, u.get('error', ''))
    _, o = req('POST', '/api/orders', {'items': [{'dailyMenuId': mid, 'quantity': 1}]}, token=u.get('token'))
    check(f'заказ юзера {i}', 'order' in o, o.get('error', ''))

# Юзер 1 заказывает ВТОРОЙ раз (уникальность: 2 заказа, но 1 человек)
_, u1 = req('POST', '/api/auth/login', {'email': 'loadtest1@test.local', 'password': PASS})
_, o = req('POST', '/api/orders', {'items': [{'dailyMenuId': mid, 'quantity': 1}]}, token=u1['token'])
check('повторный заказ юзера 1', 'order' in o, o.get('error', ''))

# ── Главная проверка: 3 заказа, но 2 уникальных человека ──
_, cur = req('GET', '/api/canteen/sessions/current', token=CT)
stats = cur.get('stats', {})
check('заказов = 3', stats.get('orderCount') == 3, f"={stats.get('orderCount')}")
check('ЛЮДЕЙ = 2 (не 3!)', stats.get('peopleCount') == 2, f"peopleCount={stats.get('peopleCount')}")
g = (stats.get('groups') or [{}])[0]
check('в группе людей = 2', g.get('peopleCount') == 2,
      f"group={g.get('groupName')}, people={g.get('peopleCount')}, orders={g.get('orderCount')}")

print()
print('ИТОГ:', '✅ ЖИВАЯ СТАТИСТИКА ЛЮДЕЙ РАБОТАЕТ' if ok else '⚠️ ЕСТЬ ПРОБЛЕМЫ')
sys.exit(0 if ok else 1)
