const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// Set up deployment directory
const DEPLOY_DIR = '/home/debian/pacer-deploy';
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || 'your-secure-token-here';
const REPOSITORY = process.env.REPOSITORY || 'your-username/pacer';

// Ensure the deployment directory exists
if (!fs.existsSync(DEPLOY_DIR)) {
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
}

// Webhook endpoint
app.post('/deploy-webhook', (req, res) => {
  console.log('Received deployment webhook');
  
  // Verify token
  if (req.body.token !== DEPLOY_TOKEN) {
    console.error('Invalid token received');
    return res.status(401).send('Unauthorized');
  }
  
  // Verify repository
  if (req.body.repository !== REPOSITORY) {
    console.error('Invalid repository');
    return res.status(400).send('Invalid repository');
  }
  
  console.log('Starting deployment process...');
  
  // Run the deployment script
  const deployScript = `
    cd ${DEPLOY_DIR}
    
    # Download the latest files
    curl -L https://github.com/${REPOSITORY}/archive/refs/heads/main.tar.gz -o main.tar.gz
    tar -xzf main.tar.gz --strip-components=1 -C .
    rm main.tar.gz
    
    # Make deploy script executable
    chmod +x deploy.sh
    
    # Run the deploy script
    ./deploy.sh
  `;
  
  exec(deployScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`Deployment error: ${error.message}`);
      return res.status(500).send('Deployment failed');
    }
    
    console.log(`Deployment stdout: ${stdout}`);
    console.error(`Deployment stderr: ${stderr}`);
    console.log('Deployment completed successfully');
    
    return res.status(200).send('Deployment completed successfully');
  });
});

// Create HTTP server if no SSL certificates are available
if (!fs.existsSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem')) {
  app.listen(PORT, () => {
    console.log(`Webhook server running on http://localhost:${PORT}`);
  });
} else {
  // Create HTTPS server with Let's Encrypt certificates
  const credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem', 'utf8')
  };
  
  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`Webhook server running on https://localhost:${PORT}`);
  });
} 