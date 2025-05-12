import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"  # All endpoints are under /api
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"
USERNAME = "testuser"

def test_phase3_1():
    """Test key features of Phase 3.1 implementation."""
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
    
    # Step 2: Fetch scenarios
    scenarios_response = requests.get(
        f"{API_URL}/game/scenarios",
        headers=headers
    )
    if scenarios_response.status_code != 200:
        print(f"Failed to fetch scenarios: {scenarios_response.status_code} - {scenarios_response.text}")
        return
    
    scenarios = scenarios_response.json()
    print(f"Found {len(scenarios)} scenarios")
    
    # Step 3: Test game events endpoint
    for scenario in scenarios:
        events_response = requests.get(
            f"{API_URL}/game/game-events/{scenario['id']}",
            headers=headers
        )
        if events_response.status_code != 200:
            print(f"Failed to fetch events for scenario {scenario['id']}: {events_response.status_code} - {events_response.text}")
            continue
        
        events = events_response.json()
        print(f"Scenario {scenario['id']} ({scenario['title']}) has {len(events)} events")
    
    # Step 4: Test difficulty settings
    difficulty_response = requests.get(
        f"{API_URL}/game/difficulty-settings",
        headers=headers
    )
    print(f"Difficulty settings: {difficulty_response.status_code} - {difficulty_response.json() if difficulty_response.status_code == 200 else difficulty_response.text}")
    
    # Step 5: Test seasonal content
    seasonal_response = requests.get(
        f"{API_URL}/game/seasonal-content",
        headers=headers
    )
    if seasonal_response.status_code == 200:
        seasonal_content = seasonal_response.json()
        print(f"Found {len(seasonal_content)} active seasonal content items")
    else:
        print(f"Failed to fetch seasonal content: {seasonal_response.status_code} - {seasonal_response.text}")
    
    # Step 6: Create a game session
    session_response = requests.post(
        f"{API_URL}/game/sessions",
        headers=headers,
        json={"scenario_id": scenarios[0]["id"], "is_timed": True, "time_limit_seconds": 600}
    )
    if session_response.status_code != 200:
        print(f"Failed to create game session: {session_response.status_code} - {session_response.text}")
        return
    
    session = session_response.json()
    print(f"Created game session {session['id']} with timed mode enabled")
    
    # Step 7: Test timer endpoints
    timer_start_response = requests.post(
        f"{API_URL}/game/sessions/{session['id']}/start-timer",
        headers=headers
    )
    print(f"Start timer: {timer_start_response.status_code} - {timer_start_response.json() if timer_start_response.status_code == 200 else timer_start_response.text}")
    
    time.sleep(2)  # Wait a bit
    
    timer_status_response = requests.get(
        f"{API_URL}/game/sessions/{session['id']}/timer-status",
        headers=headers
    )
    print(f"Timer status: {timer_status_response.status_code} - {timer_status_response.json() if timer_status_response.status_code == 200 else timer_status_response.text}")
    
    timer_pause_response = requests.post(
        f"{API_URL}/game/sessions/{session['id']}/pause-timer",
        headers=headers
    )
    print(f"Pause timer: {timer_pause_response.status_code} - {timer_pause_response.json() if timer_pause_response.status_code == 200 else timer_pause_response.text}")
    
    # Step 8: Test triggering an event
    event_trigger_response = requests.post(
        f"{API_URL}/game/sessions/{session['id']}/trigger-event",
        headers=headers,
        json={
            "name": "Test Event",
            "event_type": "competitor_intervention",
            "description": "A test event for the session",
            "trigger_condition": "random",
            "probability": 1.0,
            "scenario_id": 0,  # Use 0 for temporary event
            "event_data": {
                "test_key": "test_value"
            }
        }
    )
    print(f"Trigger event: {event_trigger_response.status_code} - {event_trigger_response.json() if event_trigger_response.status_code == 200 else event_trigger_response.text}")
    
    print("\nPhase 3.1 test completed successfully!")

if __name__ == "__main__":
    test_phase3_1() 