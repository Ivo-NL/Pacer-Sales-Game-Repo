import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"

# Try the test-auth endpoint
auth_url = f"{BASE_URL}/api/test-auth"
print(f"Trying {auth_url}...")

# Make the request with email and password
response = requests.post(
    auth_url,
    json={"email": EMAIL, "password": PASSWORD}
)

print(f"Response code: {response.status_code}")
print(f"Response body: {json.dumps(response.json(), indent=2)}")

print("\nAuth test completed.") 