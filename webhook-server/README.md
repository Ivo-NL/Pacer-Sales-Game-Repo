# PACER Deployment Webhook Server

This server handles deployment webhooks from GitHub Actions to automatically update your PACER application.

## Installation on Debian VPS

1. Install Node.js and npm:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

2. Create the webhook directory:

```bash
mkdir -p /home/debian/webhook-server
```

3. Copy all files from this directory to `/home/debian/webhook-server/`

4. Install dependencies:

```bash
cd /home/debian/webhook-server
npm install
```

5. Set up the systemd service:

```bash
# Edit the service file to set your deploy token and repository
nano pacer-webhook.service

# Copy the service file to systemd
sudo cp pacer-webhook.service /etc/systemd/system/

# Enable and start the service
sudo systemctl enable pacer-webhook
sudo systemctl start pacer-webhook
sudo systemctl status pacer-webhook
```

6. Set up a simple nginx proxy for the webhook (optional if you want HTTPS):

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/webhook
```

Add this configuration:

```
server {
    listen 80;
    server_name your-domain.com;

    location /deploy-webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. Set up SSL with Let's Encrypt (optional):

```bash
sudo certbot --nginx -d your-domain.com
``` 