#!/bin/bash

# FoodOrderHub VPS Setup Script
# Запустить: bash vps-setup.sh

set -e

echo "=== FoodOrderHub VPS Setup ==="
echo ""

# Генерация JWT_SECRET если не задан
if [ -z "$JWT_SECRET" ]; then
    echo "[1/6] Генерация JWT_SECRET..."
    export JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "JWT_SECRET сгенерирован"
else
    echo "[1/6] JWT_SECRET уже задан"
fi

# Создание .env файла
echo "[2/6] Создание .env файла..."
cat > .env << EOF
JWT_SECRET=$JWT_SECRET
EOF
echo ".env создан"

# Установка Docker если не установлен
if ! command -v docker &> /dev/null; then
    echo "[3/6] Установка Docker..."
    curl -fsSL https://get.docker.com | sh
    docker --version
else
    echo "[3/6] Docker уже установлен"
fi

# Установка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "[4/6] Установка Docker Compose..."
    apt update && apt install -y docker-compose
else
    echo "[4/6] Docker Compose уже установлен"
fi

# Запуск сервисов
echo "[5/6] Запуск Docker Compose..."
docker-compose up -d --build

# Ожидание запуска
echo "[6/6] Проверка запуска..."
sleep 10

# Проверка статуса
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo ""
    echo "=== ✅ Готово! ==="
    echo "Сайт доступен по адресу: http://$(hostname -I | awk '{print $1}'):3001"
else
    echo "Сайт пока не отвечает, проверь логи: docker-compose logs"
fi