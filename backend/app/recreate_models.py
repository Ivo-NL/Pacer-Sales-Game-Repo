import os
import sys
import sqlite3

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import database and models
from app.database import SQLALCHEMY_DATABASE_URL, Base, engine
from app.models import InteractionEvaluation

def recreate_models():
    """Fix SQLAlchemy model mismatch by recreating the model definitions"""
    print("\nRecreating SQLAlchemy models...")
    
    # Extract database path 
    if SQLALCHEMY_DATABASE_URL.startswith('sqlite:///'):
        db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
    else:
        print(f"Unsupported database URL format: {SQLALCHEMY_DATABASE_URL}")
        return
    
    print(f"Using database at: {db_path}")

    # Step 1: Create database backup
    backup_path = db_path + '.bak'
    try:
        # Copy the database file as backup
        with open(db_path, 'rb') as src, open(backup_path, 'wb') as dst:
            dst.write(src.read())
        print(f"Created database backup at {backup_path}")
    except Exception as e:
        print(f"Warning: Failed to create backup: {e}")
    
    # Step 2: Export the interaction_evaluations data
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if the table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_evaluations'")
    if not cursor.fetchone():
        print("Warning: interaction_evaluations table does not exist")
        data_to_preserve = []
    else:
        # Get all data to preserve
        cursor.execute("SELECT * FROM interaction_evaluations")
        data_to_preserve = cursor.fetchall()
        print(f"Exported {len(data_to_preserve)} rows to preserve")
    
    # Step 3: Get column names for the data
    if data_to_preserve:
        cursor.execute("PRAGMA table_info(interaction_evaluations)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Columns: {columns}")
    
    # Step 4: Drop the table
    cursor.execute("DROP TABLE IF EXISTS interaction_evaluations")
    print("Dropped existing interaction_evaluations table")
    
    conn.commit()
    conn.close()
    
    # Step 5: Tell SQLAlchemy to recreate the table with the proper model definition
    print("Recreating table using SQLAlchemy models...")
    # This will create the table based on the model definition
    Base.metadata.create_all(bind=engine, tables=[InteractionEvaluation.__table__])
    print("Table recreated from model definition")
    
    # Step 6: Reinsert the preserved data if any
    if data_to_preserve:
        # Connect to the database again
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get the new table structure
        cursor.execute("PRAGMA table_info(interaction_evaluations)")
        new_columns = [col[1] for col in cursor.fetchall()]
        print(f"New columns: {new_columns}")
        
        # Find common columns between old and new structure
        common_columns = [col for col in columns if col in new_columns]
        print(f"Common columns for data migration: {common_columns}")
        
        # Prepare placeholders for the SQL statement
        placeholders = ', '.join(['?'] * len(common_columns))
        common_columns_str = ', '.join(common_columns)
        
        # Prepare data for insertion (only common columns)
        filtered_data = []
        for row in data_to_preserve:
            # Map to column indices, only keeping the columns that exist in new schema
            filtered_row = []
            for i, col in enumerate(columns):
                if col in common_columns:
                    filtered_row.append(row[i])
            filtered_data.append(filtered_row)
        
        # Insert the data back
        try:
            if filtered_data and common_columns:
                cursor.executemany(
                    f"INSERT INTO interaction_evaluations ({common_columns_str}) VALUES ({placeholders})",
                    filtered_data
                )
                print(f"Successfully restored {len(filtered_data)} rows of data")
            else:
                print("No data to restore (no common columns or empty dataset)")
        except sqlite3.Error as e:
            print(f"Error restoring data: {e}")
        
        conn.commit()
        conn.close()
    
    print("\nModel recreation completed. Please restart the application to apply changes.")

if __name__ == "__main__":
    recreate_models() 