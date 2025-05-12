import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

def test_api():
    """Test the API endpoints directly."""
    # Step 1: Test the root endpoint
    root_response = requests.get(BASE_URL)
    print(f"Root endpoint: {root_response.status_code} - {root_response.json()}")
    
    # Step 2: Test the game scenarios endpoint
    scenarios_response = requests.get(f"{API_URL}/game/scenarios")
    if scenarios_response.status_code == 200:
        scenarios = scenarios_response.json()
        print(f"Found {len(scenarios)} scenarios without authentication")
    else:
        print(f"Scenarios endpoint requires authentication: {scenarios_response.status_code}")
    
    # Step 3: Test the seasonal content endpoint
    seasonal_response = requests.get(f"{API_URL}/game/seasonal-content")
    if seasonal_response.status_code == 200:
        seasonal_content = seasonal_response.json()
        print(f"Found {len(seasonal_content)} seasonal content items without authentication")
    else:
        print(f"Seasonal content endpoint requires authentication: {seasonal_response.status_code}")
    
    # Step 4: Test the difficulty settings endpoint
    difficulty_response = requests.get(f"{API_URL}/game/difficulty-settings")
    if difficulty_response.status_code == 200:
        print(f"Difficulty settings endpoint accessible without authentication")
    else:
        print(f"Difficulty settings endpoint requires authentication: {difficulty_response.status_code}")
    
    print("\nAPI test completed.")

if __name__ == "__main__":
    test_api() 