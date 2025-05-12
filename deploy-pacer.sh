#!/bin/bash

# This script deploys the PACER application alongside the existing application
# It should be run on the VPS either directly or through your deployment server

# Environment variables for the PACER app
export DB_USER=pacer
export DB_PASSWORD=secure_password_here  # Change this
export DB_NAME=pacer_db
export OPENAI_API_KEY=your_openai_api_key_here  # Change this
export JWT_SECRET=generate_a_secure_random_string_here  # Change this

# Set up directories
PACER_DIR=/home/debian/pacer
mkdir -p $PACER_DIR

# Setup Nginx configuration
echo "Setting up Nginx configuration..."
sudo cp nginx-pacer.conf /etc/nginx/sites-available/ttt9-app
sudo nginx -t && sudo systemctl reload nginx

# Navigate to the application directory
cd $PACER_DIR

# Update environment file
echo "# Database Configuration" > .env
echo "DB_USER=$DB_USER" >> .env
echo "DB_PASSWORD=$DB_PASSWORD" >> .env
echo "DB_NAME=$DB_NAME" >> .env
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "DOMAIN=vps-d067f247.vps.ovh.ca" >> .env
echo "ENVIRONMENT=production" >> .env
echo "LOG_LEVEL=INFO" >> .env

# Start the containers using Docker Compose
echo "Starting PACER application containers..."
docker-compose -f docker-compose.yml up -d --build

echo "PACER application deployed successfully!"
echo "  - Frontend: https://vps-d067f247.vps.ovh.ca/pacer"
echo "  - Backend API: https://vps-d067f247.vps.ovh.ca/pacer-api"
echo "  - API Documentation: https://vps-d067f247.vps.ovh.ca/pacer-docs" 