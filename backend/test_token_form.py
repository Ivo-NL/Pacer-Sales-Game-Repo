import requests
from requests.auth import HTTPBasicAuth

# Test configuration
BASE_URL = "http://localhost:8000"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"

# Try the token endpoint with proper form encoding
token_url = f"{BASE_URL}/api/token"
print(f"Trying {token_url} with proper form encoding...")

# Create form data with the correct format for OAuth2
form_data = {
    "username": EMAIL,
    "password": PASSWORD,
    "grant_type": "password"  # This is required for some OAuth2 implementations
}

# Make the request
response = requests.post(
    token_url,
    data=form_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

print(f"Response: {response.status_code}")
print(f"Response body: {response.text}")

if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"Got token: {token[:20]}...")
    
    # Test the token with a protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    scenarios_response = requests.get(f"{BASE_URL}/api/game/scenarios", headers=headers)
    print(f"Scenarios endpoint with token: {scenarios_response.status_code}")
    if scenarios_response.status_code == 200:
        scenarios = scenarios_response.json()
        print(f"Found {len(scenarios)} scenarios")

print("\nToken test completed.") 