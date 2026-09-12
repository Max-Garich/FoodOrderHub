#!/usr/bin/env python3
"""E2E: справочник блюд у главы столовой (как у супер-админа) — прод."""
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

# Глава столовой: доступ к справочнику (тот же API, что у супер-админа)
tok = req('POST', '/api/auth/login', {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})[1]['token']
st, items = req('GET', '/api/canteen/menu/items', token=tok)
assert st == 200, f'catalog for canteen: {st} {items}'
print(f'1. OK Глава столовой видит справочник: {len(items)} блюд')

# Создание блюда главой столовой
st, dish = req('POST', '/api/canteen/menu/items', {
    'name': 'ТЕСТ Чай', 'category': 'Напитки', 'defaultPrice': 35, 'defaultMaxQuantity': 40,
}, token=tok)
assert st == 201, f'create: {st} {dish}'
print(f"2. OK Глава столовой создал блюдо: {dish['name']} R{dish['defaultPrice']}/{dish['defaultMaxQuantity']} порц.")

# Добавление в меню (как кнопка «В меню» с предзаполненными ценой/порциями)
st, daily = req('POST', '/api/canteen/menu/daily', {
    'menuItemId': dish['id'], 'itemName': dish['name'], 'category': 'Напитки',
    'price': 35, 'maxQuantity': 40,
}, token=tok)
assert st == 201, f'add: {st} {daily}'
print(f"3. OK Добавлено в меню: R{daily['price']}, {daily['maxQuantity']} порц.")

# Чистка
st1, _ = req('DELETE', f"/api/canteen/menu/daily/{daily['id']}", token=tok)
st2, _ = req('DELETE', f"/api/canteen/menu/items/{dish['id']}", token=tok)
assert st1 == 200 and st2 == 200, f'cleanup: {st1} {st2}'
print('4. OK Тестовые данные удалены')

print()
print('ВСЁ OK: справочник у главы столовой работает')
