import requests

# Test configuration
BASE_URL = "http://localhost:8000"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"

# Try the token endpoint with minimal parameters
token_url = f"{BASE_URL}/api/token"
print(f"Trying {token_url} with minimal parameters...")

# The OAuth2 endpoint uses "username" parameter but our system uses it for email
response = requests.post(
    token_url,
    data={"username": EMAIL, "password": PASSWORD}
)

print(f"Response: {response.status_code}")
print(f"Response body: {response.text}")

if response.status_code == 200:
    token_data = response.json()
    token = token_data.get("access_token")
    print(f"Got token: {token[:20]}...")
    
    # Test the token with a protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    scenarios_response = requests.get(f"{BASE_URL}/api/game/scenarios", headers=headers)
    print(f"Scenarios endpoint with token: {scenarios_response.status_code}")
    if scenarios_response.status_code == 200:
        scenarios = scenarios_response.json()
        print(f"Found {len(scenarios)} scenarios")

print("\nToken test completed.") 