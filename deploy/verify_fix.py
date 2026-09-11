#!/usr/bin/env python3
"""Проверка фикса GET /api/admin/users."""
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
print('GET /api/admin/users ->', status, '| count:', len(users))
for u in users[:8]:
    print(f"  - {u['surname']} {u['name']} | {u['role']} | {u['status']} | group={u['groupId']} | balance={u['balance']}")

assert status == 200 and len(users) > 0
print('OK')
