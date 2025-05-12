#!/bin/bash

# This script sets up the deployment server on the VPS
# It should be run directly on the VPS through the web console or alternative access

# Set secure credentials (change these)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="pacerpassword123"
DEPLOY_TOKEN="pacer-deploy-token-2024"

# Create deployment server directory
echo "Creating deployment server directory..."
mkdir -p /home/debian/deploy-server

# Create Python deployment server
cat > /home/debian/deploy-server/deploy_server.py << 'EOF'
#!/usr/bin/env python3
"""
Simple deployment server for PACER application.
Provides a web interface to deploy Docker containers.
"""

import os
import sys
import json
import time
import shutil
import zipfile
import tempfile
import subprocess
import threading
import base64
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from http import HTTPStatus
import cgi
import urllib.parse

# Configuration
HOST = '0.0.0.0'
PORT = 8002  # Using port 8002 to avoid conflicts
DEPLOY_DIR = '/home/debian/pacer'
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'pacer_admin')
DEPLOY_TOKEN = os.environ.get('DEPLOY_TOKEN', 'pacer-deploy-token-2024')
TASK_HISTORY = []  # Store deployment history
MAX_HISTORY = 10   # Maximum number of history items to keep

# Deployment log
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deploy.log')

def log(message):
    """Write to log file with timestamp"""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    log_message = f"{timestamp} - {message}"
    print(log_message)
    with open(LOG_FILE, 'a') as f:
        f.write(log_message + '\n')

def run_command(command, cwd=None):
    """Run a shell command and return output"""
    log(f"Running command: {command}")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            cwd=cwd,
            text=True
        )
        output = result.stdout
        log(f"Command output: {output}")
        return {"success": True, "output": output}
    except subprocess.CalledProcessError as e:
        error = f"Command failed: {e.stderr}"
        log(error)
        return {"success": False, "error": error}

def is_authenticated(headers):
    """Check if request has valid authentication"""
    auth_header = headers.get('Authorization')
    if not auth_header:
        return False
    
    try:
        auth_type, auth_string = auth_header.split(' ', 1)
        if auth_type.lower() != 'basic':
            return False
        
        credentials = base64.b64decode(auth_string).decode('utf-8')
        username, password = credentials.split(':', 1)
        return username == ADMIN_USERNAME and password == ADMIN_PASSWORD
    except Exception as e:
        log(f"Authentication error: {e}")
        return False

def is_valid_token(token):
    """Check if the deploy token is valid"""
    return token == DEPLOY_TOKEN

def handle_deployment(file_path, env_file=None):
    """Handle the deployment of the uploaded zip file"""
    task_id = int(time.time())
    task = {
        "id": task_id,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "status": "running",
        "logs": []
    }
    TASK_HISTORY.insert(0, task)
    
    # Trim history if needed
    if len(TASK_HISTORY) > MAX_HISTORY:
        TASK_HISTORY.pop()
    
    def update_log(message):
        task["logs"].append(message)
        log(message)
    
    def deployment_thread():
        try:
            update_log("Starting deployment...")
            
            # Ensure deploy directory exists
            os.makedirs(DEPLOY_DIR, exist_ok=True)
            
            # Extract the ZIP file
            update_log(f"Extracting files to {DEPLOY_DIR}")
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(DEPLOY_DIR)
            
            # If env file was provided, save it
            if env_file:
                env_path = os.path.join(DEPLOY_DIR, '.env')
                update_log(f"Writing environment file to {env_path}")
                with open(env_path, 'wb') as f:
                    f.write(env_file)
            
            # Run Docker Compose
            update_log("Starting Docker containers...")
            result = run_command('docker-compose -f docker-compose.yml up -d --build', cwd=DEPLOY_DIR)
            
            if result['success']:
                update_log("Deployment completed successfully!")
                task["status"] = "completed"
            else:
                update_log(f"Deployment failed: {result.get('error', 'Unknown error')}")
                task["status"] = "failed"
        
        except Exception as e:
            update_log(f"Deployment error: {str(e)}")
            task["status"] = "failed"
    
    # Start the deployment in a background thread
    thread = threading.Thread(target=deployment_thread)
    thread.start()
    
    return task_id

