import sys
import os
import logging
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, DateTime, Boolean, ForeignKey, JSON, inspect, MetaData, Table, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_database():
    """Migrate the existing database to support Phase 3.2 features."""
    logger.info("Starting database migration for Phase 3.2...")
    
    # Print the database URL (for debugging)
    print("\n\nPACER DATABASE URL:", SQLALCHEMY_DATABASE_URL, "\n\n")
    
    # Connect to database
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        # Create new tables
        logger.info("Creating new tables for recording system...")
        Base.metadata.create_all(bind=engine)
        
        # Add foreign key relationships to existing tables
        logger.info("Adding recording relationships...")
        
        # Create a session for database operations
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Check if the can_be_recorded column exists in game_sessions table
            inspector = inspect(engine)
            if 'game_sessions' in inspector.get_table_names():
                columns = [column['name'] for column in inspector.get_columns('game_sessions')]
                # Add the can_be_recorded column if it doesn't exist
                if 'can_be_recorded' not in columns:
                    logger.info("Adding can_be_recorded column to game_sessions table")
                    # Use raw SQL to add the column
                    session.execute(text('ALTER TABLE game_sessions ADD COLUMN can_be_recorded BOOLEAN DEFAULT 0'))
                    session.commit()
                
                # Update completed game sessions to be recordable
                session.execute(text('UPDATE game_sessions SET can_be_recorded = 1 WHERE is_completed = 1'))
                session.commit()
                logger.info("Updated completed game sessions to be recordable")
        except Exception as e:
            logger.warning(f"Failed to update game sessions: {e}")
            session.rollback()
        
        session.close()
        
        logger.info("Migration completed successfully.")
        return True
    
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1) 