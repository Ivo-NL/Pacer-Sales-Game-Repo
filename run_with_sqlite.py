import os
import sys
import subprocess

# Force SQLite database
os.environ["DATABASE_URL"] = "sqlite:///./pacer_game.db"

# Run the FastAPI server
print("Starting server with SQLite database...")
print(f"DATABASE_URL = {os.environ['DATABASE_URL']}")

# Run the server
try:
    subprocess.run([sys.executable, "-m", "uvicorn", "app.main:app", "--reload"])
except KeyboardInterrupt:
    print("Server stopped.") 