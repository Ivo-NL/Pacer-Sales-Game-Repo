import sqlite3
import os
import sys

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SQLALCHEMY_DATABASE_URL

def check_table_structure():
    """Check the structure of the interaction_evaluations table"""
    print("\nChecking structure of interaction_evaluations table...")

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

    # Get detailed column information
    cursor.execute('PRAGMA table_info(interaction_evaluations)')
    columns = cursor.fetchall()
    
    print("\ninteraction_evaluations table structure:")
    print("----------------------------------------")
    for col in columns:
        cid, name, type_, notnull, default_value, pk = col
        print(f"Column {cid}: {name}")
        print(f"  Type: {type_}")
        print(f"  Not Null: {bool(notnull)}")
        print(f"  Default Value: {default_value}")
        print(f"  Primary Key: {bool(pk)}")
        print("----------------------------------------")

    # Close connection
    conn.close()

if __name__ == "__main__":
    check_table_structure() 