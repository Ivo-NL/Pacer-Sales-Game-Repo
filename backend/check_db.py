import sys
from sqlalchemy import create_engine, inspect, text
from app.database import SQLALCHEMY_DATABASE_URL

def check_database():
    """Check the database structure and the test user."""
    # Connect to the database
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    
    print("\n--- DATABASE TABLES ---")
    for table_name in inspector.get_table_names():
        print(f"Table: {table_name}")
        # Print columns for each table
        print("  Columns:")
        for column in inspector.get_columns(table_name):
            print(f"    - {column['name']} ({column['type']})")
    
    print("\n--- CHECKING USERS TABLE ---")
    # Check the users table
    with engine.connect() as connection:
        try:
            # Get all users
            result = connection.execute(text("SELECT * FROM users"))
            rows = result.fetchall()
            
            print(f"Found {len(rows)} users")
            
            # Display each user
            for row in rows:
                print(f"User ID: {row[0]}")
                print(f"  Email: {row[1]}")
                print(f"  Username: {row[2] if len(row) > 2 else 'N/A'}")
                print(f"  Is Active: {row[4] if len(row) > 4 else 'N/A'}")
                print(f"  Is Manager: {row[5] if len(row) > 5 else 'N/A'}")
                print("  ---")
            
        except Exception as e:
            print(f"Error querying users: {e}")
    
    print("\n--- DATABASE CHECK COMPLETE ---")

if __name__ == "__main__":
    check_database() 