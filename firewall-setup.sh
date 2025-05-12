#!/bin/bash

# Open ports for PACER application
sudo ufw allow 81/tcp    # Frontend web interface
sudo ufw allow 8001/tcp  # Backend API
sudo ufw allow 8002/tcp  # Deployment server
sudo ufw status 