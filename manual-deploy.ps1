param (
    [string]$EnvFile = ".env.production",
    [string]$VpsIp = "51.222.29.215",
    [string]$Username = "debian",
    [string]$Password = $null
)

# Display banner
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "     PACER Game Manual Deployment to VPS      " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check for password
if (-not $Password) {
    $Password = Read-Host -Prompt "Enter your VPS password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Check if environment file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "✗ Environment file $EnvFile not found" -ForegroundColor Red
    Write-Host "Please create it based on the .env.production template" -ForegroundColor Yellow
    exit 1
}

# Create zip file of the application
Write-Host "Creating application package..." -ForegroundColor Cyan
$zipFile = "pacer-app.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Install 7-Zip if not already installed
$7zipPath = "$env:ProgramFiles\7-Zip\7z.exe"
if (-not (Test-Path $7zipPath)) {
    Write-Host "7-Zip not found, using PowerShell compression instead" -ForegroundColor Yellow
    Compress-Archive -Path "backend", "frontend", "docker-compose.yml", $EnvFile -DestinationPath $zipFile
} else {
    Write-Host "Using 7-Zip for compression" -ForegroundColor Green
    & $7zipPath a -tzip $zipFile "backend" "frontend" "docker-compose.yml" $EnvFile
}

# Create the setup script
$setupScript = @"
#!/bin/bash

# Extract application files
unzip -o pacer-app.zip -d /home/debian/pacer

# Copy environment file
cp /home/debian/pacer/.env.production /home/debian/pacer/.env

# Install Docker and Docker Compose if not already installed
if ! [ -x "$(command -v docker)" ]; then
  echo 'Installing Docker...'
  sudo apt-get update
  sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
  curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io
  sudo usermod -aG docker debian
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Installing Docker Compose...'
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# Start containers
cd /home/debian/pacer
sudo docker-compose -f docker-compose.yml up -d --build

echo "Deployment completed successfully!"
"@

$setupScript | Out-File -FilePath "setup.sh" -Encoding utf8

# Get public IP for confirmation
Write-Host "Deploying to VPS at $VpsIp..." -ForegroundColor Cyan

# Set up HTTP server for file upload
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

# Prepare the multipart/form-data request
$bodyStart = "--$boundary$LF"
$bodyStart += "Content-Disposition: form-data; name=`"appzip`"; filename=`"pacer-app.zip`"$LF"
$bodyStart += "Content-Type: application/zip$LF$LF"

$bodyEnd = "$LF--$boundary$LF"
$bodyEnd += "Content-Disposition: form-data; name=`"setupsh`"; filename=`"setup.sh`"$LF"
$bodyEnd += "Content-Type: text/plain$LF$LF"
$bodyEnd += $setupScript
$bodyEnd += "$LF--$boundary--$LF"

try {
    # Prepare temporary server (using netcat on VPS)
    $serverCmd = "nc -l -p 8000 > /tmp/upload.dat"
    
    # Forward port 8000 from local to VPS
    Write-Host "Setting up port forwarding (this may ask for password)..." -ForegroundColor Cyan
    $forwardCmd = "ssh -L 8000:localhost:8000 $Username@$VpsIp '$serverCmd'"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $forwardCmd
    
    # Wait for port forwarding to be established
    Start-Sleep -Seconds 5
    
    # Send the files via HTTP POST
    Write-Host "Uploading files to VPS..." -ForegroundColor Cyan
    $zipContent = [System.IO.File]::ReadAllBytes($zipFile)
    
    $requestStream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.StreamWriter]::new($requestStream)
    $writer.Write($bodyStart)
    $writer.Flush()
    
    $requestStream.Write($zipContent, 0, $zipContent.Length)
    
    $writer.Write($bodyEnd)
    $writer.Flush()
    
    $requestBytes = $requestStream.ToArray()
    $requestStream.Close()
    
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("Content-Type", "multipart/form-data; boundary=$boundary")
    $webClient.UploadData("http://localhost:8000", "POST", $requestBytes)
    
    # Process the uploaded files
    Write-Host "Processing files on VPS..." -ForegroundColor Cyan
    $processCmd = @"
mkdir -p /home/debian/pacer
cd /tmp
cat upload.dat | sed '1,/Content-Type: application\/zip/d' | sed '/--/,$d' > pacer-app.zip
cat upload.dat | sed '1,/Content-Type: text\/plain/d' | sed '/--/,$d' > setup.sh
chmod +x setup.sh
mv pacer-app.zip /home/debian/
mv setup.sh /home/debian/
cd /home/debian
./setup.sh
"@
    
    # Execute commands via HTTP
    $execUrl = "http://$VpsIp:8001/exec"
    $execBody = @{
        username = $Username
        password = $Password
        command = $processCmd
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $execUrl -Method POST -Body $execBody -ContentType "application/json"
    
    Write-Host $response.Content
    
    Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PACER Game is now running in production mode on your VPS!" -ForegroundColor Green
    Write-Host "- Frontend: http://$VpsIp" -ForegroundColor Cyan
    Write-Host "- Backend API: http://$VpsIp:8001" -ForegroundColor Cyan
    Write-Host "- API Documentation: http://$VpsIp:8001/docs" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Deployment failed: $_" -ForegroundColor Red
} 