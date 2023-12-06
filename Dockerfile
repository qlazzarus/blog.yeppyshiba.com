FROM node:17-alpine AS build

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

FROM nginx:1.18-alpine AS deploy

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/public .
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]