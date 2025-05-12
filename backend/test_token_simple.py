import requests

# Test configuration
BASE_URL = "http://localhost:8000"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"

# Try the token endpoint with minimal parameters
token_url = f"{BASE_URL}/api/token"
print(f"Trying {token_url} with minimal parameters...")

# Make the request with just username and password
response = requests.post(
    token_url,
    data={"username": EMAIL, "password": PASSWORD}
)

print(f"Response: {response.status_code}")
print(f"Response body: {response.text}")

print("\nToken test completed.") 