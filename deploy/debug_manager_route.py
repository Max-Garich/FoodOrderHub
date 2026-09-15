#!/usr/bin/env python3
"""Диагностика: POST /admin/groups/:id/manager через https vs localhost."""
import json
import urllib.request
import urllib.error

BASE = 'https://food-hub27.online'


def req(base, method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            body = resp.read().decode()
            return resp.status, body if raw else body[:200]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


_, body = req(BASE, 'POST', '/api/auth/login',
              {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'}, raw=True)
token = json.loads(body)['token']

# Через https
print('HTTPS POST /api/admin/groups/6/manager:',
      req(BASE, 'POST', '/api/admin/groups/6/manager', {'userId': 999}, token))

# Через localhost (прокси nginx на VPS не задействован)
print('LOCAL POST /api/admin/groups/6/manager:',
      req('http://127.0.0.1:3001', 'POST', '/api/admin/groups/6/manager', {'userId': 999}, token))
