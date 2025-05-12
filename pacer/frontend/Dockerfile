FROM node:16-alpine AS build

WORKDIR /app

# This is a placeholder Dockerfile
# It will be replaced with your actual frontend code

# Add a placeholder package.json
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .
RUN npm run build

# Production environment
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Add custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 