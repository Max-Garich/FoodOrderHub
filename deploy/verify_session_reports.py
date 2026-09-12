#!/usr/bin/env python3
"""E2E: аккордеон групп в сессии + сводка блюд в отчётах (прод).
Запускает сессию, делает тестовый заказ, проверяет stats.groups и dishes, завершает сессию.
"""
import json
import urllib.request

BASE = 'https://food-hub27.online'

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def login(email, password):
    st, d = req('POST', '/api/auth/login', {'email': email, 'password': password})
    assert st == 200, f'login {email}: {st} {d}'
    return d['token'], d['user']

canteen_tok, _ = login('canteen@foodorderhub.ru', 'canteen123')
user_tok, user = login('test@example.com', 'user123')
print(f'1. Логины OK (test user: {user["name"]}, groupId={user.get("groupId")})')

# Текущее меню черновика
st, cur = req('GET', '/api/canteen/sessions/current', token=canteen_tok)
menus = [m for m in (cur['session'].get('dailyMenus') or []) if not m.get('isAdditional')]
assert menus, 'нет меню в черновике сессии'
dish = menus[0]
print(f"2. Меню черновика: {[m['itemName'] for m in menus]}, заказываем «{dish['itemName']}» ×1 (₽{dish['price']})")

# Запуск сессии
st, d = req('POST', '/api/canteen/sessions/start', token=canteen_tok)
assert st == 200, f'start: {st} {d}'
print('3. Сессия запущена')

# Заказ от тестового пользователя
st, d = req('POST', '/api/orders', {
    'items': [{'dailyMenuId': dish['id'], 'quantity': 1}],
}, token=user_tok)
assert st in (200, 201), f'order: {st} {d}'
print(f"4. Заказ оформлен: ₽{d.get('totalAmount') or d.get('order', {}).get('totalAmount')}")

# ПРОВЕРКА 1: живые группы в активной сессии
st, cur = req('GET', '/api/canteen/sessions/current', token=canteen_tok)
assert st == 200, f'current: {st} {cur}'
stats = cur.get('stats') or {}
groups = stats.get('groups')
assert groups is not None, 'НЕТ stats.groups при активной сессии!'
assert len(groups) > 0, 'stats.groups пустой при наличии заказа!'
g = groups[0]
assert g['dishes'], f'у группы {g["groupName"]} нет dishes!'
found = next((x for x in g['dishes'] if x['name'] == dish['itemName']), None)
assert found, f"«{dish['itemName']}» нет в dishes группы: {g['dishes']}"
print(f"5. ✅ Активная сессия: группа «{g['groupName']}» → " +
      ', '.join(f"{x['name']}×{x['totalQuantity']}" for x in g['dishes']))

# Завершение сессии → сводка
st, summary = req('POST', '/api/canteen/sessions/stop', token=canteen_tok)
assert st == 200, f'stop: {st} {summary}'
g = next((x for x in summary.get('groups', []) if x['dishes']), None)
assert g, f'в сводке после стопа нет групп с блюдами: {summary.get("groups")}'
print(f"6. ✅ Сводка после стопа: «{g['groupName']}» → " +
      ', '.join(f"{x['name']}×{x['totalQuantity']}" for x in g['dishes']))

# ПРОВЕРКА 2: отчёт за сегодня — общая сводка блюд
import datetime
today = datetime.date.today().isoformat()
st, rep = req('GET', f'/api/canteen/reports/daily?date={today}', token=canteen_tok)
assert st == 200, f'report: {st} {rep}'
dishes = rep.get('dishes')
assert dishes is not None, 'НЕТ dishes в отчёте!'
assert any(x['name'] == dish['itemName'] for x in dishes), f'«{dish['itemName']}» нет в dishes отчёта'
print(f"7. ✅ Отчёт: выручка ₽{rep['totalRevenue']}, всего заказано: " +
      ', '.join(f"{x['name']}×{x['totalQuantity']}" for x in dishes))

print('\nВСЁ OK: аккордеон групп и сводка блюд работают')
