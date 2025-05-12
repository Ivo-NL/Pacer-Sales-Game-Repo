#!/bin/bash

echo "=== PACER Troubleshooting Script ==="
echo "Date: $(date)"
echo

echo "=== Docker Containers ==="
docker ps -a | grep pacer
echo

echo "=== Docker Network ==="
docker network ls
echo

echo "=== Docker Network Details ==="
NETWORK_ID=$(docker network ls | grep bridge | awk '{print $1}')
docker network inspect $NETWORK_ID
echo

echo "=== Nginx Configuration ==="
cat /etc/nginx/sites-available/ttt9-app
echo

echo "=== Testing Connection to Backend ==="
curl -v http://127.0.0.1:8001/api/health
echo

echo "=== Backend Container Logs (last 20 lines) ==="
docker logs pacer_backend --tail 20
echo

echo "=== Frontend Container Logs (last 20 lines) ==="
docker logs pacer_frontend --tail 20
echo

echo "=== nginx-pacer.conf in pacer directory ==="
cat /home/debian/pacer/nginx-pacer.conf
echo

echo "=== docker-compose.yml in pacer directory ==="
cat /home/debian/pacer/docker-compose.yml
echo

echo "=== deploy-pacer.sh in pacer directory ==="
cat /home/debian/pacer/deploy-pacer.sh
echo

echo "=== Checking for .env file ==="
ls -la /home/debian/pacer/.env
echo

echo "=== Checking CORS settings in backend container ==="
docker exec pacer_backend env | grep CORS
echo

echo "=== Troubleshooting Complete ===" 