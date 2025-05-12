#!/bin/bash
# Script to authenticate with GitHub Container Registry and fix Docker setup
# This script requires your GitHub Personal Access Token

# Check if PAT was provided
if [ -z "$1" ]; then
  echo "Error: GitHub Personal Access Token is required"
  echo "Usage: ./github_auth_fix.sh YOUR_GITHUB_TOKEN"
  exit 1
fi

GITHUB_TOKEN=$1

echo "===== Starting GitHub authentication and container fix ====="

# Step 1: Log in to GitHub Container Registry
echo "Logging in to GitHub Container Registry..."
echo $GITHUB_TOKEN | docker login ghcr.io -u pm78 --password-stdin

# Check if login was successful
if [ $? -ne 0 ]; then
  echo "Failed to authenticate with GitHub Container Registry"
  exit 1
fi

echo "Successfully authenticated with GitHub Container Registry"

# Step 2: Stop and remove any existing containers
echo "Cleaning up existing containers..."
docker-compose down 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Step 3: Create a new docker-compose file with auth
echo "Creating docker-compose file with authentication..."
cat > docker-compose.yml << EOF
version: '3'

services:
  postgres:
    image: postgres:13
    container_name: postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=pacer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

  backend:
    image: ghcr.io/pm78/pacer-sales-game-backend:latest
    container_name: pacer_backend
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/pacer
      - SECRET_KEY=your-secret-key-for-jwt-tokens
      - ACCESS_TOKEN_EXPIRE_MINUTES=1440
    ports:
      - "8001:8001"
    depends_on:
      - postgres
    restart: always

  frontend:
    image: ghcr.io/pm78/pacer-sales-game-frontend:latest
    container_name: pacer_frontend
    ports:
      - "3001:3001"
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
EOF

# Step 4: Try pulling the images explicitly first
echo "Pulling Docker images from GitHub Container Registry..."
docker pull ghcr.io/pm78/pacer-sales-game-backend:latest
docker pull ghcr.io/pm78/pacer-sales-game-frontend:latest

# Step 5: Start the database container first
echo "Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 10

# Step 6: Start the backend container
echo "Starting backend container..."
docker-compose up -d backend

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 10

# Check backend logs
echo "Checking backend logs..."
docker logs pacer_backend --tail 20

# Step 7: Start the frontend container
echo "Starting frontend container..."
docker-compose up -d frontend

echo "===== Setup completed ====="
echo "Your containers should now be running with GitHub authentication."
echo "You can check their status with: docker ps"
echo ""
echo "If you're using NGINX as a reverse proxy, make sure it's properly configured."
echo "Run the nginx_config_fix.sh script if needed." 