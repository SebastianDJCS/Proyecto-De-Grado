# Etapa 1: compilar el frontend con Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# .env.production ya define VITE_API_URL=/api (relativo -> Caddy proxy al backend)
RUN npm run build

# Etapa 2: servir el build y hacer de proxy con Caddy (HTTPS automatico)
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
