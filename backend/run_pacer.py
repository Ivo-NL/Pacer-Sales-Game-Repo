import os
import sys
import subprocess

# Set environment variables directly to avoid any conflicts
os.environ["DATABASE_URL"] = "sqlite:///./pacer_game.db"
os.environ["PACER_DATABASE_URL"] = "sqlite:///./pacer_game.db"
os.environ["SECRET_KEY"] = "pacer_game_secret_key"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")

# Print environment
print("Starting PACER server with the following environment:")
print(f"DATABASE_URL = {os.environ.get('DATABASE_URL')}")
print(f"PACER_DATABASE_URL = {os.environ.get('PACER_DATABASE_URL')}")

# Run the server
try:
    subprocess.run([sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8001"])
except KeyboardInterrupt:
    print("Server stopped.") 