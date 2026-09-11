#!/usr/bin/env python3
"""Проверка разделения: юзер-сайт :3001, админка :3002 (nginx + proxy /api)."""
import json
import urllib.request

opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
USER = 'http://80.87.199.182:3001'
ADMIN = 'http://80.87.199.182:3002'


def get(base, path, token=None):
    r = urllib.request.Request(base + path)
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    with opener.open(r, timeout=15) as resp:
        return resp.status, resp.read().decode()


# 1. Юзер-сайт жив, отдаёт пользовательское приложение
s, html = get(USER, '/')
assert s == 200 and 'root' in html
print('3001 / ->', s, '| title:', html.split('<title>')[1].split('</title>')[0])

# 2. Админка отдаёт отдельное приложение
s, html = get(ADMIN, '/')
assert s == 200
title = html.split('<title>')[1].split('</title>')[0]
print('3002 / ->', s, '| title:', title)
assert 'Админ-панель' in title, 'админка отдаёт не тот бандл!'

# 3. SPA fallback на 3002 (любой путь -> index.html)
s, html = get(ADMIN, '/admin')
assert s == 200 and 'root' in html
print('3002 /admin (SPA fallback) ->', s)

# 4. API через nginx-прокси
s, body = get(ADMIN, '/api/health')
assert s == 200 and json.loads(body)['status'] == 'ok'
print('3002 /api/health (proxy) ->', s, body)

# 5. Логин супер-админа через прокси + защищённый эндпоинт через прокси
data = json.dumps({'email': 'superadmin@foodorderhub.ru', 'password': 'super123'}).encode()
r = urllib.request.Request(ADMIN + '/api/auth/login', data=data, method='POST')
r.add_header('Content-Type', 'application/json')
with opener.open(r, timeout=15) as resp:
    login = json.loads(resp.read().decode())
token = login['token']
print('3002 login ->', login['user']['role'])

s, body = get(ADMIN, '/api/admin/users', token=token)
users = json.loads(body)
print('3002 /api/admin/users (proxy) ->', s, '| пользователей:', len(users))

# 6. На юзер-сайте админ-панели больше нет в бандле
s, html = get(USER, '/')
import re
m = re.search(r'assets/index-[\w-]+\.js', html)
s2, js = get(USER, '/' + m.group(0))
assert 'SuperAdminPanel' not in js and 'ManagerPanel' not in js
print('3001 юзер-бандл НЕ содержит админ-панелей:', m.group(0))

print('\nOK: разделение работает')
