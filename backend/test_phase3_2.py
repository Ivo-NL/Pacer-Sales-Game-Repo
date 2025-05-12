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
        f"{BASE_URL}/api/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login successful, got token")
    
    # Step 2: Get completed sessions
    sessions_response = requests.get(
        f"{API_URL}/game/sessions",
        headers=headers
    )
    if sessions_response.status_code != 200:
        print(f"Failed to fetch sessions: {sessions_response.status_code} - {sessions_response.text}")
        return
    
    sessions = sessions_response.json()
    completed_sessions = [s for s in sessions if s["is_completed"]]
    
    if not completed_sessions:
        print("No completed sessions found. Creating a test session...")
        # Get a scenario
        scenarios_response = requests.get(
            f"{API_URL}/game/scenarios",
            headers=headers
        )
        if scenarios_response.status_code != 200:
            print(f"Failed to fetch scenarios: {scenarios_response.status_code} - {scenarios_response.text}")
            return
        
        scenarios = scenarios_response.json()
        
        # Create and complete a simple session
        session_response = requests.post(
            f"{API_URL}/game/sessions",
            headers=headers,
            json={"scenario_id": scenarios[0]["id"]}
        )
        if session_response.status_code != 200:
            print(f"Failed to create session: {session_response.status_code} - {session_response.text}")
            return
        
        session = session_response.json()
        
        # Add a few interactions
        for _ in range(3):
            interaction_response = requests.post(
                f"{API_URL}/game/sessions/{session['id']}/interact",
                headers=headers,
                json={"message": "Hello, this is a test session for Phase 3.2"}
            )
            if interaction_response.status_code != 200:
                print(f"Failed to add interaction: {interaction_response.status_code} - {interaction_response.text}")
        
        # Complete the session
        complete_response = requests.post(
            f"{API_URL}/game/sessions/{session['id']}/complete",
            headers=headers
        )
        if complete_response.status_code != 200:
            print(f"Failed to complete session: {complete_response.status_code} - {complete_response.text}")
            return
        
        session = complete_response.json()
        completed_sessions = [session]
    
    print(f"Found {len(completed_sessions)} completed sessions")
    
    # Step 3: Create a recording
    if completed_sessions:
        test_session = completed_sessions[0]
        recording_response = requests.post(
            f"{API_URL}/recordings",
            headers=headers,
            json={
                "session_id": test_session["id"],
                "title": "Test Recording for Phase 3.2",
                "description": "Created by test script",
                "duration_seconds": 600
            }
        )
        
        if recording_response.status_code != 200:
            print(f"Failed to create recording: {recording_response.status_code} - {recording_response.text}")
            return
        
        recording = recording_response.json()
        recording_id = recording["id"]
        print(f"Created recording with ID {recording_id}")
        
        # Step 4: Test annotations
        annotation_response = requests.post(
            f"{API_URL}/recordings/{recording_id}/annotations",
            headers=headers,
            json={
                "recording_id": recording_id,
                "timestamp_seconds": 30,
                "content": "This is a test annotation",
                "annotation_type": "positive",
                "pacer_stage": "A"
            }
        )
        
        if annotation_response.status_code != 200:
            print(f"Failed to create annotation: {annotation_response.status_code} - {annotation_response.text}")
        else:
            print("Successfully created annotation")
        
        # Step 5: Test bookmarks
        bookmark_response = requests.post(
            f"{API_URL}/recordings/{recording_id}/bookmarks",
            headers=headers,
            json={
                "recording_id": recording_id,
                "timestamp_seconds": 60,
                "label": "Important point"
            }
        )
        
        if bookmark_response.status_code != 200:
            print(f"Failed to create bookmark: {bookmark_response.status_code} - {bookmark_response.text}")
        else:
            print("Successfully created bookmark")
        
        # Step 6: Test requesting review
        review_request_response = requests.post(
            f"{API_URL}/recordings/{recording_id}/request-review",
            headers=headers
        )
        
        if review_request_response.status_code != 200:
            print(f"Failed to request review: {review_request_response.status_code} - {review_request_response.text}")
        else:
            print("Successfully requested review")
        
        # Get recording to verify updates
        recording_response = requests.get(
            f"{API_URL}/recordings/{recording_id}",
            headers=headers
        )
        
        if recording_response.status_code == 200:
            updated_recording = recording_response.json()
            print(f"Recording status: review_requested={updated_recording['review_requested']}")
        
        # Step 7: Get all recordings
        recordings_response = requests.get(
            f"{API_URL}/recordings",
            headers=headers
        )
        
        if recordings_response.status_code != 200:
            print(f"Failed to get recordings: {recordings_response.status_code} - {recordings_response.text}")
            return
        
        recordings = recordings_response.json()
        print(f"Found {len(recordings)} recordings")
    
    print("\nPhase 3.2 test completed successfully!")

if __name__ == "__main__":
    test_phase3_2() 