FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# In Docker, API is proxied via nginx at same origin
ENV VITE_API_BASE=""

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
