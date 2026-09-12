#!/usr/bin/env python3
"""E2E: глава столовой добавляет позицию меню с фото (прод)."""
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

PHOTO = ('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS'
         'Ew8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDUzNDP/wAALCAABAAEBAREA/8QAFAABAAAAAAA'
         'AAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==')

tok = req('POST', '/api/auth/login', {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})[1]['token']
print('1. Логин главы столовой: OK')

# Добавление позиции с фото (без menuItemId — вручную из формы)
st, item = req('POST', '/api/canteen/menu/daily', {
    'itemName': 'ТЕСТ Суп', 'category': 'Супы', 'price': 90, 'maxQuantity': 10, 'photoUrl': PHOTO,
}, token=tok)
assert st == 201, f'add: {st} {item}'
assert item['photoUrl'] and item['photoUrl'].startswith('data:image/jpeg'), 'фото не сохранилось!'
print(f"2. OK Позиция с фото добавлена: id={item['id']}, R{item['price']}")

# Редактирование: убрать фото
st, upd = req('PUT', f"/api/canteen/menu/daily/{item['id']}", {'photoUrl': None}, token=tok)
assert st == 200 and not upd['photoUrl'], f'update photo: {st} {upd.get("photoUrl")}'
print('3. OK PUT: фото убрано через редактирование')

# Удаление тестовой позиции
st, _ = req('DELETE', f"/api/canteen/menu/daily/{item['id']}", token=tok)
assert st == 200, f'delete: {st}'
print('4. OK Тестовая позиция удалена')

print()
print('ВСЁ OK: фото у главы столовой работает')
