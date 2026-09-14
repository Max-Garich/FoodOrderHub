#!/usr/bin/env python3
"""Проверка прода после оптимизаций под 1000 пользователей."""
import json
import urllib.request

BASE = 'https://food-hub27.online'


def req(method, path, body=None, token=None, gzip=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    if gzip:
        r.add_header('Accept-Encoding', 'gzip')
    with urllib.request.urlopen(r, timeout=30) as resp:
        raw = resp.read()
        enc = resp.headers.get('Content-Encoding', '')
        if enc == 'gzip':
            import gzip as gz
            raw = gz.decompress(raw)
        return resp.status, raw, dict(resp.headers)


ok = True

# 1. Health
status, body, _ = req('GET', '/api/health')
print(f"health: {status} {json.loads(body)['status']}")
ok &= status == 200

# 2. Логин супер-админа (bcrypt cost 8 + новый лимит)
status, body, _ = req('POST', '/api/auth/login',
                      {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
data = json.loads(body)
print(f"login: {status}, role={data.get('user', {}).get('role')}")
ok &= status == 200
token = data['token']

# 3. gzip на статике
status, body, headers = req('GET', '/', gzip=True)
print(f"gzip: Content-Encoding={headers.get('Content-Encoding', 'нет')}")
ok &= headers.get('Content-Encoding') == 'gzip'

# 4. Кэш статики
status, _, headers = req('GET', '/', gzip=True)
print(f"index.html Cache-Control: {headers.get('Cache-Control', 'нет')}")
ok &= 'no-cache' in headers.get('Cache-Control', '')

# 5. API-запрос с токеном (меню)
status, body, _ = req('GET', '/api/menu/status', token=token)
print(f"menu/status: {status} {json.loads(body)}")
ok &= status == 200

print('\nИТОГ:', '✅ ВСЁ РАБОТАЕТ' if ok else '⚠️ ЕСТЬ ПРОБЛЕМЫ')
raise SystemExit(0 if ok else 1)
