import sys
import os
import sqlite3
from sqlalchemy import create_engine, MetaData, Table, text, inspect

# Add the parent directory to sys.path to be able to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the database connection string
from app.database import SQLALCHEMY_DATABASE_URL

def run_fix():
    """Fix the interaction_evaluations table by validating all columns"""
    print("\nFixing interaction_evaluations table schema issues...")
    
    # Extract database path from SQLAlchemy URL
    if SQLALCHEMY_DATABASE_URL.startswith('sqlite:///'):
        db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
    else:
        print(f"Unsupported database URL format: {SQLALCHEMY_DATABASE_URL}")
        return

    # Connect directly with sqlite3 for more control
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_evaluations';")
        if not cursor.fetchone():
            print("interaction_evaluations table does not exist!")
            return
            
        # Get current columns
        cursor.execute("PRAGMA table_info(interaction_evaluations);")
        existing_columns = {row[1] for row in cursor.fetchall()}
        print(f"Existing columns: {existing_columns}")
        
        # Define all expected columns
        expected_columns = {
            'id', 'interaction_id', 'methodology_score', 'rapport_score', 
            'progress_score', 'outcome_score', 'feedback', 'skills_demonstrated',
            'strength', 'improvement', 'methodology_feedback', 'rapport_feedback',
            'progress_feedback', 'outcome_feedback'
        }
        
        # Find missing columns
        missing_columns = expected_columns - existing_columns
        if missing_columns:
            print(f"Missing columns: {missing_columns}")
            
            # Add missing columns
            for column in missing_columns:
                column_type = "TEXT"
                if column.endswith('_score'):
                    column_type = "FLOAT"
                elif column == 'skills_demonstrated':
                    column_type = "JSON"
                
                print(f"Adding column {column} as {column_type}...")
                try:
                    cursor.execute(f"ALTER TABLE interaction_evaluations ADD COLUMN {column} {column_type};")
                    conn.commit()
                    print(f"Successfully added column {column}")
                except Exception as e:
                    print(f"Error adding column {column}: {e}")
        else:
            print("All expected columns already exist!")
            
        # Verify the fix worked
        cursor.execute("PRAGMA table_info(interaction_evaluations);")
        final_columns = {row[1] for row in cursor.fetchall()}
        missing_after_fix = expected_columns - final_columns
        
        if missing_after_fix:
            print(f"WARNING: Still missing columns after fix: {missing_after_fix}")
        else:
            print("Success! All expected columns are now present in the table.")
            
    except Exception as e:
        print(f"Error fixing table: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_fix() 