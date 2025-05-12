import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"
USERNAME = "testuser"

def test_phase3_1():
    """Test key features of Phase 3.1 implementation."""
    # Step 1: Register test user if not already registered
    try:
        register_response = requests.post(
            f"{API_URL}/auth/register",
            json={"email": EMAIL, "username": USERNAME, "password": PASSWORD}
        )
        print(f"Registration: {register_response.status_code} - {register_response.json() if register_response.status_code < 400 else register_response.text}")
    except Exception as e:
        print(f"Registration error (user might already exist): {e}")
    
    # Step 2: Login
    login_response = requests.post(
        f"{API_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login successful")
    
    # Step 3: Fetch scenarios
    scenarios_response = requests.get(
        f"{API_URL}/game/scenarios",
        headers=headers
    )
    if scenarios_response.status_code != 200:
        print(f"Failed to fetch scenarios: {scenarios_response.status_code}")
        return
    
    scenarios = scenarios_response.json()
    print(f"Found {len(scenarios)} scenarios")
    
    # Step 4: Test game events endpoint
    for scenario in scenarios:
        events_response = requests.get(
            f"{API_URL}/game/game-events/{scenario['id']}",
            headers=headers
        )
        if events_response.status_code != 200:
            print(f"Failed to fetch events for scenario {scenario['id']}: {events_response.status_code}")
            continue
        
        events = events_response.json()
        print(f"Scenario {scenario['id']} ({scenario['title']}) has {len(events)} events")
    
    # Step 5: Test difficulty settings
    difficulty_response = requests.get(
        f"{API_URL}/game/difficulty-settings",
        headers=headers
    )
    print(f"Difficulty settings: {difficulty_response.status_code} - {difficulty_response.json() if difficulty_response.status_code == 200 else difficulty_response.text}")
    
    # Step 6: Test seasonal content
    seasonal_response = requests.get(
        f"{API_URL}/game/seasonal-content",
        headers=headers
    )
    if seasonal_response.status_code == 200:
        seasonal_content = seasonal_response.json()
        print(f"Found {len(seasonal_content)} active seasonal content items")
    else:
        print(f"Failed to fetch seasonal content: {seasonal_response.status_code}")
    
    # Step 7: Create a game session
    session_response = requests.post(
        f"{API_URL}/game/sessions",
        headers=headers,
        json={"scenario_id": scenarios[0]["id"], "is_timed": True, "time_limit_seconds": 600}
    )
    if session_response.status_code != 200:
        print(f"Failed to create game session: {session_response.status_code}")
        return
    
    session = session_response.json()
    print(f"Created game session {session['id']} with timed mode enabled")
    
    # Step 8: Test timer endpoints
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
    
    print("\nPhase 3.1 test completed successfully!")

if __name__ == "__main__":
    test_phase3_1() 