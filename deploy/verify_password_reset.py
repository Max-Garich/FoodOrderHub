#!/usr/bin/env python3
"""Проверка: супер-админ меняет пароль любому пользователю (через 3002)."""
import json
import urllib.request
import urllib.error

MAIN = 'http://80.87.199.182:3001'
ADMIN = 'http://80.87.199.182:3002'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def req(base, method, path, body=None, token=None):
    r = urllib.request.Request(base + path, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    data = json.dumps(body).encode() if body is not None else None
    try:
        with opener.open(r, data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


# 1. Логин супер-админа через админку
s, login = req(ADMIN, 'POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
assert s == 200, f'логин супер-админа: {s}'
token = login['token']
print('1. Логин супер-админа через 3002:', s, '| роль:', login['user']['role'])

# 2. Список пользователей
s, users = req(ADMIN, 'GET', '/api/admin/users', token=token)
assert s == 200, f'/admin/users: {s}'
target = next((u for u in users if u['email'] == 'test@example.com'), None)
assert target, 'test@example.com не найден'
print('2. GET /api/admin/users:', s, '| цель:', target['name'], target['surname'], f"(id={target['id']})")

# 3. Смена пароля
new_pass = 'newpass777'
s, res = req(ADMIN, 'POST', f"/api/admin/users/{target['id']}/reset-password", {'password': new_pass}, token=token)
print('3. POST reset-password:', s, '|', res.get('message') or res.get('error'))
assert s == 200, 'смена пароля не удалась'

# 4. Старый пароль больше не работает
s, _ = req(MAIN, 'POST', '/api/auth/login', {'email': 'test@example.com', 'password': 'user123'})
print('4. Логин со СТАРЫМ паролем:', s, '(ожидаемо 401)')
assert s == 401, 'старый пароль всё ещё работает!'

# 5. Новый пароль работает
s, login2 = req(MAIN, 'POST', '/api/auth/login', {'email': 'test@example.com', 'password': new_pass})
print('5. Логин с НОВЫМ паролем:', s, '| имя:', login2['user']['name'])
assert s == 200, 'новый пароль не работает!'

# 6. Менеджер НЕ может менять пароли (проверка прав — только супер-админ)
s, mlogin = req(MAIN, 'POST', '/api/auth/login', {'email': 'manager101@foodorderhub.ru', 'password': 'manager123'})
mtoken = mlogin['token']
s, res = req(MAIN, 'POST', f"/api/admin/users/{target['id']}/reset-password", {'password': 'hack123'}, token=mtoken)
print('6. Менеджер пытается сменить пароль:', s, '(ожидаемо 403)')
assert s == 403, 'менеджер может менять пароли — дыра!'

# 7. Возвращаем исходный пароль тестовому юзеру
s, _ = req(ADMIN, 'POST', f"/api/admin/users/{target['id']}/reset-password", {'password': 'user123'}, token=token)
print('7. Возврат исходного пароля test@example.com:', s)
assert s == 200

print()
print('ВСЁ OK: супер-админ меняет пароль кому угодно, другие роли — не могут')
