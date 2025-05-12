# PowerShell script to start the backend safely

Write-Host "Starting PACER backend..." -ForegroundColor Green

# Activate the virtual environment
if (Test-Path ".\venv\Scripts\activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    .\venv\Scripts\activate.ps1
} else {
    Write-Host "Virtual environment not found. Running update script..." -ForegroundColor Yellow
    .\update_langchain.ps1
}

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Cyan
$env:PYTHONPATH = "$pwd"  # Set the Python path to the current directory

# Start the backend server
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to exit" -ForegroundColor Yellow
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --no-reload 