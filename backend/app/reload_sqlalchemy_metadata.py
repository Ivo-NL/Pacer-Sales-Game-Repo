import os
import sys
import inspect
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import sessionmaker, clear_mappers

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import database and models
from app.database import SQLALCHEMY_DATABASE_URL, Base, engine, SessionLocal
from app.models import InteractionEvaluation

def refresh_metadata():
    """Force SQLAlchemy to reload metadata for the tables"""
    print("\nRefreshing SQLAlchemy metadata...")
    
    # Clear any existing mappers
    print("Clearing existing mappers...")
    clear_mappers()
    
    # Create fresh engine and metadata
    print(f"Using database URL: {SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Drop and recreate the table using the model definition
    print("Dropping and recreating the interaction_evaluations table from model...")
    
    # Reflect existing tables to get current structure
    metadata = MetaData()
    metadata.reflect(bind=engine)
    
    # Check if interaction_evaluations table exists in metadata
    if 'interaction_evaluations' in metadata.tables:
        print("Detected existing interaction_evaluations table in metadata")
    else:
        print("interaction_evaluations table not found in metadata")
    
    # Print model attributes for debugging
    print("\nInteractionEvaluation model attributes:")
    for attr_name, attr_value in inspect.getmembers(InteractionEvaluation):
        if not attr_name.startswith('_') and not inspect.ismethod(attr_value):
            print(f"  {attr_name}: {attr_value}")
    
    # Create a session to test querying the model
    db = SessionLocal()
    try:
        # Check if we can query the model
        query = db.query(InteractionEvaluation).first()
        print("\nTest query result:", query)
    except Exception as e:
        print(f"\nError querying model: {e}")
    finally:
        db.close()
    
    print("\nRefresh completed. Please restart the application to apply changes.")

if __name__ == "__main__":
    refresh_metadata() 