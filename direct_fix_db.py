import sqlite3

# Connect to the database
conn = sqlite3.connect('backend/pacer_game.db')
cursor = conn.cursor()

try:
    # Check if column exists
    cursor.execute("PRAGMA table_info(game_sessions)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    print(f"Current columns in game_sessions table: {column_names}")
    
    # Add can_be_recorded column if it doesn't exist
    if 'can_be_recorded' not in column_names:
        print("Adding can_be_recorded column...")
        cursor.execute("ALTER TABLE game_sessions ADD COLUMN can_be_recorded BOOLEAN DEFAULT 0")
    
    # Update completed sessions to be recordable
    cursor.execute("UPDATE game_sessions SET can_be_recorded = 1 WHERE is_completed = 1")
    print(f"Updated {cursor.rowcount} sessions to be recordable")
    
    # Verify the update
    cursor.execute("SELECT id, is_completed, can_be_recorded FROM game_sessions WHERE is_completed = 1")
    recordable_sessions = cursor.fetchall()
    
    print("\nRecordable sessions after update:")
    for row in recordable_sessions:
        print(f"Session ID: {row[0]}, Is Completed: {row[1]}, Can be Recorded: {row[2]}")
    
    conn.commit()
    print("\nDatabase updated successfully!")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()

finally:
    conn.close() 