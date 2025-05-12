import sqlite3
from datetime import datetime

# Connect to the database
conn = sqlite3.connect('backend/pacer_game.db')
cursor = conn.cursor()

try:
    # First, ensure we have at least one completed session that can be recorded
    cursor.execute("SELECT id FROM game_sessions WHERE is_completed = 1 LIMIT 1")
    session_id = cursor.fetchone()
    
    if not session_id:
        print("No completed sessions found. Creating a test completed session...")
        # First get a valid user and scenario ID
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM scenarios LIMIT 1")
        scenario_id = cursor.fetchone()[0]
        
        # Create a completed session
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO game_sessions 
            (user_id, scenario_id, start_time, end_time, is_completed, can_be_recorded, total_score, current_stage) 
            VALUES (?, ?, ?, ?, 1, 1, 85.0, 'R')
        """, (user_id, scenario_id, now, now))
        
        session_id = cursor.lastrowid
        print(f"Created test session with ID {session_id}")
    else:
        session_id = session_id[0]
        print(f"Using existing session ID {session_id}")
        
        # Ensure it's marked as recordable
        cursor.execute("UPDATE game_sessions SET can_be_recorded = 1 WHERE id = ?", (session_id,))
    
    # Now create a recording for this session
    cursor.execute("SELECT id FROM users LIMIT 1")
    user_id = cursor.fetchone()[0]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
        INSERT INTO session_recordings
        (session_id, user_id, title, description, duration_seconds, created_at, is_shared, is_reviewed, review_requested)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    """, (session_id, user_id, "Test Recording", "Created directly via script", 600, now))
    
    recording_id = cursor.lastrowid
    print(f"Created test recording with ID {recording_id}")
    
    conn.commit()
    print("\nTest data created successfully!")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()

finally:
    conn.close() 