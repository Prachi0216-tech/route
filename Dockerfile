# Multi-stage production build for MyRoute
FROM node:20-alpine AS build

WORKDIR /app

# Copy root and package manifests
COPY package.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install client dependencies and build
WORKDIR /app/client
RUN npm ci
COPY client/ ./
RUN npm run build

# Install server production dependencies
WORKDIR /app/server
RUN npm ci --only=production
COPY server/ ./

# Production runtime stage
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY package.json ./

EXPOSE 5000

CMD ["node", "server/server.js"]
