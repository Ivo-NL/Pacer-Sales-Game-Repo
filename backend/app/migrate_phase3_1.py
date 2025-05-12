import sys
import os
import logging
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, DateTime, Boolean, ForeignKey, JSON, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base, GameEvent, EventOccurrence, TimedChallenge, SeasonalContent, DifficultySettings
from app.models import GameSession, User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_database():
    """Migrate the existing database to support Phase 3.1 features."""
    logger.info("Starting database migration for Phase 3.1...")
    
    # Connect to database
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        # Create new tables
        logger.info("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        
        # Add new columns to existing tables
        logger.info("Adding new columns to existing tables...")
        inspector = inspect(engine)
        
        # Check if the tables exist first
        if 'game_sessions' in inspector.get_table_names():
            # Get existing columns in GameSession table
            existing_columns = [column['name'] for column in inspector.get_columns('game_sessions')]
            
            # Create a session for database operations
            Session = sessionmaker(bind=engine)
            session = Session()
            
            # Add default values for boolean columns if they exist but don't have defaults
            if 'is_timed' in existing_columns and 'is_tournament_mode' in existing_columns:
                try:
                    session.execute('UPDATE game_sessions SET is_timed = 0, is_tournament_mode = 0, difficulty_factor = 1.0 WHERE is_timed IS NULL OR is_tournament_mode IS NULL')
                    session.commit()
                    logger.info("Set default values for is_timed, is_tournament_mode, and difficulty_factor")
                except Exception as e:
                    logger.warning(f"Failed to set default values: {e}")
                    session.rollback()
            
            session.close()
        else:
            logger.warning("Table game_sessions does not exist yet")
        
        logger.info("Migration completed successfully.")
        return True
    
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1) 