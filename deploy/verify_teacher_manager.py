#!/usr/bin/env python3
"""Проверка менеджера-преподавателя (teacher-manager) на проде.

Сценарий (безопасен — всё откатывается в конце):
  1. Логин супер-админа.
  2. GET /api/admin/teachers — есть поля role/groupId/managerIsTeacher/group.
  3. Назначаем преподавателя pre@gmail.com менеджером «Группа 103»
     (пустая группа без менеджера).
  4. Логин под ним: role=MANAGER, managerIsTeacher=true, balance=null,
     в профиле те же поля.
  5. GET /api/manager/users — работает, себя в списке нет.
  6. GET /api/manager/requests — работает.
  7. /admin/teachers показывает его с managerIsTeacher=true и группой.
  8. /admin/groups показывает managerIsTeacher=true.
  9. Снимаем менеджера (DELETE) — препод снова TEACHER без группы.
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
    print(f'{mark} {name}' + (f' — {detail}' if detail else ''))


# 1. Логин супер-админа
_, data = req('POST', '/api/auth/login',
              {'email': 'superadmin@foodorderhub.ru', 'password': 'super123'})
token = data['token']

# 2. Список групп + преподавателей
_, groups = req('GET', '/api/admin/groups', token=token)
group = next((g for g in groups if g['name'] == TEST_GROUP), None)
check(f'найдена группа «{TEST_GROUP}»', group is not None)
if not group:
    sys.exit(1)
print(f'  группа id={group["id"]}, менеджер сейчас: {group["managerName"]}')

_, teachers = req('GET', '/api/admin/teachers', token=token)
check('/admin/teachers отдаёт role/groupId/managerIsTeacher/group',
      all(all(k in t for k in ('role', 'groupId', 'managerIsTeacher', 'group')) for t in teachers))
teacher = next((t for t in teachers if t['email'] == TEST_TEACHER_EMAIL), None)
check(f'найден препод {TEST_TEACHER_EMAIL}', teacher is not None)
if not teacher:
    sys.exit(1)
check('препод сейчас TEACHER без группы',
      teacher['role'] == 'TEACHER' and not teacher['managerIsTeacher'] and teacher['groupId'] is None,
      f'role={teacher["role"]}, managerIsTeacher={teacher["managerIsTeacher"]}, groupId={teacher["groupId"]}')

# 3. Назначаем менеджером (если уже назначен прошлым прогоном — пропускаем)
already = (teacher['role'] == 'MANAGER' and teacher['managerIsTeacher']
           and teacher['groupId'] == group['id'])
if already:
    print('  уже назначен прошлым прогоном — пропускаем назначение')
else:
    _, res = req('POST', f'/api/admin/groups/{group["id"]}/manager',
                 {'userId': teacher['id']}, token)
    print(f'  назначение: {res["message"]}')

# 4. Логин под преподом-менеджером (пароль сбрасываем — тестовый аккаунт)
_, _ = req('POST', f'/api/admin/users/{teacher["id"]}/reset-password',
           {'password': 'test1234'}, token)
_, tdata = req('POST', '/api/auth/login',
               {'email': TEST_TEACHER_EMAIL, 'password': 'test1234'})
tuser = tdata['user']
ttoken = tdata['token']
check('логин: role=MANAGER', tuser['role'] == 'MANAGER', f'role={tuser["role"]}')
check('логин: managerIsTeacher=true', tuser.get('managerIsTeacher') is True,
      f'managerIsTeacher={tuser.get("managerIsTeacher")}')
check('логин: balance=null (баланса нет)', tuser.get('balance') is None,
      f'balance={tuser.get("balance")}')
check('логин: группа привязана', tuser.get('group', {}) and tuser['group']['id'] == group['id'])

_, prof = req('GET', '/api/user/profile', token=ttoken)
check('профиль: managerIsTeacher=true', prof.get('managerIsTeacher') is True)
check('профиль: balance=null', prof.get('balance') is None)

# 5. Менеджерский список юзеров (себя быть не должно)
_, musers = req('GET', '/api/manager/users', token=ttoken)
check('GET /manager/users работает', isinstance(musers, list))
check('менеджера нет в собственном списке', all(u['id'] != teacher['id'] for u in musers))

# 6. Заявки
_, mreqs = req('GET', '/api/manager/requests', token=ttoken)
check('GET /manager/requests работает', isinstance(mreqs, list))

# 7. /admin/teachers показывает менеджера-препода
_, teachers2 = req('GET', '/api/admin/teachers', token=token)
t2 = next((t for t in teachers2 if t['id'] == teacher['id']), None)
check('препод виден в /admin/teachers после назначения', t2 is not None)
if t2:
    check('managerIsTeacher=true и группа указана',
          t2['managerIsTeacher'] is True and t2['groupId'] == group['id'] and t2['group']['name'] == TEST_GROUP,
          f'managerIsTeacher={t2.get("managerIsTeacher")}, group={t2.get("group")}')

# 8. /admin/groups показывает managerIsTeacher
_, groups2 = req('GET', '/api/admin/groups', token=token)
g2 = next((g for g in groups2 if g['id'] == group['id']), None)
check('/admin/groups: managerIsTeacher=true и managerName',
      g2 and g2['managerIsTeacher'] is True and g2['managerName'] is not None,
      f'managerIsTeacher={g2 and g2.get("managerIsTeacher")}')

# 9. Снимаем менеджера
_, res = req('DELETE', f'/api/admin/groups/{group["id"]}/manager', token=token)
print(f'  снятие: {res["message"]}')

_, tdata2 = req('POST', '/api/auth/login',
                {'email': TEST_TEACHER_EMAIL, 'password': 'test1234'})
u2 = tdata2['user']
check('после снятия: снова TEACHER', u2['role'] == 'TEACHER', f'role={u2["role"]}')
check('после снятия: groupId=null и balance=null',
      u2.get('groupId') is None and u2.get('balance') is None)

print()
print('✅ ВСЁ РАБОТАЕТ' if ok else '❌ ЕСТЬ ОШИБКИ — смотри FAIL выше')
sys.exit(0 if ok else 1)
