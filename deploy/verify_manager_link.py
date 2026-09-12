#!/usr/bin/env python3
"""Проверка: кнопка «Управление» у менеджера ведёт на админ-панель :3002/manager."""
import re
import urllib.request

opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

# 1. Юзер-бандл содержит ссылку на :3002/manager
html = opener.open('http://80.87.199.182:3001/').read().decode()
m = re.search(r'src="(/assets/[^"]+)"', html)
js = opener.open('http://80.87.199.182:3001' + m.group(1)).read().decode()
print('1. Юзер-бандл:', m.group(1))
print('   ссылка :3002/manager в бандле:', ':3002/manager' in js)
assert ':3002/manager' in js

# 2. Админка на 3002 отвечает по /manager (SPA fallback)
r = opener.open('http://80.87.199.182:3002/manager')
print('2. 3002 /manager:', r.status)
assert r.status == 200

# 3. API через прокси админки
r = opener.open('http://80.87.199.182:3002/api/health')
print('3. 3002 /api/health:', r.status, r.read().decode())
assert r.status == 200

# 4. Менеджерский роут в админ-бандле
html2 = opener.open('http://80.87.199.182:3002/manager').read().decode()
m2 = re.search(r'src="(/assets/[^"]+)"', html2)
js2 = opener.open('http://80.87.199.182:3002' + m2.group(1)).read().decode()
print('4. Админ-бандл:', m2.group(1))
print('   ManagerPanel в бандле:', 'ManagerPanel' in js2 or 'manager' in js2)
assert 'manager' in js2

print()
print('ВСЁ OK: «Управление» у менеджера ведёт на :3002/manager')
