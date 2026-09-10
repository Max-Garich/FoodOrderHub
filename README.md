# FoodOrderHub

Система заказа обедов для учебных заведений: группы, менеджеры, лимитированные порции блюд, балансы.

## Роли

| Роль | Что может |
|---|---|
| **Юзер** | Заказывает еду, видит баланс, историю заказов, реквизиты оплаты своей группы |
| **Преподаватель** | Заказывает еду без баланса (бесплатно), видит сумму своих заказов |
| **Менеджер группы** | Участник группы: принимает заявки, пополняет балансы, редактирует заказы, меняет реквизиты оплаты группы |
| **Глава столовой** | Создаёт меню с лимитами порций, доп-меню во время сессии, открывает/закрывает приём заказов, видит отчёты по группам |
| **Супер-админ** | Всё вышеперечисленное + группы CRUD, назначение менеджеров, приём преподавателей, роли, пароли |

## Технологии

- **Frontend**: React 19, Vite, Vanilla CSS (тёмная/светлая тема)
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Инфраструктура**: Docker, Docker Compose

## Деплой на VPS

Требования: Ubuntu 20.04+, 1+ ядро, 1+ ГБ RAM, 8+ ГБ диска, root-доступ.

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Max-Garich/FoodOrderHub.git
cd FoodOrderHub

# 2. Запустить установку (Docker, swap, секреты, сборка — всё само)
bash vps-setup.sh
```

Скрипт сам:
- создаст swap 2G (важно для билда при 1 ГБ RAM)
- сгенерирует `JWT_SECRET` и `POSTGRES_PASSWORD` в `.env`
- установит Docker и Docker Compose
- соберёт и запустит контейнеры (первый билд ~3-5 минут)
- прогонит health-check и выведет адрес сайта

Сайт будет доступен по `http://IP_СЕРВЕРА:3001`.

### После первых тестов

1. **Сменить пароли** супер-админа и главы столовой (сид создаёт их с простыми паролями).
2. Настроить файрвол: `ufw allow 22,3001/tcp && ufw enable`.
3. (Опционально) Подключить домен и HTTPS через nginx + certbot.

### Полезные команды на сервере

```bash
docker compose logs -f app      # логи приложения
docker compose restart app      # рестарт
docker compose down             # остановка
docker compose up -d --build    # пересборка после git pull
```

## Тестовые аккаунты (создаются сидом)

| Роль | Email | Пароль |
|---|---|---|
| Супер-админ | superadmin@foodorderhub.ru | super123 |
| Глава столовой | canteen@foodorderhub.ru | canteen123 |
| Менеджер 101 | manager101@foodorderhub.ru | manager123 |
| Юзер | test@example.com | user123 |

## Локальная разработка

### Без бэкенда (мок-режим)

В `client/src/api/index.js` поставь `USE_MOCK = true`, затем:

```bash
cd client
npm install
npm run dev
```

Все экраны работают на мок-данных, пароль при входе любой. Аккаунты моков — те же email, что в таблице выше.

### С бэкендом

```bash
# PostgreSQL (например, через Docker)
docker run -d --name foodorderhub-db -e POSTGRES_USER=foodorderhub -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=foodorderhub -p 5432:5432 postgres:15-alpine

# Сервер
cd server
cp ../.env.example .env  # укажи DATABASE_URL и JWT_SECRET
npm install
npx prisma db push
npm run db:seed
npm run dev

# Клиент (в другом терминале)
cd client
npm install
USE_MOCK=false npm run dev  # или поправь флаг в api/index.js
```

## Структура

```
client/          # React-приложение (Vite)
  src/api/       # API-клиент + мок-слой
  src/pages/     # страницы: user, manager, canteen, admin
server/          # Express API
  prisma/        # схема БД и сид
  src/routes/    # REST-роуты по ролям
vps-setup.sh     # скрипт установки на сервер
```
