# PowerShell script to update the LangChain packages

Write-Host "Updating LangChain packages..." -ForegroundColor Green

# Activate the virtual environment if it exists
if (Test-Path ".\venv\Scripts\activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    .\venv\Scripts\activate.ps1
} else {
    Write-Host "Creating new virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\activate.ps1
}

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install required packages
Write-Host "Installing required packages..." -ForegroundColor Cyan
python -m pip install -r requirements.txt

# Ensure LangChain packages are properly installed
Write-Host "Installing LangChain packages..." -ForegroundColor Cyan
python -m pip install langchain langchain-core langchain-openai --upgrade

Write-Host "All packages have been updated!" -ForegroundColor Green
Write-Host "You can now run the application with: python run.py" -ForegroundColor Yellow 