"""
Migration script to add modality column to interactions table.
This allows tracking whether interactions came from voice or text input.

Usage:
    python -m app.migrate_add_modality
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SQLALCHEMY_DATABASE_URL, SessionLocal

print("Starting migration to add modality column to interactions table...")

# Create database engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
db = SessionLocal()

try:
    # Check if the column already exists to avoid errors
    result = db.execute(text("PRAGMA table_info(interactions)")).fetchall()
    column_names = [row[1] for row in result]
    
    # Only add the column if it doesn't exist
    if 'modality' not in column_names:
        print("Adding 'modality' column to interactions table...")
        db.execute(text("ALTER TABLE interactions ADD COLUMN modality VARCHAR DEFAULT 'text'"))
        db.commit()
        print("Column added successfully.")
    else:
        print("Column 'modality' already exists. No changes made.")
    
    # Verify the column was added
    result = db.execute(text("PRAGMA table_info(interactions)")).fetchall()
    column_names = [row[1] for row in result]
    
    if 'modality' in column_names:
        print("Verification successful: 'modality' column exists in interactions table.")
    else:
        print("ERROR: Column 'modality' was not found in the interactions table after migration!")
    
    print("Migration complete.")
except Exception as e:
    db.rollback()
    print(f"Error during migration: {e}")
    raise
finally:
    db.close() 