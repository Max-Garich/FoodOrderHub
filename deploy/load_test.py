#!/usr/bin/env python3
"""Нагрузочный тест FoodOrderHub: 1000 пользователей.

Фазы:
  1. Логин 1000 пользователей (bcrypt — самая тяжёлая операция)
  2. GET /api/menu/today × 1000 (чтение меню)
  3. POST /api/orders × 1000 с параллелизмом (обеденный час)

Запускается НА VPS против localhost:3101 (стек docker-compose.loadtest.yml).
Только stdlib — никаких зависимостей.

Использование:
  python3 deploy/load_test.py [N_USERS] [CONCURRENCY]
"""
import json
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = 'http://127.0.0.1:3101'
N_USERS = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
CONCURRENCY = int(sys.argv[2]) if len(sys.argv) > 2 else 100
PASSWORD = 'pass1234'


def req(method, path, body=None, token=None):
    """Возвращает (status, data, elapsed_sec)."""
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
            return resp.status, payload, time.perf_counter() - t0
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode())
        except Exception:
            payload = {}
        return e.code, payload, time.perf_counter() - t0
    except Exception as e:
        return 0, {'error': str(e)}, time.perf_counter() - t0


def run_phase(name, fn, items, workers):
    """Прогоняет fn(item) по всем items с пулом потоков, печатает статистику."""
    results = []
    errors = 0
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for status, payload, elapsed in pool.map(fn, items):
            results.append(elapsed)
            if status >= 400:
                errors += 1
                if errors <= 3:
                    print(f'    ошибка: {status} {json.dumps(payload, ensure_ascii=False)[:120]}')
    total = time.perf_counter() - t0
    results.sort()
    n = len(results)
    p50 = results[n // 2] if n else 0
    p95 = results[int(n * 0.95)] if n else 0
    print(f'  {name}: {n} запросов за {total:.1f}s '
          f'({n / total:.0f} req/s) | p50={p50*1000:.0f}ms p95={p95*1000:.0f}ms '
          f'max={results[-1]*1000:.0f}ms | ошибок: {errors}')
    return errors


def main():
    print(f'═══ Нагрузочный тест: {N_USERS} пользователей, параллелизм {CONCURRENCY} ═══')
    print(f'Цель: {BASE}')

    emails = [f'loadtest{i}@test.local' for i in range(1, N_USERS + 1)]

    # ── Фаза 1: логин (bcrypt.compare — CPU-bound) ──
    print('\n[1/3] Логин (bcrypt):')
    tokens = {}

    def do_login(email):
        status, payload, elapsed = req('POST', '/api/auth/login', {'email': email, 'password': PASSWORD})
        if status == 200:
            tokens[email] = payload['token']
        return status, payload, elapsed

    errors = run_phase('login', do_login, emails, CONCURRENCY)
    if errors:
        print(f'  !! {errors} ошибок логина — дальнейший тест бессмыслен')
        sys.exit(1)
    print(f'  токенов получено: {len(tokens)}')

    # ── Фаза 2: чтение меню ──
    print('\n[2/3] GET /api/menu/today:')
    menu_ids = []

    def do_menu(email):
        status, payload, elapsed = req('GET', '/api/menu/today', token=tokens[email])
        if status == 200 and not menu_ids and payload.get('items'):
            menu_ids.append(payload['items'][0]['id'])
        return status, payload, elapsed

    run_phase('menu', do_menu, emails, CONCURRENCY)
    if not menu_ids:
        print('  !! меню не получено — нет активной сессии с блюдами?')
        sys.exit(1)
    dish_id = menu_ids[0]
    print(f'  блюдо для заказа: id={dish_id}')

    # ── Фаза 3: заказы (обеденный час) ──
    print(f'\n[3/3] POST /api/orders (заказ 1×{dish_id}):')

    def do_order(email):
        return req('POST', '/api/orders',
                   {'items': [{'dailyMenuId': dish_id, 'quantity': 1}]},
                   token=tokens[email])

    order_errors = run_phase('orders', do_order, emails, CONCURRENCY)

    # ── Итог ──
    print('\n═══ ИТОГ ═══')
    if order_errors == 0:
        print(f'✅ {N_USERS} пользователей: логин + меню + заказ без ошибок')
        print('   Сервер выдерживает целевую нагрузку.')
    else:
        print(f'⚠️ {order_errors} ошибок при заказах — смотри детали выше')
        sys.exit(1)


if __name__ == '__main__':
    main()
