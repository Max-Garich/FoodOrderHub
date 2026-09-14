#!/usr/bin/env python3
"""Проверка отчёта главы столовой за сегодня (после smoke-теста)."""
import json
import urllib.request
from datetime import date

BASE = 'https://food-hub27.online'


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())


# Логин главы столовой
data = req('POST', '/api/auth/login',
           {'email': 'canteen@foodorderhub.ru', 'password': 'canteen123'})
token = data['token']

# Отчёт за сегодня
today = date.today().isoformat()
report = req('GET', f'/api/canteen/reports/daily?date={today}', token=token)

print(f"Дата: {report['date']}")
print(f"Сессий: {len(report['sessions'])}")
for s in report['sessions']:
    print(f"  Сессия #{s['sessionId']} active={s['isActive']} "
          f"orders={len(s['orders'])} revenue=₽{s['revenue']}")
print(f"Итого выручка за день: ₽{report['totalRevenue']}")
print("Группы:")
for g in report['groups']:
    print(f"  {g['groupName']} — заказов: {g['orderCount']}, выручка: ₽{g['totalRevenue']}")
    for d in g['dishes']:
        print(f"    {d['name']}: {d['totalQuantity']} порц. на ₽{d['totalAmount']}")
print("Блюда (общая сводка):")
for d in report['dishes']:
    print(f"  {d['name']}: {d['totalQuantity']} порц. на ₽{d['totalAmount']}")
