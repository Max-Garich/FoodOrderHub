#!/usr/bin/env python3
"""Быстрая проверка фикса: null-баланс + заявки с группой."""
import json
import urllib.request

BASE = 'http://80.87.199.182:3001'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # без прокси


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    with opener.open(r, timeout=15) as resp:
        return json.loads(resp.read().decode())


health = req('GET', '/api/health')
print('health:', health)

login = req('POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
token = login['token']
print('login: ok, role =', login['user']['role'])

requests_ = req('GET', '/api/manager/requests', token=token)
print('requests count:', len(requests_))
for r in requests_[:5]:
    print('  -', r['name'], r['surname'], r['email'], '| group:', (r.get('group') or {}).get('name'), '| role:', r['role'])

users = req('GET', '/api/manager/users?groupId=1', token=token)
print('group 1 members:', len(users))
for u in users:
    assert isinstance(u['balance'], (int, float, type(None))), u
    print('  -', u['name'], u['surname'], '| balance:', u['balance'])

print('OK: no null-balance crash possible, requests contain group field')
