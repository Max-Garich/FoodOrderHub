#!/usr/bin/env python3
"""Проверка: админ-панель на :3002 + фикс PENDING-токена (заказ без перезахода)."""
import json
import time
import urllib.request

MAIN = 'http://80.87.199.182:3001'
ADMIN = 'http://80.87.199.182:3002'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def req(base, method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base + path, data=data, method=method)
    if body is not None:
        r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    with opener.open(r, timeout=15) as resp:
        raw = resp.read().decode()
        try:
            return resp.status, json.loads(raw)
        except ValueError:
            return resp.status, raw


print('=== 1. Основной сайт (:3001) ===')
s, health = req(MAIN, 'GET', '/api/health')
print('health:', s, health['status'])
s, html = req(MAIN, 'GET', '/')
print('главная:', s, '| title:', 'Заказ еды' in html and 'FoodOrderHub — Заказ еды' or '???')

print()
print('=== 2. Админ-панель (:3002) ===')
s, html = req(ADMIN, 'GET', '/')
print('главная:', s, '| title:', 'Админ-панель' in html and 'FoodOrderHub — Админ-панель' or '???')
s, html = req(ADMIN, 'GET', '/login')
print('/login (SPA):', s, '| index.html отдаётся:', 'root' in html)

print()
print('=== 3. Прокси /api через админку ===')
s, health = req(ADMIN, 'GET', '/api/health')
print('health через 3002:', s, health['status'])
s, login = req(ADMIN, 'POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
print('логин супер-админа через 3002:', s, '| роль:', login['user']['role'])
s, users = req(ADMIN, 'GET', '/api/admin/users', token=login['token'])
print('GET /api/admin/users через 3002:', s, '| юзеров:', len(users))

print()
print('=== 4. Фикс: новый юзер заказывает БЕЗ перезахода ===')
email = f'autotest{int(time.time())}@example.com'
s, reg = req(MAIN, 'POST', '/api/auth/register', {
    'name': 'Автотест', 'surname': 'Перезаходов', 'email': email,
    'password': 'test1234', 'groupId': 1,
})
print('регистрация:', s, '| статус в токене:', reg['user']['status'])
token = reg['token']

# Пока PENDING — меню должно быть закрыто (403)
try:
    req(MAIN, 'GET', '/api/menu/today', token=token)
    print('menu/today до подтверждения: 200 (НЕ ОЖИДАЛОСЬ!)')
except urllib.error.HTTPError as e:
    print('menu/today до подтверждения:', e.code, '(ожидаемо 403)')

# Супер-админ принимает заявку
s, acc = req(MAIN, 'POST', f"/api/manager/requests/{reg['user']['id']}/accept", token=login['token'])
print('принятие заявки:', s, acc.get('message'))

# Тот же токен (без перезахода!) — теперь должно работать
s, menu = req(MAIN, 'GET', '/api/menu/today', token=token)
print('menu/today ПОСЛЕ подтверждения (тот же токен):', s, '| isOrderingActive:', menu.get('isOrderingActive'), '| позиций:', len(menu.get('items', [])))

assert s == 200, 'ФИКС НЕ РАБОТАЕТ'
print()
print('ВСЁ OK: админка на 3002, прокси работает, заказ без перезахода возможен')
