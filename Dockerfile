# Stage 1: Build the frontend
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine
WORKDIR /app

# Install dependencies for the server
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source and prisma schema
COPY server/ ./server/

# Copy built frontend from Stage 1
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
# We use a shell to ensure migrations can run before starting (if needed)
CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss && npm start"]
