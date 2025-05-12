import requests
import json
import time
import sys

# Test configuration
BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"  # All endpoints are under /api
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"
USERNAME = "testuser"

def test_phase3_2():
    """Test key features of Phase 3.2 implementation."""
    # Step 1: Login with the token endpoint
    login_response = requests.post(
        f"{API_URL}/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login successful, got token")
    
    # Step 2: Fetch game sessions to see if there are any completed ones
    sessions_response = requests.get(
        f"{API_URL}/game/sessions",
        headers=headers
    )
    if sessions_response.status_code != 200:
        print(f"Failed to fetch sessions: {sessions_response.status_code} - {sessions_response.text}")
        return
    
    sessions = sessions_response.json()
    print(f"Found {len(sessions)} sessions")
    
    # Check for completed sessions that can be recorded
    completed_sessions = [s for s in sessions if s.get("is_completed", False)]
    print(f"Found {len(completed_sessions)} completed sessions")
    
    recordable_sessions = [s for s in completed_sessions if s.get("can_be_recorded", False)]
    print(f"Found {len(recordable_sessions)} recordable sessions")
    
    # Print details of each session
    for i, session in enumerate(sessions):
        print(f"\nSession {i+1}:")
        print(f"  ID: {session.get('id')}")
        print(f"  Is completed: {session.get('is_completed', False)}")
        print(f"  Can be recorded: {session.get('can_be_recorded', False)}")
        print(f"  Scenario: {session.get('scenario_id')}")
    
    # Step 3: Test the recordings API endpoints
    recordings_response = requests.get(
        f"{API_URL}/recordings",
        headers=headers
    )
    print(f"\nRecordings API response: {recordings_response.status_code}")
    
    if recordings_response.status_code == 200:
        recordings = recordings_response.json()
        print(f"Found {len(recordings)} existing recordings")
    else:
        print(f"Failed to get recordings: {recordings_response.text}")
    
    # Step 4: Try to create a recording if there's a recordable session
    if recordable_sessions:
        test_session = recordable_sessions[0]
        print(f"\nAttempting to create a recording for session {test_session['id']}")
        
        # Calculate duration
        duration = 600  # Default 10 minutes
        if test_session.get('end_time') and test_session.get('start_time'):
            start = time.strptime(test_session['start_time'], "%Y-%m-%dT%H:%M:%S.%f")
            end = time.strptime(test_session['end_time'], "%Y-%m-%dT%H:%M:%S.%f")
            duration = int((time.mktime(end) - time.mktime(start)))
        
        create_recording_response = requests.post(
            f"{API_URL}/recordings",
            headers=headers,
            json={
                "session_id": test_session["id"],
                "title": "Test Recording",
                "description": "Created by test script",
                "duration_seconds": duration
            }
        )
        
        if create_recording_response.status_code == 200:
            recording = create_recording_response.json()
            print(f"Successfully created recording with ID {recording.get('id')}")
        else:
            print(f"Failed to create recording: {create_recording_response.status_code} - {create_recording_response.text}")
    else:
        print("\nNo recordable sessions found. Cannot create a recording.")
    
    print("\nPhase 3.2 test completed!")

if __name__ == "__main__":
    test_phase3_2() 