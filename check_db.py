import sqlite3
import sys

# Connect to the database
try:
    conn = sqlite3.connect('backend/pacer_game.db')
    cursor = conn.cursor()
except Exception as e:
    print(f"Error connecting to database: {e}")
    sys.exit(1)

try:
    print("\n=== CHECKING GAME SESSIONS ===")
    cursor.execute("SELECT id, user_id, scenario_id, is_completed, can_be_recorded, start_time, end_time FROM game_sessions")
    sessions = cursor.fetchall()
    
    print(f"Total sessions: {len(sessions)}")
    
    completed_sessions = [s for s in sessions if s[3] == 1]
    print(f"Completed sessions: {len(completed_sessions)}")
    
    recordable_sessions = [s for s in sessions if s[4] == 1]
    print(f"Recordable sessions: {len(recordable_sessions)}")
    
    print("\nCompleted sessions:")
    for s in completed_sessions:
        print(f"  Session ID: {s[0]}")
        print(f"    User ID: {s[1]}")
        print(f"    Scenario ID: {s[2]}")
        print(f"    Is Completed: {s[3]}")
        print(f"    Can be recorded: {s[4]}")
        print(f"    Start time: {s[5]}")
        print(f"    End time: {s[6]}")
    
    # Update sessions to be recordable if needed
    if len(completed_sessions) > 0 and len(recordable_sessions) == 0:
        print("\nFixing sessions to be recordable...")
        cursor.execute("UPDATE game_sessions SET can_be_recorded = 1 WHERE is_completed = 1")
        conn.commit()
        print(f"Updated {cursor.rowcount} sessions")
    
    print("\n=== CHECKING RECORDINGS ===")
    cursor.execute("SELECT id, session_id, user_id, title, created_at FROM session_recordings")
    recordings = cursor.fetchall()
    
    print(f"Total recordings: {len(recordings)}")
    for r in recordings:
        print(f"  Recording ID: {r[0]}")
        print(f"    Session ID: {r[1]}")
        print(f"    User ID: {r[2]}")
        print(f"    Title: {r[3]}")
        print(f"    Created at: {r[4]}")
    
    # Check schema for game_sessions table
    print("\n=== GAME SESSIONS TABLE SCHEMA ===")
    cursor.execute("PRAGMA table_info(game_sessions)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # Check schema for session_recordings table
    print("\n=== SESSION RECORDINGS TABLE SCHEMA ===")
    cursor.execute("PRAGMA table_info(session_recordings)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close() 