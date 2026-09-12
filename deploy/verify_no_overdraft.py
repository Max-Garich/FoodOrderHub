#!/usr/bin/env python3
"""Проверка: заказ невозможен, если сумма превышает баланс (лимит = 0, без овердрафта -100)."""
import json
import urllib.request
import urllib.error

MAIN = 'http://80.87.199.182:3001'
ADMIN = 'http://80.87.199.182:3002'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def req(base, method, path, body=None, token=None):
    r = urllib.request.Request(base + path, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    data = json.dumps(body).encode() if body is not None else None
    try:
        with opener.open(r, data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


# 1. Логины
s, admin = req(ADMIN, 'POST', '/api/auth/login', {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
assert s == 200, f'логин супер-админа: {s}'
atoken = admin['token']
s, user = req(MAIN, 'POST', '/api/auth/login', {'email': 'test@example.com', 'password': 'user123'})
assert s == 200, f'логин юзера: {s}'
utoken = user['token']
uid = user['user']['id']
print('1. Логины OK (юзер id=%s)' % uid)

# 2. Текущий баланс
s, users = req(ADMIN, 'GET', '/api/admin/users', token=atoken)
me = next(u for u in users if u['id'] == uid)
balance = me['balance'] or 0
print('2. Баланс юзера: ₽%.2f' % balance)

# 2a. Временно снижаем баланс до ₽10 (чтобы заказ гарантированно его превышал)
if balance > 10:
    s, res = req(ADMIN, 'POST', f'/api/manager/users/{uid}/subtract',
                 {'amount': balance - 10, 'comment': 'автотест: временно снижаем баланс'}, token=atoken)
    assert s == 200, f'subtract: {s} {res}'
    balance = 10
    print('   (баланс временно снижен до ₽10.00, будет возвращён в конце)')

# 3. Меню и максимальная возможная сумма заказа
s, menu = req(MAIN, 'GET', '/api/menu/today', token=utoken)
assert s == 200, f'menu/today: {s}'
items = menu.get('items', [])
assert menu.get('isOrderingActive'), 'приём заказов закрыт — попросить главу столовой открыть сессию'
assert items, 'меню пустое'

# Подбираем позицию и количество так, чтобы сумма превысила баланс
target = None
for it in sorted(items, key=lambda x: -x['price']):
    remaining = it.get('remaining', 999)
    if it['price'] * remaining > balance:
        # количество, при котором сумма чуть больше баланса
        qty = int(balance // it['price']) + 1
        if qty <= remaining:
            target = (it, qty)
            break
assert target, 'не удалось подобрать позицию дороже баланса — у юзера слишком много денег'
it, qty = target
total = it['price'] * qty
print(f"3. Пробуем заказать: {it['itemName']} × {qty} = ₽{total:.2f} (баланс ₽{balance:.2f})")

# 4. Заказ сверх баланса → должен быть отказ
s, res = req(MAIN, 'POST', '/api/orders', {'items': [{'dailyMenuId': it['id'], 'quantity': qty}]}, token=utoken)
print(f'4. Заказ сверх баланса: {s} | {res.get("error", "")} (ожидаемо 402 Недостаточно средств)')
assert s == 402, 'ОВЕРДРАФТ ВСЁ ЕЩЁ РАБОТАЕТ — заказ сверх баланса прошёл!'

# 5. Заказ в пределах баланса → успех, баланс не уходит в минус
avail = [i for i in items if not i.get('soldOut') and (i.get('remaining') or 0) > 0]
assert avail, 'все позиции закончились — некого заказывать'
cheap = min(avail, key=lambda x: x['price'])
if cheap['price'] > balance:
    # пополняем, чтобы хватило на одну порцию
    need = cheap['price'] - balance + 50
    s, _ = req(ADMIN, 'POST', f'/api/manager/users/{uid}/topup', {'amount': need, 'comment': 'автотест'}, token=atoken)
    assert s == 200, f'topup: {s}'
    balance += need
    print(f'   (пополнено на ₽{need:.2f} для проверки заказа в пределах баланса)')
s, res = req(MAIN, 'POST', '/api/orders', {'items': [{'dailyMenuId': cheap['id'], 'quantity': 1}]}, token=utoken)
new_balance = res.get('newBalance')
print(f"5. Заказ в пределах баланса ({cheap['itemName']}): {s} | ответ: {res.get('error') or f'новый баланс ₽{new_balance:.2f}' if new_balance is not None else res}")
assert s == 201, f'заказ в пределах баланса не прошёл: {res}'
assert new_balance is None or new_balance >= 0, 'баланс ушёл в минус!'

# 6. Возвращаем исходный баланс (1300) — с учётом сделанного заказа
s, users2 = req(ADMIN, 'GET', '/api/admin/users', token=atoken)
me2 = next(u for u in users2 if u['id'] == uid)
cur = me2['balance'] or 0
restore = 1300 - cur
if restore > 0:
    s, _ = req(ADMIN, 'POST', f'/api/manager/users/{uid}/topup', {'amount': restore, 'comment': 'автотест: возврат баланса'}, token=atoken)
    assert s == 200, f'возврат баланса: {s}'
print(f'6. Баланс восстановлен до ₽1300.00 (было ₽{cur:.2f}, +₽{restore:.2f})')

print()
print('ВСЁ OK: лимит = баланс (0), овердрафт -100 убран')
