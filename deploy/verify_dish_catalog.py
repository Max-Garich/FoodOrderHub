#!/usr/bin/env python3
"""E2E-проверка справочника блюд с фото (прод): создание, «В меню», запоминание цены/порций."""
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

# 1x1 красный JPEG (валидная base64-картинка)
PHOTO = ('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS'
         'Ew8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDUzNDP/wAALCAABAAEBAREA/8QAFAABAAAAAAA'
         'AAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==')

tok = req('POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})[1]['token']
print('1. Логин супер-админа: OK')

# Создание блюда с фото
st, dish = req('POST', '/api/canteen/menu/items', {
    'name': 'ТЕСТ Борщ', 'category': 'Супы', 'defaultPrice': 150, 'defaultMaxQuantity': 30, 'photoUrl': PHOTO,
}, token=tok)
assert st == 201, f'create: {st} {dish}'
assert dish['photoUrl'] and dish['photoUrl'].startswith('data:image/jpeg'), 'фото не сохранилось!'
print(f"2. OK Блюдо создано: id={dish['id']}, фото {len(dish['photoUrl'])} байт, "
      f"R{dish['defaultPrice']}, {dish['defaultMaxQuantity']} порц.")

# Добавление в меню с ИЗМЕНЁННОЙ ценой/порциями
st, daily = req('POST', '/api/canteen/menu/daily', {
    'menuItemId': dish['id'], 'itemName': 'ТЕСТ Борщ', 'category': 'Супы', 'price': 175, 'maxQuantity': 25,
}, token=tok)
assert st == 201, f'add to menu: {st} {daily}'
assert daily['photoUrl'] and daily['photoUrl'].startswith('data:image/jpeg'), 'фото не скопировалось в меню!'
print(f"3. OK Добавлено в меню: R{daily['price']}, {daily['maxQuantity']} порц., фото скопировано")

# Справочник должен запомнить ПОСЛЕДНИЕ использованные значения
st, items = req('GET', '/api/canteen/menu/items', token=tok)
saved = next(i for i in items if i['id'] == dish['id'])
assert saved['defaultPrice'] == 175 and saved['defaultMaxQuantity'] == 25, f'не запомнило: {saved}'
print(f"4. OK Справочник запомнил последние данные: R{saved['defaultPrice']}, "
      f"{saved['defaultMaxQuantity']} порц. (было 150/30)")

# PUT — редактирование
st, upd = req('PUT', f"/api/canteen/menu/items/{dish['id']}", {'name': 'ТЕСТ Борщ', 'defaultPrice': 160}, token=tok)
assert st == 200 and upd['defaultPrice'] == 160, f'update: {st}'
print('5. OK Редактирование работает (цена 175 -> 160)')

# Чистим тестовые данные
st1, _ = req('DELETE', f"/api/canteen/menu/daily/{daily['id']}", token=tok)
st2, _ = req('DELETE', f"/api/canteen/menu/items/{dish['id']}", token=tok)
assert st1 == 200 and st2 == 200, f'cleanup: {st1} {st2}'
print('6. OK Тестовые данные вычищены (меню + справочник)')

print()
print('ВСЁ OK: справочник блюд с фото работает на проде')
