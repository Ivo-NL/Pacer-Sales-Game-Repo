#!/bin/bash

# This script updates an existing PACER deployment to fix the double /pacer/ path issue
# It should be run on the server where PACER is deployed

# Set the PACER path
PACER_PATH="/home/debian/pacer"

echo "Updating PACER deployment to fix routing issues..."

# Step 1: Create the fix script if it doesn't exist
if [ ! -f "$PACER_PATH/fix-react-routing.js" ]; then
  echo "Creating React routing fix script..."
  cat > "$PACER_PATH/fix-react-routing.js" << 'EOF'
const fs = require('fs');
const path = require('path');

// Function to find the main JS file
function findMainJsFile(staticJsDir) {
  try {
    const files = fs.readdirSync(staticJsDir);
    const mainJsFile = files.find(file => file.startsWith('main.') && file.endsWith('.js'));
    
    if (!mainJsFile) {
      console.error('Could not find main.*.js file in', staticJsDir);
      return null;
    }
    
    return path.join(staticJsDir, mainJsFile);
  } catch (error) {
    console.error('Error finding main JS file:', error);
    return null;
  }
}

// Main function to fix the routing
function fixReactRouting() {
  // Path to the static JS directory
  const staticJsDir = '/home/debian/pacer/frontend-static/static/js';
  
  // Find the main JS file
  const mainJsPath = findMainJsFile(staticJsDir);
  if (!mainJsPath) {
    process.exit(1);
  }
  
  console.log(`Found main JS file: ${mainJsPath}`);
  
  try {
    // Read the file content
    let content = fs.readFileSync(mainJsPath, 'utf8');
    console.log(`Read ${content.length} bytes from file`);
    
    // Create a backup
    fs.writeFileSync(`${mainJsPath}.bak`, content);
    console.log(`Created backup at ${mainJsPath}.bak`);
    
    // Fix the basename configuration
    const originalContent = content;
    
    // Replace the basename configuration
    content = content.replace(/basename:"\/pacer"/g, 'basename:""');
    
    // Fix any hardcoded /pacer/pacer/ paths
    content = content.replace(/\/pacer\/pacer\//g, '/pacer/');
    
    // Check if any changes were made
    if (content === originalContent) {
      console.log('No changes needed to be made');
    } else {
      // Write the modified content back to the file
      fs.writeFileSync(mainJsPath, content);
      console.log(`Updated ${mainJsPath} with routing fixes`);
    }
    
    console.log('Routing fix completed successfully');
  } catch (error) {
    console.error('Error fixing React routing:', error);
    process.exit(1);
  }
}

// Run the fix
fixReactRouting();
EOF
fi

# Step 2: Update NGINX configuration to handle double /pacer/ paths
echo "Updating NGINX configuration..."
cat > "$PACER_PATH/nginx-pacer-fixed.conf" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name vps-d067f247.vps.ovh.ca processgeniuspro.com www.processgeniuspro.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name vps-d067f247.vps.ovh.ca;
    
    ssl_certificate /etc/letsencrypt/live/vps-d067f247.vps.ovh.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps-d067f247.vps.ovh.ca/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # TTT9 application (root)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Fix for double /pacer/pacer/ paths
    location ~ ^/pacer/pacer/(.*)$ {
        return 301 /pacer/$1;
    }
    
    # PACER frontend static files
    location /pacer/ {
        alias /home/debian/pacer/frontend-static/;
        try_files $uri $uri/ /pacer/index.html;
    }
    
    # PACER API
    location /pacer-api/ {
        rewrite ^/pacer-api/(.*) /api/$1 break;
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name processgeniuspro.com;
    
    ssl_certificate /etc/letsencrypt/live/www.processgeniuspro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.processgeniuspro.com/privkey.pem;
    
    # Redirect to www version
    return 301 https://www.processgeniuspro.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.processgeniuspro.com;
    
    ssl_certificate /etc/letsencrypt/live/www.processgeniuspro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.processgeniuspro.com/privkey.pem;
    
    # TTT9 application (root)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Fix for double /pacer/pacer/ paths
    location ~ ^/pacer/pacer/(.*)$ {
        return 301 /pacer/$1;
    }
    
    # PACER frontend static files
    location /pacer/ {
        alias /home/debian/pacer/frontend-static/;
        try_files $uri $uri/ /pacer/index.html;
    }
    
    # PACER API
    location /pacer-api/ {
        rewrite ^/pacer-api/(.*) /api/$1 break;
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Step 3: Make sure nodejs is installed
echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    sudo apt-get update
    sudo apt-get install -y nodejs
fi

# Step 4: Run the fix script
echo "Running React routing fix script..."
cd "$PACER_PATH"
node fix-react-routing.js

# Step 5: Apply the updated NGINX configuration
echo "Applying updated NGINX configuration..."
sudo cp "$PACER_PATH/nginx-pacer-fixed.conf" /etc/nginx/sites-available/default
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "NGINX configuration test passed, reloading NGINX..."
    sudo systemctl reload nginx
    echo "Update completed successfully!"
else
    echo "NGINX configuration test failed, not applying changes."
    exit 1
fi

echo "PACER has been updated to fix the double /pacer/ path issue" 