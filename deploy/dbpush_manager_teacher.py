#!/usr/bin/env python3
"""Проверка/применение миграции manager_is_teacher на проде (без экранирования кавычек)."""
import json
import os
import sys

import paramiko

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'creds.json'), 'r', encoding='utf-8') as f:
    creds = json.load(f)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(creds['host'], username=creds['user'], password=creds['password'],
               timeout=15, look_for_keys=False, allow_agent=False)

cmds = [
    # применить миграцию, если колонки ещё нет
    "cd /opt/FoodOrderHub && docker compose exec -T db psql -U foodorderhub -d foodorderhub "
    "-tc \"SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='manager_is_teacher';\"",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=240)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f'CMD: {cmd[:80]}...')
    print(f'OUT: {out}')
    if err:
        print(f'ERR: {err}')

count = out.strip()
if count == '0':
    print('Колонки нет — применяю prisma db push...')
    stdin, stdout, stderr = client.exec_command(
        'cd /opt/FoodOrderHub && docker compose exec -T app npx prisma db push',
        timeout=240,
    )
    print(stdout.read().decode().strip()[-500:])
    err = stderr.read().decode().strip()
    if err:
        print('STDERR:', err[-300:])
    # повторная проверка
    stdin, stdout, stderr = client.exec_command(cmds[0], timeout=60)
    print('Проверка после push:', stdout.read().decode().strip())
else:
    print('Колонка уже есть — миграция не нужна.')

client.close()
