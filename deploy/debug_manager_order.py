#!/usr/bin/env python3
"""Диагностика: заказ под менеджером на проде (кнопка «Заказать» не реагирует)."""
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
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}

for email in ['manager101@foodorderhub.ru', 'manager102@foodorderhub.ru']:
    print(f'=== {email} ===')
    st, d = req('POST', '/api/auth/login', {'email': email, 'password': 'manager123'})
    if st != 200:
        print(f'  login: {st} {d}')
        continue
    tok = d['token']
    print(f"  login OK: {d['user']['name']} {d['user']['surname']}, role={d['user']['role']}, "
          f"balance={d['user'].get('balance')}")

    st, prof = req('GET', '/api/user/profile', token=tok)
    print(f'  profile: {st}, balance={prof.get("balance")}, status={prof.get("status")}')

    st, menu = req('GET', '/api/menu/today', token=tok)
    if st != 200:
        print(f'  menu: {st} {menu}')
        continue
    print(f"  menu: isOrderingActive={menu.get('isOrderingActive')}, "
          f"items={len(menu.get('items') or [])}, additional={len(menu.get('additionalItems') or [])}")
    items = menu.get('items') or []
    if items:
        it = items[0]
        print(f"    первая позиция: {it['itemName']} R{it['price']} remaining={it.get('remaining')}")

    # Пробуем оформить заказ на 1 порцию первой позиции
    if items and menu.get('isOrderingActive'):
        st, order = req('POST', '/api/orders', {
            'items': [{'dailyMenuId': items[0]['id'], 'quantity': 1}],
        }, token=tok)
        print(f'  POST /api/orders: {st} {json.dumps(order, ensure_ascii=False)[:200]}')
    print()

# Состояние сессии
st, d = req('POST', '/api/auth/login', {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})
tok = d['token']
st, cur = req('GET', '/api/canteen/sessions/current', token=tok)
print(f"=== Сессия (canteen): isActive={cur.get('isActive')} ===")
