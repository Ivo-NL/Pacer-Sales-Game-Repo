import sqlite3
import os
import sys

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SQLALCHEMY_DATABASE_URL

def reinitialize_table():
    """Recreate interaction_evaluations table with all required columns"""
    print("\nReinitializing interaction_evaluations table...")

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

    # Check if we have any data in the table we need to save
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='interaction_evaluations'")
    table_exists = cursor.fetchone()[0] > 0
    
    data_to_migrate = []
    if table_exists:
        # Get existing rows to migrate
        try:
            cursor.execute("SELECT id, interaction_id, methodology_score, rapport_score, progress_score, outcome_score, feedback, skills_demonstrated FROM interaction_evaluations")
            data_to_migrate = cursor.fetchall()
            print(f"Found {len(data_to_migrate)} rows to migrate")
        except sqlite3.OperationalError as e:
            print(f"Error getting data: {e}")
            print("Continuing with table recreation...")
    
        # Drop the old table
        cursor.execute("DROP TABLE IF EXISTS interaction_evaluations")
        print("Dropped existing table")
    
    # Create the table with all required columns
    create_table_sql = """
    CREATE TABLE interaction_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interaction_id INTEGER,
        methodology_score FLOAT,
        rapport_score FLOAT,
        progress_score FLOAT,
        outcome_score FLOAT,
        feedback TEXT,
        skills_demonstrated JSON,
        strength TEXT,
        improvement TEXT,
        methodology_feedback TEXT,
        rapport_feedback TEXT,
        progress_feedback TEXT,
        outcome_feedback TEXT,
        FOREIGN KEY (interaction_id) REFERENCES interactions (id)
    )
    """
    cursor.execute(create_table_sql)
    print("Created new table with all columns")
    
    # Reinsert the data if we had any
    if data_to_migrate:
        try:
            cursor.executemany(
                "INSERT INTO interaction_evaluations (id, interaction_id, methodology_score, rapport_score, progress_score, outcome_score, feedback, skills_demonstrated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                data_to_migrate
            )
            print(f"Successfully migrated {len(data_to_migrate)} rows of data")
        except sqlite3.Error as e:
            print(f"Error migrating data: {e}")
    
    # Check the new table structure
    cursor.execute('PRAGMA table_info(interaction_evaluations)')
    columns = cursor.fetchall()
    
    print("\nNew interaction_evaluations table structure:")
    print("----------------------------------------")
    for col in columns:
        print(f"Column: {col[1]}, Type: {col[2]}")
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    print("\nTable reinitialization completed successfully.")

if __name__ == "__main__":
    reinitialize_table() 