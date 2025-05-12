param (
    [string]$EnvFile = ".env.production"
)

# Display banner
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "         PACER Game Production Deployment      " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version
    Write-Host "✓ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if environment file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "✗ Environment file $EnvFile not found" -ForegroundColor Red
    Write-Host "Please create it based on the .env.production template" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Write-Host "Setting $name" -ForegroundColor Gray
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Build and start the containers
Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker-compose -f docker-compose.yml up -d --build

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check if services are running
$backendRunning = docker ps -q -f "name=pacer_backend" -f "status=running"
$frontendRunning = docker ps -q -f "name=pacer_frontend" -f "status=running"
$dbRunning = docker ps -q -f "name=pacer_db" -f "status=running"

if ($backendRunning -and $frontendRunning -and $dbRunning) {
    Write-Host "✓ All services are running" -ForegroundColor Green
    Write-Host ""
    Write-Host "PACER Game is now running in production mode!" -ForegroundColor Green
    Write-Host "- Frontend: http://localhost" -ForegroundColor Cyan
    Write-Host "- Backend API: http://localhost:8001" -ForegroundColor Cyan
    Write-Host "- API Documentation: http://localhost:8001/docs" -ForegroundColor Cyan
} else {
    Write-Host "✗ Some services failed to start" -ForegroundColor Red
    Write-Host "Check the logs using 'docker-compose logs'" -ForegroundColor Yellow
} 