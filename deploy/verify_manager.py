#!/usr/bin/env python3
"""Проверка назначения менеджера группы (преподавателя) на проде.

Сценарий (безопасен для пилота — всё откатывается):
  1. Логин супер-админа.
  2. GET /api/admin/groups — есть поля managerName и todayOrderedPeople.
  3. Назначаем преподавателя pre@gmail.com менеджером «Группа 103»
     (в ней нет участников и менеджера — безопасно).
  4. Проверяем: роль стала MANAGER, группа привязана, менеджер виден в списке групп.
  5. Откат выполняется отдельно: bash deploy/revert_manager_test.sh
"""
import json
import sys
import urllib.request

BASE = 'https://food-hub27.online'
TEST_GROUP = 'Группа 103'
TEST_TEACHER_EMAIL = 'pre@gmail.com'

ok = True


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode())


def check(name, cond, detail=''):
    global ok
    mark = 'OK  ' if cond else 'FAIL'
    if not cond:
        ok = False
    print(f'{mark} {name}' + (f' — {detail}' if detail and not cond else ''))


# 1. Логин
_, data = req('POST', '/api/auth/login',
              {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
token = data['token']
print(f'логин супер-админа: роль={data["user"]["role"]}')

# 2. Список групп
_, groups = req('GET', '/api/admin/groups', token=token)
check('GET /admin/groups отдаёт managerName', all('managerName' in g for g in groups))
check('GET /admin/groups отдаёт todayOrderedPeople', all('todayOrderedPeople' in g for g in groups))

group = next((g for g in groups if g['name'] == TEST_GROUP), None)
check(f'найдена группа «{TEST_GROUP}»', group is not None)
if not group:
    sys.exit(1)
print(f'  группа: id={group["id"]}, менеджер сейчас: {group["managerName"]}')

# 3. Преподаватель
_, users = req('GET', '/api/admin/users', token=token)
teacher = next((u for u in users if u['email'] == TEST_TEACHER_EMAIL), None)
check(f'найден преподаватель {TEST_TEACHER_EMAIL}', teacher is not None and teacher['role'] == 'TEACHER')
if not teacher:
    sys.exit(1)
print(f'  преподаватель: id={teacher["id"]}, {teacher["name"]} {teacher["surname"]}, роль={teacher["role"]}')

# 4. Назначение
status, res = req('POST', f'/api/admin/groups/{group["id"]}/manager',
                  {'userId': teacher['id']}, token=token)
check('POST /api/admin/groups/:id/manager — назначение', status == 200 and 'назначен' in res.get('message', ''))
print(f'  ответ: {res.get("message")}')

# 5. Проверка результата
_, users2 = req('GET', '/api/admin/users', token=token)
teacher2 = next(u for u in users2 if u['id'] == teacher['id'])
check('роль преподавателя стала MANAGER', teacher2['role'] == 'MANAGER')
check('преподаватель привязан к группе', teacher2['groupId'] == group['id'])

_, groups2 = req('GET', '/api/admin/groups', token=token)
group2 = next(g for g in groups2 if g['id'] == group['id'])
check('менеджер виден в списке групп', group2['managerName'] == f'{teacher["name"]} {teacher["surname"]}',
      f'получено: {group2["managerName"]}')

print()
print('⚠️  Не забудь откатить тест: bash deploy/revert_manager_test.sh')
print('ИТОГ:', '✅ ВСЁ РАБОТАЕТ' if ok else '⚠️ ЕСТЬ ПРОБЛЕМЫ')
sys.exit(0 if ok else 1)
