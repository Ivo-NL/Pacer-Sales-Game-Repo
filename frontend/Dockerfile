FROM node:16-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Set the public URL explicitly - this matches the NGINX alias path
ENV PUBLIC_URL=/pacer
# Ensure we're in production mode
ENV NODE_ENV=production
RUN npm run build

# Production environment
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
# Add custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 