# Etapa 1: compilar el frontend con Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# .env.production ya define VITE_API_URL=/api (relativo -> nginx proxy al backend)
RUN npm run build

# Etapa 2: servir el build estatico con nginx y hacer de proxy a /api
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