def handle_github_webhook(data):
    """Handle webhook from GitHub Actions"""
    task_id = int(time.time())
    task = {
        "id": task_id,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "status": "running",
        "source": "github_webhook",
        "logs": []
    }
    TASK_HISTORY.insert(0, task)
    
    # Trim history if needed
    if len(TASK_HISTORY) > MAX_HISTORY:
        TASK_HISTORY.pop()
    
    def update_log(message):
        task["logs"].append(message)
        log(message)
    
    def webhook_thread():
        try:
            update_log(f"Received webhook from GitHub repository: {data.get('repository', 'unknown')}")
            
            # Ensure deploy directory exists
            os.makedirs(DEPLOY_DIR, exist_ok=True)
            
            # Check if encoded files are provided
            if 'encoded_files' in data:
                update_log("Processing encoded deployment files")
                
                # Decode and save the zip file
                zip_data = base64.b64decode(data['encoded_files'])
                zip_path = os.path.join(DEPLOY_DIR, "temp_deploy.zip")
                with open(zip_path, 'wb') as f:
                    f.write(zip_data)
                
                # Extract the zip file
                update_log(f"Extracting files to {DEPLOY_DIR}")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(DEPLOY_DIR)
                
                # Remove the temporary zip file
                os.remove(zip_path)
                
                # Check if we got a docker-compose file
                if os.path.exists(os.path.join(DEPLOY_DIR, "docker-compose.vps.yml")):
                    # Rename docker-compose.vps.yml to docker-compose.yml
                    os.rename(
                        os.path.join(DEPLOY_DIR, "docker-compose.vps.yml"),
                        os.path.join(DEPLOY_DIR, "docker-compose.yml")
                    )
                
                # Check if we got an environment file
                if os.path.exists(os.path.join(DEPLOY_DIR, ".env.production")):
                    # Rename .env.production to .env
                    os.rename(
                        os.path.join(DEPLOY_DIR, ".env.production"),
                        os.path.join(DEPLOY_DIR, ".env")
                    )
                
                # Check if we need to update Nginx configuration
                if os.path.exists(os.path.join(DEPLOY_DIR, "nginx-pacer.conf")):
                    update_log("Updating Nginx configuration")
                    nginx_result = run_command(
                        f"sudo cp {os.path.join(DEPLOY_DIR, 'nginx-pacer.conf')} /etc/nginx/sites-available/ttt9-app && "
                        f"sudo nginx -t && sudo systemctl reload nginx"
                    )
                    if not nginx_result['success']:
                        update_log(f"Warning: Nginx configuration failed: {nginx_result.get('error', 'Unknown error')}")
                
                # Start Docker containers
                update_log("Starting Docker containers...")
                deploy_result = run_command('docker-compose up -d', cwd=DEPLOY_DIR)
                
                if deploy_result['success']:
                    update_log("PACER application deployed successfully!")
                    task["status"] = "completed"
                else:
                    update_log(f"Deployment failed: {deploy_result.get('error', 'Unknown error')}")
                    task["status"] = "failed"
            else:
                update_log("No encoded files provided in the webhook payload")
                task["status"] = "failed"
        
        except Exception as e:
            update_log(f"Webhook processing error: {str(e)}")
            task["status"] = "failed"
    
    # Start the webhook processing in a background thread
    thread = threading.Thread(target=webhook_thread)
    thread.start()
    
    return task_id

class DeploymentHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for deployment server"""
    
    def _send_response(self, status_code, content=None, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.end_headers()
        
        if content:
            if content_type == 'application/json' and not isinstance(content, str):
                content = json.dumps(content)
            self.wfile.write(content.encode('utf-8') if isinstance(content, str) else content)
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self._send_response(HTTPStatus.NO_CONTENT)
    
    def do_GET(self):
        """Handle GET requests"""
        if not is_authenticated(self.headers):
            self._send_response(HTTPStatus.UNAUTHORIZED, '{"error": "Authentication required"}')
            return
        
        path = urllib.parse.urlparse(self.path).path
        
        if path == '/' or path == '/pacer-deploy':
            # Serve HTML interface
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>PACER Deployment Server</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c3e50; }
                    .container { margin-top: 30px; }
                    .card { border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input[type="file"], textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                    button { background-color: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
                    button:hover { background-color: #2980b9; }
                    .log { background-color: #f9f9f9; border: 1px solid #ddd; padding: 10px; height: 300px; overflow-y: auto; font-family: monospace; }
                    .history-item { padding: 10px; border-bottom: 1px solid #eee; }
                    .status-running { color: #f39c12; }
                    .status-completed { color: #27ae60; }
                    .status-failed { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1>PACER Deployment Server</h1>
                
                <div class="container">
                    <div class="card">
                        <h2>Deploy PACER Application</h2>
                        <div class="form-group">
                            <label for="app-zip">Application ZIP file:</label>
                            <input type="file" id="app-zip" accept=".zip">
                        </div>
                        <div class="form-group">
                            <label for="env-file">Environment variables (optional):</label>
                            <textarea id="env-file" rows="8" placeholder="# Database Configuration&#10;DB_USER=pacer&#10;DB_PASSWORD=secure_password_here&#10;DB_NAME=pacer_db&#10;&#10;# API Keys&#10;OPENAI_API_KEY=your_openai_api_key_here"></textarea>
                        </div>
                        <button id="deploy-btn">Deploy Application</button>
                    </div>
                    
                    <div class="card">
                        <h2>Deployment Log</h2>
                        <div class="log" id="log"></div>
                    </div>
                    
                    <div class="card">
                        <h2>Deployment History</h2>
                        <div id="history"></div>
                    </div>
                </div>
                
                <script>
                    const username = prompt('Enter username:');
                    const password = prompt('Enter password:');
                    const authHeader = 'Basic ' + btoa(username + ':' + password);
                    
                    // Load deployment history
                    function loadHistory() {
                        fetch('/history', {
                            headers: {
                                'Authorization': authHeader
                            }
                        })
                        .then(response => {
                            if (!response.ok) throw new Error('Authentication failed');
                            return response.json();
                        })
                        .then(data => {
                            const historyEl = document.getElementById('history');
                            historyEl.innerHTML = '';
                            
                            if (data.length === 0) {
                                historyEl.innerHTML = '<p>No deployment history yet.</p>';
                                return;
                            }
                            
                            data.forEach(item => {
                                const statusClass = `status-${item.status}`;
                                const historyItem = document.createElement('div');
                                historyItem.className = 'history-item';
                                historyItem.innerHTML = `
                                    <p>
                                        <strong>ID:</strong> ${item.id} | 
                                        <strong>Time:</strong> ${item.timestamp} | 
                                        <strong>Status:</strong> <span class="${statusClass}">${item.status}</span>
                                        ${item.source ? ` | <strong>Source:</strong> ${item.source}` : ''}
                                    </p>
                                    <p><button onclick="viewLogs(${item.id})">View Logs</button></p>
                                `;
                                historyEl.appendChild(historyItem);
                            });
                        })
                        .catch(error => {
                            console.error('Error loading history:', error);
                            if (error.message === 'Authentication failed') {
                                alert('Authentication failed. Please refresh the page and try again.');
                            }
                        });
                    }
                    
                    // View logs for a task
                    window.viewLogs = function(taskId) {
                        fetch(`/tasks/${taskId}`, {
                            headers: {
                                'Authorization': authHeader
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            const logEl = document.getElementById('log');
                            logEl.innerHTML = '';
                            
                            data.logs.forEach(log => {
                                const logLine = document.createElement('p');
                                logLine.textContent = log;
                                logEl.appendChild(logLine);
                            });
                            
                            // Scroll to bottom
                            logEl.scrollTop = logEl.scrollHeight;
                        })
                        .catch(error => {
                            console.error('Error loading logs:', error);
                        });
                    }
                    
                    // Deploy application
                    document.getElementById('deploy-btn').addEventListener('click', function() {
                        const fileInput = document.getElementById('app-zip');
                        const envText = document.getElementById('env-file').value;
                        
                        if (!fileInput.files || fileInput.files.length === 0) {
                            alert('Please select a ZIP file to deploy');
                            return;
                        }
                        
                        const formData = new FormData();
                        formData.append('app_zip', fileInput.files[0]);
                        
                        if (envText.trim()) {
                            formData.append('env_file', new Blob([envText], { type: 'text/plain' }));
                        }
                        
                        fetch('/deploy', {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'Authorization': authHeader
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            alert(`Deployment started with task ID: ${data.task_id}`);
                            loadHistory();
                            
                            // Poll for updates
                            const pollInterval = setInterval(() => {
                                fetch(`/tasks/${data.task_id}`, {
                                    headers: {
                                        'Authorization': authHeader
                                    }
                                })
                                .then(response => response.json())
                                .then(taskData => {
                                    const logEl = document.getElementById('log');
                                    logEl.innerHTML = '';
                                    
                                    taskData.logs.forEach(log => {
                                        const logLine = document.createElement('p');
                                        logLine.textContent = log;
                                        logEl.appendChild(logLine);
                                    });
                                    
                                    // Scroll to bottom
                                    logEl.scrollTop = logEl.scrollHeight;
                                    
                                    if (taskData.status !== 'running') {
                                        clearInterval(pollInterval);
                                        loadHistory();
                                    }
                                });
                            }, 2000);
                        })
                        .catch(error => {
                            console.error('Error starting deployment:', error);
                            alert('Error starting deployment');
                        });
                    });
                    
                    // Initial load
                    loadHistory();
                </script>
            </body>
            </html>
            """
            self._send_response(HTTPStatus.OK, html_content, 'text/html')
            return
        
        elif path == '/history':
            # Return deployment history
            self._send_response(HTTPStatus.OK, TASK_HISTORY)
            return
        
        elif path.startswith('/tasks/'):
            # Get task details
            try:
                task_id = int(path.split('/')[-1])
                task = next((t for t in TASK_HISTORY if t['id'] == task_id), None)
                
                if task:
                    self._send_response(HTTPStatus.OK, task)
                else:
                    self._send_response(HTTPStatus.NOT_FOUND, {"error": "Task not found"})
            except (ValueError, IndexError):
                self._send_response(HTTPStatus.BAD_REQUEST, {"error": "Invalid task ID"})
            return
        
        elif path == '/status':
            # Server status
            status = {
                "status": "running",
                "task_count": len(TASK_HISTORY),
                "deploy_dir": DEPLOY_DIR
            }
            self._send_response(HTTPStatus.OK, status)
            return
            
        # Not found
        self._send_response(HTTPStatus.NOT_FOUND, {"error": "Not found"})
    
    def do_POST(self):
        """Handle POST requests"""
        path = urllib.parse.urlparse(self.path).path
        
        # Special case for GitHub webhook endpoint - uses token authentication
        if path == '/pacer-deploy':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(post_data)
                
                if 'token' not in data:
                    self._send_response(HTTPStatus.UNAUTHORIZED, {"error": "Authentication token required"})
                    return
                
                if not is_valid_token(data['token']):
                    self._send_response(HTTPStatus.UNAUTHORIZED, {"error": "Invalid token"})
                    return
                
                # Handle GitHub webhook
                task_id = handle_github_webhook(data)
                self._send_response(HTTPStatus.OK, {"message": "Webhook received", "task_id": task_id})
                return
            except Exception as e:
                log(f"Error handling GitHub webhook: {str(e)}")
                self._send_response(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Webhook error: {str(e)}"})
                return
        
        # All other endpoints require basic authentication
        if not is_authenticated(self.headers):
            self._send_response(HTTPStatus.UNAUTHORIZED, '{"error": "Authentication required"}')
            return
        
        if path == '/deploy':
            # Handle application deployment
            try:
                # Parse multipart form data
                content_type = self.headers.get('Content-Type', '')
                
                if not content_type.startswith('multipart/form-data'):
                    self._send_response(HTTPStatus.BAD_REQUEST, {"error": "Expected multipart/form-data"})
                    return
                
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST'}
                )
                
                # Check if app_zip is present
                if 'app_zip' not in form:
                    self._send_response(HTTPStatus.BAD_REQUEST, {"error": "No application zip file provided"})
                    return
                
                # Save the uploaded file to a temporary location
                file_item = form['app_zip']
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
                    tmp_file.write(file_item.file.read())
                    tmp_file_path = tmp_file.name
                
                # Check for environment file
                env_file = None
                if 'env_file' in form:
                    env_item = form['env_file']
                    env_file = env_item.file.read()
                
                # Start deployment
                task_id = handle_deployment(tmp_file_path, env_file)
                
                # Return the task ID for tracking
                self._send_response(HTTPStatus.OK, {"message": "Deployment started", "task_id": task_id})
            
            except Exception as e:
                log(f"Error handling deployment: {str(e)}")
                self._send_response(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Deployment error: {str(e)}"})
            return
        
        elif path == '/exec':
            # Execute a command on the server
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(post_data)
                
                if 'command' not in data:
                    self._send_response(HTTPStatus.BAD_REQUEST, {"error": "No command provided"})
                    return
                
                # Run the command
                result = run_command(data['command'])
                self._send_response(HTTPStatus.OK, result)
            except Exception as e:
                log(f"Error executing command: {str(e)}")
                self._send_response(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Command execution error: {str(e)}"})
            return
        
        # Not found
        self._send_response(HTTPStatus.NOT_FOUND, {"error": "Not found"})

def main():
    """Start the deployment server"""
    server = HTTPServer((HOST, PORT), DeploymentHandler)
    log(f"Starting deployment server on http://{HOST}:{PORT}/")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    
    log("Shutting down deployment server")
    server.server_close()

if __name__ == "__main__":
    # Create log file if it doesn't exist
    log_dir = os.path.dirname(LOG_FILE)
    os.makedirs(log_dir, exist_ok=True)
    
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'w') as f:
            f.write('')
    
    # Start the server
    main()
EOF

# Create run script
cat > /home/debian/deploy-server/run.sh << 'EOF'
#!/bin/bash

# Set up environment variables
export ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-pacer_admin}
export DEPLOY_TOKEN=${DEPLOY_TOKEN:-pacer-deploy-token-2024}

