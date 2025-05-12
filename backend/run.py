import uvicorn
import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# --- Basic Logging Configuration --- 
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)
logger.info("Logging configured successfully.")
# --- End Logging Configuration ---

# --- Set Windows asyncio event loop policy --- 
if sys.platform == 'win32':
    logger.info("Platform is Windows, setting asyncio event loop policy to SelectorEventLoop")
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
# --- End policy setting --- 

# Construct the path to the .env file relative to this script
# This assumes .env is in the same directory as run.py (the backend directory)
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')

# Load the .env file
loaded = load_dotenv(dotenv_path=dotenv_path)

if loaded:
    logger.info(f"Successfully loaded .env file from: {dotenv_path}")
    # Explicitly check the key *immediately* after loading
    key_in_run_py = os.getenv('OPENAI_API_KEY')
    logger.info(f"---> OPENAI_API_KEY status in run.py: {'FOUND' if key_in_run_py else 'MISSING/EMPTY'}")
    # Optional: Verify key immediately after loading
    # logger.info(f"OPENAI_API_KEY immediately after load_dotenv: {'Exists' if os.getenv('OPENAI_API_KEY') else 'MISSING'}")
else:
    logger.warning(f"Could not find or load .env file at: {dotenv_path}")

# --- NOW you can import your application modules ---
# Note: Ensure app import happens within the main block or after this load_dotenv call.

if __name__ == "__main__":
    logger.info("Starting Uvicorn server...")
    # Import the app *after* loading environment variables
    from app.main import app
    # Set reload=True and add excludes
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True,
                reload_excludes=["venv", "__pycache__", ".git", "*.pyc"])
    
    # Option 2 (alternative): Enable reload but exclude the venv directory
    # uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True,
    #             reload_excludes=["venv", "__pycache__", ".git", "*.pyc"]) 