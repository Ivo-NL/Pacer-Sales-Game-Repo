import logging
from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_username_column():
    """Add the username column to the users table if it doesn't exist."""
    logger.info("Adding username column to users table...")
    
    # Connect to database
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if column exists
            try:
                result = connection.execute(text("SELECT username FROM users LIMIT 1"))
                logger.info("Username column already exists.")
                return True
            except Exception as e:
                logger.info(f"Username column doesn't exist: {e}")
                
                # Add the column
                connection.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR UNIQUE"))
                
                # Update username values to match email (since we need a value for existing users)
                connection.execute(text("UPDATE users SET username = email"))
                
                connection.commit()
                logger.info("Added username column and set initial values.")
                return True
    
    except Exception as e:
        logger.error(f"Error adding username column: {e}")
        return False

if __name__ == "__main__":
    success = add_username_column()
    print(f"Migration {'succeeded' if success else 'failed'}") 