# Make sure Python and dependencies are installed
if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Run the deployment server
echo "Starting PACER deployment server..."
python3 deploy_server.py
EOF

# Create systemd service file
cat > /home/debian/deploy-server/pacer-deploy.service << EOF
[Unit]
Description=PACER Deployment Server
After=network.target

[Service]
Type=simple
User=debian
WorkingDirectory=/home/debian/deploy-server
ExecStart=/bin/bash /home/debian/deploy-server/run.sh
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pacer-deploy
Environment=ADMIN_USERNAME=$ADMIN_USERNAME
Environment=ADMIN_PASSWORD=$ADMIN_PASSWORD
Environment=DEPLOY_TOKEN=$DEPLOY_TOKEN

[Install]
WantedBy=multi-user.target
EOF

# Make scripts executable
chmod +x /home/debian/deploy-server/run.sh
chmod +x /home/debian/deploy-server/deploy_server.py

# Install and start the service
sudo cp /home/debian/deploy-server/pacer-deploy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pacer-deploy
sudo systemctl start pacer-deploy

# Create PACER directory
mkdir -p /home/debian/pacer

echo "Deployment server setup complete!"
echo "You can access it at: https://vps-d067f247.vps.ovh.ca/pacer-deploy"
echo "Username: $ADMIN_USERNAME"
echo "Password: $ADMIN_PASSWORD"
echo "Deploy Token: $DEPLOY_TOKEN"
echo
echo "IMPORTANT: Add these secrets to your GitHub repository:"
echo "- PACER_DB_USER: Database username (e.g., pacer)"
echo "- PACER_DB_PASSWORD: Secure database password"
echo "- PACER_DB_NAME: Database name (e.g., pacer_db)"
echo "- OPENAI_API_KEY: Your OpenAI API key"
echo "- PACER_JWT_SECRET: A secure random string for JWT"
echo "- DEPLOY_TOKEN: $DEPLOY_TOKEN"
EOF