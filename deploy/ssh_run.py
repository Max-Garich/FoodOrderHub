#!/usr/bin/env python3
"""SSH-помощник для деплоя FoodOrderHub на VPS.
Использование: python deploy/ssh_run.py "команда" [--timeout сек]
Читает креды из deploy/creds.json (не в git).
"""
import sys
import json
import os
import paramiko

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS_PATH = os.path.join(HERE, 'creds.json')

def main():
    if len(sys.argv) < 2:
        print('Usage: ssh_run.py "command" [--timeout sec]')
        sys.exit(1)

    command = sys.argv[1]
    timeout = 60
    if '--timeout' in sys.argv:
        idx = sys.argv.index('--timeout')
        timeout = int(sys.argv[idx + 1])

    with open(CREDS_PATH, 'r', encoding='utf-8') as f:
        creds = json.load(f)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=creds['host'],
        username=creds['user'],
        password=creds['password'],
        timeout=15,
        look_for_keys=False,
        allow_agent=False,
    )

    try:
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()

        if out:
            print(out, end='')
        if err:
            print('[STDERR]', err, end='', file=sys.stderr)
        sys.exit(exit_code)
    finally:
        client.close()

if __name__ == '__main__':
    main()
