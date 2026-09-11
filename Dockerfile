# Stage 1: Build the frontends (user app + admin app)
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build && npm run build:admin

# Stage 2 (target "app"): backend + пользовательский фронтенд на :3001
FROM node:20-alpine AS app
WORKDIR /app

# Install dependencies for the server
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source and prisma schema
COPY server/ ./server/

# Copy built user frontend from Stage 1
COPY --from=client-build /app/client/dist ./client/dist

# Generate Prisma client for PostgreSQL
# (We provide a dummy DATABASE_URL during build because Prisma validates the schema,
# but the real URL from docker-compose is only available at runtime)
RUN cd server && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Final setup
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Command to run the application
# db push создаёт схему на чистой базе, seed наполняет тестовыми аккаунтами (идемпотентно)
CMD ["sh", "-c", "cd server && npx prisma db push && npm run db:seed && npm start"]

# Stage 3 (target "admin"): админ-панель — лёгкий nginx со статикой + прокси /api на app
# Наружу публикуется на порту 3002 (см. docker-compose.yml)
FROM nginx:alpine AS admin
# Убираем дефолтную страницу nginx, иначе она перекрывает нашу статику
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist-admin /usr/share/nginx/html
EXPOSE 80
