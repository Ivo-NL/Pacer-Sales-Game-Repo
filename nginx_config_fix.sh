#!/bin/bash
# Script to update NGINX configuration for PACER application
# This ensures proper reverse proxy to Docker containers

echo "===== Starting NGINX configuration fix ====="

# Create new NGINX config file
echo "Creating NGINX configuration..."
NGINX_CONFIG=$(cat <<'EOF'
server {
    listen 80;
    server_name vps-d067f247.vps.ovh.ca;

    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name vps-d067f247.vps.ovh.ca;

    ssl_certificate /etc/letsencrypt/live/vps-d067f247.vps.ovh.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps-d067f247.vps.ovh.ca/privkey.pem;

    # Frontend application
    location /pacer/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /pacer-api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Raw backend (for direct access)
    location /pacer-backend/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API documentation
    location /pacer-docs/ {
        proxy_pass http://localhost:8001/docs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle root login endpoint
    location = /login {
        proxy_pass http://localhost:8001/login;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
)

# Backup current config
echo "Backing up current NGINX configuration..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%F-%H%M%S)

# Write new config
echo "Writing new NGINX configuration..."
echo "$NGINX_CONFIG" | sudo tee /etc/nginx/sites-available/default

# Test NGINX configuration
echo "Testing NGINX configuration..."
sudo nginx -t

# If NGINX test is successful, reload NGINX
if [ $? -eq 0 ]; then
    echo "Reloading NGINX..."
    sudo systemctl reload nginx
    echo "NGINX configuration updated and service reloaded."
else
    echo "NGINX configuration test failed. Please check the configuration."
    echo "Reverting to previous configuration..."
    sudo cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default
    sudo systemctl reload nginx
fi

echo "===== NGINX configuration fix completed =====" 