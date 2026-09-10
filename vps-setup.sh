#!/bin/bash

# FoodOrderHub VPS Setup Script
# Запустить на чистом Ubuntu/Debian VPS: bash vps-setup.sh
# Требования: 1+ ядро, 1+ ГБ RAM, 8+ ГБ диска

set -e

echo "=== FoodOrderHub VPS Setup ==="
echo ""

# ═══ [1/7] Swap (критично для 1 ГБ RAM — билд образа ест память) ═══
echo "[1/7] Проверка swap..."
if swapon --show | grep -q .; then
    echo "Swap уже есть:"
    swapon --show
else
    TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM_MB" -lt 2048 ]; then
        echo "RAM ${TOTAL_RAM_MB} МБ < 2 ГБ — создаю swap 2G..."
        if [ -f /swapfile ]; then
            echo "/swapfile существует, активирую..."
            chmod 600 /swapfile
            mkswap /swapfile 2>/dev/null || true
            swapon /swapfile
        else
            fallocate -l 2G /swapfile
            chmod 600 /swapfile
            mkswap /swapfile
            swapon /swapfile
        fi
        # В fstab навсегда (если строки ещё нет)
        grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        echo "Swap 2G создан и включён"
    else
        echo "RAM ${TOTAL_RAM_MB} МБ — swap не обязателен, пропускаю"
    fi
fi

# ═══ [2/7] Секреты в .env ═══
echo ""
echo "[2/7] Создание .env..."
if [ -f .env ] && grep -q '^JWT_SECRET=..' .env; then
    echo ".env уже существует, секреты сохранены"
else
    JWT_SECRET_NEW=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    POSTGRES_PASSWORD_NEW=$(openssl rand -hex 16 2>/dev/null || node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    cat > .env << EOF
JWT_SECRET=$JWT_SECRET_NEW
POSTGRES_USER=foodorderhub
POSTGRES_PASSWORD=$POSTGRES_PASSWORD_NEW
POSTGRES_DB=foodorderhub
EOF
    chmod 600 .env
    echo ".env создан (секреты сгенерированы)"
fi

# ═══ [3/7] Docker ═══
echo ""
echo "[3/7] Установка Docker..."
if command -v docker &> /dev/null; then
    echo "Docker уже установлен: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    echo "Docker установлен: $(docker --version)"
fi

# ═══ [4/7] Docker Compose (v2 plugin или фолбэк на старый) ═══
echo ""
echo "[4/7] Проверка Docker Compose..."
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
    echo "Docker Compose v2: $($COMPOSE version)"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
    echo "Docker Compose (legacy): $($COMPOSE version)"
else
    echo "Устанавливаю docker-compose-plugin..."
    apt update && apt install -y docker-compose-plugin 2>/dev/null \
      || (apt install -y docker-compose 2>/dev/null || true)
    if docker compose version &> /dev/null; then
        COMPOSE="docker compose"
        echo "Docker Compose v2 установлен"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE="docker-compose"
        echo "docker-compose (legacy) установлен"
    else
        echo "ОШИБКА: Docker Compose не удалось установить."
        echo "Установи вручную: https://docs.docker.com/compose/install/"
        exit 1
    fi
fi

# ═══ [5/7] Сборка и запуск ═══
echo ""
echo "[5/7] Сборка и запуск (первый билд ~3-5 минут)..."
$COMPOSE up -d --build

# ═══ [6/7] Health check с retry ═══
echo ""
echo "[6/7] Ожидание запуска сервера..."
HEALTH_OK=false
for i in $(seq 1 15); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        HEALTH_OK=true
        break
    fi
    echo "  попытка $i/15 — ждём..."
    sleep 3
done

# ═══ [7/7] Итог ═══
echo ""
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ "$HEALTH_OK" = true ]; then
    echo "═══════════════════════════════════════════"
    echo "  Готово! Сайт доступен: http://${SERVER_IP}:3001"
    echo "═══════════════════════════════════════════"
    echo ""
    echo "Тестовые аккаунты (созданы сидом):"
    echo "  Супер-админ:     superadmin@foodorderhub.ru / super123"
    echo "  Глава столовой:  canteen@foodorderhub.ru / canteen123"
    echo "  Менеджер 101:    manager101@foodorderhub.ru / manager123"
    echo "  Юзер:            test@example.com / user123"
    echo ""
    echo "ВАЖНО после тестов:"
    echo "  1. Сменить пароли супер-админа и главы столовой!"
    echo "  2. Открыть только нужные порты: ufw allow 22,3001 && ufw enable"
    echo ""
    echo "Полезные команды:"
    echo "  Логи:      $COMPOSE logs -f app"
    echo "  Рестарт:   $COMPOSE restart app"
    echo "  Стоп:      $COMPOSE down"
else
    echo "Сайт не ответил на health-check. Смотри логи:"
    echo "  $COMPOSE logs app"
    echo "  $COMPOSE logs db"
    exit 1
fi
