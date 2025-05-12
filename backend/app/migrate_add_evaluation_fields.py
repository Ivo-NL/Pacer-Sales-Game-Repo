import sys
import os
from sqlalchemy import create_engine, MetaData, Table, text

# Add the parent directory to sys.path to be able to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the database connection string
from app.database import SQLALCHEMY_DATABASE_URL

def run_migration():
    """Add missing fields to interaction_evaluations table"""
    print("Starting migration to add missing fields to interaction_evaluations table...")
    
    # Create SQLAlchemy engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Create a metadata instance
    metadata = MetaData()
    
    # Reflect the interaction_evaluations table
    try:
        interaction_evaluations = Table('interaction_evaluations', metadata, autoload_with=engine)
        
        # List of fields to add
        missing_fields = [
            "strength",
            "improvement",
            "methodology_feedback",
            "rapport_feedback",
            "progress_feedback",
            "outcome_feedback"
        ]
        
        # Check which fields need to be added
        existing_columns = [c.name for c in interaction_evaluations.columns]
        fields_to_add = [field for field in missing_fields if field not in existing_columns]
        
        if fields_to_add:
            print(f"Adding missing fields to interaction_evaluations table: {', '.join(fields_to_add)}")
            
            # Use raw SQL for simplicity
            with engine.connect() as conn:
                for field in fields_to_add:
                    print(f"Adding field '{field}'...")
                    conn.execute(text(f"ALTER TABLE interaction_evaluations ADD COLUMN {field} TEXT"))
                conn.commit()
                
            print("Successfully added missing fields!")
        else:
            print("All required fields already exist. No changes made.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration() 