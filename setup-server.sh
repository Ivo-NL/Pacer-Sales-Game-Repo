#!/bin/bash
# Simple bootstrap script
echo "Downloading setup script from GitHub..."
curl -o setup-deploy-server.sh https://raw.githubusercontent.com/pm78/pacer-sales-game/main/setup-deploy-server.sh
chmod +x setup-deploy-server.sh
echo "Running setup script..."
./setup-deploy-server.sh 