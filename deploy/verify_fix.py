#!/usr/bin/env python3
"""Проверка: GET /api/admin/users работает + rate limit поднят."""
import json
import urllib.request

BASE = 'http://80.87.199.182:3001'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    with opener.open(r, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode())


print('health:', req('GET', '/api/health')[1])

_, login = req('POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
token = login['token']

status, users = req('GET', '/api/admin/users', token=token)
print('GET /api/admin/users:', status, '| всего пользователей:', len(users))
for u in users[:6]:
    print('  -', u['name'], u['surname'], '|', u['role'], '|', u['status'], '| balance:', u['balance'])

# Раньше лимит был 1000/час с двойным подсчётом (=500 фактически).
# 80 запросов подряд не должны дать 429.
codes = {}
for i in range(80):
    s, _ = req('GET', '/api/admin/users', token=token)
    codes[s] = codes.get(s, 0) + 1
print('80 последовательных запросов -> коды:', codes)
assert codes.get(200) == 80, 'RATE LIMIT СРАБОТАЛ ПРЕЖДЕВРЕМЕННО!'
print('OK: /api/admin/users отвечает, rate limit не срабатывает')
