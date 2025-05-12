# PACER Sales Methodology Game Startup Script
# This script starts the frontend and backend services

param (
    [string]$Component = "all" # Possible values: all, frontend, backend
)

# Function to check if a port is already in use
function IsPortInUse {
    param (
        [int]$Port
    )
    
    try {
        $null = New-Object Net.Sockets.TcpClient -ArgumentList 'localhost', $Port
        return $true
    } catch {
        return $false
    }
}

# Function to start the frontend
function StartFrontend {
    Write-Host "Starting PACER frontend service..." -ForegroundColor Green
    
    # Check if frontend port is already in use
    if (IsPortInUse 3001) {
        Write-Host "Warning: Port 3001 is already in use. The frontend service might not start correctly." -ForegroundColor Yellow
    }
    
    # Change to the frontend directory
    Push-Location ./frontend
    
    # Check if node_modules exists
    if (-not (Test-Path ./node_modules)) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
        npm install
    }
    
    # Start the frontend
    Write-Host "Starting frontend on http://localhost:3001" -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start:3001" -NoNewWindow
    
    # Return to the original directory
    Pop-Location
}

# Function to start the backend
function StartBackend {
    Write-Host "Starting PACER backend service..." -ForegroundColor Green
    
    # Check if backend port is already in use
    if (IsPortInUse 8001) {
        Write-Host "Warning: Port 8001 is already in use. The backend service might not start correctly." -ForegroundColor Yellow
    }
    
    # Change to the backend directory
    Push-Location ./backend
    
    # Check if virtual environment exists
    if (-not (Test-Path ./venv)) {
        Write-Host "Setting up virtual environment and installing dependencies..." -ForegroundColor Cyan
        python -m venv venv
        ./venv/Scripts/Activate.ps1
        pip install -r requirements.txt
    } else {
        # Activate the virtual environment
        ./venv/Scripts/Activate.ps1
    }
    
    # Start the backend server using run.py directly in the current console
    Write-Host "Starting backend on http://localhost:8001 (Logs will appear below)..." -ForegroundColor Green
    # Start-Process -FilePath "$PWD/venv/Scripts/python.exe" -ArgumentList "run.py" -NoNewWindow
    & "$PWD/venv/Scripts/python.exe" run.py --reload
    
    # Return to the original directory
    Pop-Location
}

# Main logic
switch ($Component) {
    "frontend" {
        StartFrontend
    }
    "backend" {
        StartBackend
    }
    "all" {
        StartBackend
        Start-Sleep -Seconds 2
        StartFrontend
        
        Write-Host "`nPACER Services started:" -ForegroundColor Cyan
        Write-Host "- Frontend: http://localhost:3001" -ForegroundColor Yellow
        Write-Host "- Backend API: http://localhost:8001" -ForegroundColor Yellow
        Write-Host "- API Documentation: http://localhost:8001/docs" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Test User Credentials:" -ForegroundColor Magenta
        Write-Host "Email: testuser@example.com" -ForegroundColor White
        Write-Host "Password: Password123!" -ForegroundColor White
    }
    default {
        Write-Host "Invalid component specified. Valid options: all, frontend, backend" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Cyan 