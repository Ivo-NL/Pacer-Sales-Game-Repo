#!/bin/bash

echo "=== PACER Backend Connection Fix Script ==="
echo "Date: $(date)"
echo

# Navigate to the pacer directory
cd /home/debian/pacer || { echo "Cannot find /home/debian/pacer directory"; exit 1; }

# Check if we have the necessary files
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml file not found!"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Warning: .env file not found. Checking for .env.production..."
  
  if [ -f ".env.production" ]; then
    echo "Found .env.production - copying to .env"
    cp .env.production .env
  else
    echo "Error: No environment file found. Creating a basic one..."
    
    # Create a basic .env file
    cat > .env << EOF
DB_USER=pacer
DB_PASSWORD=pacer_password_123
DB_NAME=pacer_db
OPENAI_API_KEY=sk-placeholder-replace-with-real-key-later
JWT_SECRET=pacer_jwt_secret_2024
EOF
  fi
fi

# Fix the nginx configuration
echo "Checking nginx configuration..."
if [ -f "nginx-pacer.conf" ]; then
  # Update the nginx configuration to ensure correct proxy settings
  echo "Updating nginx configuration..."
  
  # Make a backup first
  cp nginx-pacer.conf nginx-pacer.conf.bak
  
  # Update the pacer-api location block
  sed -i 's|proxy_pass http://127.0.0.1:8001/api;|proxy_pass http://127.0.0.1:8001/api/;|g' nginx-pacer.conf
  
  # Apply the updated configuration
  sudo cp nginx-pacer.conf /etc/nginx/sites-available/ttt9-app
  sudo nginx -t && sudo systemctl reload nginx
fi

# Restart the containers
echo "Restarting the containers..."
docker-compose down
docker-compose up -d

# Check if containers are running
echo "Checking if containers are running..."
docker ps | grep pacer

echo "Testing backend connection..."
sleep 5  # Give the containers time to start
curl -v http://127.0.0.1:8001/api/health

echo
echo "=== Fix Complete ==="
echo "If you still experience issues, please run the troubleshoot.sh script to gather more information." 