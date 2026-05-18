FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_API_URL is empty — nginx proxies /api from the same origin
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Local docker-compose default; override in Railway with the API's private domain
ENV API_BACKEND=http://api:8080

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$API_BACKEND' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
