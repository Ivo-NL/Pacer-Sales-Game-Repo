"""
Comprehensive Fix Script

This script tries multiple approaches to fix the SQLAlchemy model issue with interaction_evaluations table.
It identifies the location of all database files, verifies they exist, and modifies them directly
to ensure they match the expected schema.
"""

import os
import sys
import glob
import shutil
import sqlite3
import importlib
from datetime import datetime

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Don't import models yet - we'll reload them later

def find_database_files():
    """Find all SQLite database files in the project"""
    search_paths = [
        ".",  # Current directory
        "..",  # Parent directory
        "backend",  # Backend directory
        "backend/app",  # App directory
        "backend/instance",  # Instance directory
    ]
    
    db_files = []
    for path in search_paths:
        if os.path.isdir(path):
            for db_file in glob.glob(os.path.join(path, "*.db")):
                db_files.append(os.path.abspath(db_file))
    
    return db_files

def create_database_backup(db_path):
    """Create a backup of a database file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.{timestamp}.bak"
    try:
        shutil.copy2(db_path, backup_path)
        print(f"Created backup at: {backup_path}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def direct_sql_fix(db_path):
    """Apply a direct SQL fix to the database"""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check for the target table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_evaluations'")
        if not cursor.fetchone():
            print(f"Table 'interaction_evaluations' not found in {db_path}")
            return False
        
        # Get current columns
        cursor.execute("PRAGMA table_info(interaction_evaluations)")
        existing_columns = {col[1]: col[2] for col in cursor.fetchall()}
        print(f"Existing columns in {db_path}: {list(existing_columns.keys())}")
        
        # These are the columns we need
        required_columns = {
            "id": "INTEGER",
            "interaction_id": "INTEGER", 
            "methodology_score": "FLOAT",
            "rapport_score": "FLOAT",
            "progress_score": "FLOAT",
            "outcome_score": "FLOAT",
            "feedback": "TEXT",
            "skills_demonstrated": "JSON",
            "strength": "TEXT",
            "improvement": "TEXT", 
            "methodology_feedback": "TEXT",
            "rapport_feedback": "TEXT",
            "progress_feedback": "TEXT",
            "outcome_feedback": "TEXT"
        }
        
        # Verify each required column exists with the correct type
        missing_columns = {}
        for col_name, col_type in required_columns.items():
            if col_name not in existing_columns:
                missing_columns[col_name] = col_type
        
        if missing_columns:
            print(f"Found {len(missing_columns)} missing columns: {list(missing_columns.keys())}")
            
            # Two approaches to fix:
            # 1. Try adding columns (might fail with SQLite limitations)
            # 2. Recreate table with full schema if addition fails
            
            # Approach 1: Try adding missing columns
            for col_name, col_type in missing_columns.items():
                try:
                    print(f"Adding column {col_name} ({col_type})...")
                    cursor.execute(f"ALTER TABLE interaction_evaluations ADD COLUMN {col_name} {col_type}")
                    print(f"Added column {col_name}")
                except sqlite3.OperationalError as e:
                    print(f"Error adding column {col_name}: {e}")
            
            # Check if all columns were added
            cursor.execute("PRAGMA table_info(interaction_evaluations)")
            updated_columns = {col[1]: col[2] for col in cursor.fetchall()}
            still_missing = [col for col in required_columns if col not in updated_columns]
            
            if still_missing:
                # Approach 2: Recreate the entire table
                print(f"Still missing columns: {still_missing}. Recreating table...")
                
                # A. Export existing data
                cursor.execute("SELECT * FROM interaction_evaluations")
                existing_data = cursor.fetchall()
                
                # B. Get column names
                cursor.execute("PRAGMA table_info(interaction_evaluations)")
                current_columns = [col[1] for col in cursor.fetchall()]
                
                # C. Create temporary table with full schema
                create_table_sql = """
                CREATE TABLE interaction_evaluations_new (
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
                
                # D. Copy data from old to new table
                if existing_data:
                    # Build SQL for copying data
                    common_columns = [col for col in current_columns if col in required_columns]
                    source_cols = ", ".join(common_columns)
                    target_cols = ", ".join(common_columns)
                    cursor.execute(f"INSERT INTO interaction_evaluations_new ({target_cols}) SELECT {source_cols} FROM interaction_evaluations")
                
                # E. Replace old table with new
                cursor.execute("DROP TABLE interaction_evaluations")
                cursor.execute("ALTER TABLE interaction_evaluations_new RENAME TO interaction_evaluations")
                
                # F. Verify the fix
                cursor.execute("PRAGMA table_info(interaction_evaluations)")
                final_columns = {col[1]: col[2] for col in cursor.fetchall()}
                print(f"Final table columns: {list(final_columns.keys())}")
                
                still_missing_after_recreate = [col for col in required_columns if col not in final_columns]
                if still_missing_after_recreate:
                    print(f"ERROR: Still missing columns after recreation: {still_missing_after_recreate}")
                    return False
                else:
                    print("Table recreated successfully!")
                    return True
            else:
                print("All missing columns were added successfully!")
                return True
        else:
            print("All required columns already exist!")
            return True
    except Exception as e:
        print(f"Unexpected error fixing database: {e}")
        return False
    finally:
        conn.commit()
        conn.close()

def clear_sqlalchemy_cache():
    """Clear SQLAlchemy's cache by reloading modules"""
    try:
        # Unload/reload modules that might cache metadata
        modules_to_reload = [
            'app.database', 
            'app.models',
        ]
        
        for module_name in modules_to_reload:
            if module_name in sys.modules:
                print(f"Reloading module: {module_name}")
                importlib.reload(sys.modules[module_name])
            else:
                print(f"Module {module_name} not loaded, importing...")
                importlib.import_module(module_name)
        
        # Now that models is reloaded, we can import it
        from app.database import Base, engine
        from app.models import InteractionEvaluation
        
        # Force metadata refresh
        print("Refreshing table definition in SQLAlchemy...")
        InteractionEvaluation.__table__.create(engine, checkfirst=True)
        print("SQLAlchemy metadata refreshed!")
        
        return True
    except Exception as e:
        print(f"Error clearing SQLAlchemy cache: {e}")
        return False

def fix_foreign_keys(db_path):
    """Make sure foreign key constraints are properly configured"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Enable foreign key support
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Check for issues with interaction_id foreign key
        cursor.execute("""
            SELECT interaction_evaluations.interaction_id 
            FROM interaction_evaluations 
            LEFT JOIN interactions ON interaction_evaluations.interaction_id = interactions.id
            WHERE interactions.id IS NULL AND interaction_evaluations.interaction_id IS NOT NULL
        """)
        orphaned_rows = cursor.fetchall()
        
        if orphaned_rows:
            print(f"Found {len(orphaned_rows)} orphaned rows with invalid interaction_id")
            # Fix or delete orphaned records
            cursor.execute("""
                DELETE FROM interaction_evaluations
                WHERE interaction_id IN (
                    SELECT interaction_evaluations.interaction_id 
                    FROM interaction_evaluations 
                    LEFT JOIN interactions ON interaction_evaluations.interaction_id = interactions.id
                    WHERE interactions.id IS NULL AND interaction_evaluations.interaction_id IS NOT NULL
                )
            """)
            print(f"Removed {cursor.rowcount} orphaned records")
        else:
            print("No orphaned records found")
            
        return True
    except Exception as e:
        print(f"Error fixing foreign keys: {e}")
        return False
    finally:
        conn.commit()
        conn.close()

def main():
    print("\n=== COMPREHENSIVE PACER DATABASE FIX ===\n")
    
    # Find all database files
    print("Searching for database files...")
    db_files = find_database_files()
    if not db_files:
        print("No database files found!")
        return
    
    print(f"Found {len(db_files)} database files:")
    for i, db_file in enumerate(db_files):
        print(f"{i+1}. {db_file}")
    
    # Import after search to make sure we catch all issues
    from app.database import SQLALCHEMY_DATABASE_URL
    
    # Extract the actual database path from SQLAlchemy URL
    main_db_path = None
    if SQLALCHEMY_DATABASE_URL.startswith('sqlite:///'):
        main_db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
        main_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', main_db_path))
        print(f"\nMain database from SQLAlchemy URL: {main_db_path}")
    else:
        print(f"Unsupported database URL format: {SQLALCHEMY_DATABASE_URL}")
        return
    
    # Make sure main db is in our list
    if main_db_path not in db_files:
        print(f"WARNING: Main database not found in search results!")
        if os.path.exists(main_db_path):
            print(f"Adding {main_db_path} to the list")
            db_files.append(main_db_path)
        else:
            print(f"Main database file does not exist: {main_db_path}")
            print("Please check your SQLAlchemy URL configuration")
            return
    
    # Determine which database to fix
    primary_db = main_db_path
    print(f"\nUsing primary database: {primary_db}")
    
    # Create backup
    if not create_database_backup(primary_db):
        choice = input("Backup failed. Continue anyway? (y/n): ")
        if choice.lower() != 'y':
            print("Operation aborted.")
            return
    
    # Apply direct SQL fix
    print("\nApplying direct SQL fix...")
    if direct_sql_fix(primary_db):
        print("SQL fix applied successfully!")
    else:
        print("SQL fix failed. Trying alternative approaches...")
    
    # Fix foreign keys
    print("\nFixing foreign key relationships...")
    if fix_foreign_keys(primary_db):
        print("Foreign key relationships fixed!")
    else:
        print("Foreign key fix failed.")
    
    # Clear SQLAlchemy cache
    print("\nClearing SQLAlchemy cache...")
    if clear_sqlalchemy_cache():
        print("SQLAlchemy cache cleared successfully!")
    else:
        print("SQLAlchemy cache clearing failed.")
    
    print("\n=== FIX COMPLETE ===")
    print("\nNOW YOU MUST RESTART THE BACKEND SERVER")
    print("If problems persist, you may need to:")
    print("1. Delete .pyc files in the app directory")
    print("2. Restore from backup if needed")
    print("3. Use a new, clean database")

if __name__ == "__main__":
    main() 