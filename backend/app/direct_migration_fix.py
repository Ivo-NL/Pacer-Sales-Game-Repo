import sqlite3
import os
import sys

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SQLALCHEMY_DATABASE_URL

def run_migration():
    """Add missing columns to interaction_evaluations table using direct SQL"""
    print("Starting direct SQL migration to add missing columns to interaction_evaluations table...")

    # Extract database path from SQLAlchemy URL
    if SQLALCHEMY_DATABASE_URL.startswith('sqlite:///'):
        db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
    else:
        print(f"Unsupported database URL format: {SQLALCHEMY_DATABASE_URL}")
        return

    print(f"Using database at: {db_path}")

    # Connect to SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if the interaction_evaluations table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_evaluations'")
    if not cursor.fetchone():
        print("Error: interaction_evaluations table does not exist!")
        conn.close()
        return

    # Get existing columns
    cursor.execute('PRAGMA table_info(interaction_evaluations)')
    existing_columns = {column[1] for column in cursor.fetchall()}
    print(f"Existing columns: {existing_columns}")

    # Define the columns we need to add
    columns_to_add = {
        'strength': 'TEXT',
        'improvement': 'TEXT',
        'methodology_feedback': 'TEXT',
        'rapport_feedback': 'TEXT', 
        'progress_feedback': 'TEXT',
        'outcome_feedback': 'TEXT'
    }

    # Add missing columns
    for column_name, column_type in columns_to_add.items():
        if column_name not in existing_columns:
            print(f"Adding column '{column_name}' of type {column_type}...")
            try:
                cursor.execute(f"ALTER TABLE interaction_evaluations ADD COLUMN {column_name} {column_type}")
                print(f"Column '{column_name}' added successfully.")
            except sqlite3.OperationalError as e:
                print(f"Error adding column '{column_name}': {e}")
        else:
            print(f"Column '{column_name}' already exists, skipping.")

    # Verify the changes
    cursor.execute('PRAGMA table_info(interaction_evaluations)')
    updated_columns = {column[1] for column in cursor.fetchall()}
    print(f"Updated columns: {updated_columns}")

    # Commit changes and close connection
    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration() 