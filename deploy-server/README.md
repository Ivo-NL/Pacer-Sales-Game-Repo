# PACER Deployment Server

This is a simple HTTP-based deployment server for the PACER application that allows you to deploy Docker containers without SSH access.

## Installation on Debian VPS

1. **Connect to your VPS via web console or alternative means**

   Since you can't SSH directly, use your VPS provider's web console or alternative access methods.

2. **Install required packages**

   ```bash
   sudo apt update
   sudo apt install -y python3 python3-pip docker.io docker-compose curl unzip
   ```

3. **Add your user to the docker group**

   ```bash
   sudo usermod -aG docker debian
   ```

4. **Create the deployment server directory**

   ```bash
   mkdir -p /home/debian/deploy-server
   ```

5. **Download the deployment server files**

   Using a curl command or download from your browser:

   ```bash
   curl -o deploy-server.zip https://github.com/yourusername/pacer/releases/download/v1.0/deploy-server.zip
   unzip deploy-server.zip -d /home/debian/deploy-server
   ```

   Alternatively, copy these files individually to your server using your VPS provider's file upload tool.

6. **Make scripts executable**

   ```bash
   chmod +x /home/debian/deploy-server/run.sh
   ```

7. **Set secure credentials**

   Edit the systemd service file to set a secure password:

   ```bash
   nano /home/debian/deploy-server/pacer-deploy.service
   ```

   Change the `ADMIN_PASSWORD` value to something secure.

8. **Install and start the service**

   ```bash
   sudo cp /home/debian/deploy-server/pacer-deploy.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable pacer-deploy
   sudo systemctl start pacer-deploy
   ```

9. **Check the service status**

   ```bash
   sudo systemctl status pacer-deploy
   ```

10. **Access the deployment interface**

    Open your web browser and navigate to:

    ```
    http://51.222.29.215:8002
    ```

    You'll be prompted for the username and password you set in the service file.

## Using the Deployment Server

1. **Prepare your application files**

   Zip your entire PACER application including:
   - backend directory
   - frontend directory
   - docker-compose.yml file

2. **Upload the zip file**

   Use the web interface to upload your zip file and optionally provide environment variables.

3. **Monitor deployment**

   The interface will show you the deployment logs and status.

## Security Considerations

This deployment server uses basic authentication. For better security:

1. Change the default admin username and password
2. Consider setting up a reverse proxy (like Nginx) with HTTPS
3. Implement additional IP restrictions if possible
4. Regularly update your system and Docker 