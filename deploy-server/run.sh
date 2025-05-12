#!/bin/bash

# Set up environment variables
export ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-pacer_admin}

# Make sure Python and dependencies are installed
if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Run the deployment server
echo "Starting PACER deployment server..."
python3 deploy_server.py 