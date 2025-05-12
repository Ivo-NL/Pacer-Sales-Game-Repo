import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
EMAIL = "testuser@example.com"
PASSWORD = "Password123!"

# Try different token endpoint paths
token_paths = [
    "/api/token",
    "/token",
    "/auth/token",
    "/api/auth/token",
    "/login",
    "/api/login"
]

for path in token_paths:
    full_url = f"{BASE_URL}{path}"
    print(f"Trying {full_url}...")
    
    # Try with form data (OAuth2 standard)
    try:
        form_response = requests.post(
            full_url,
            data={"username": EMAIL, "password": PASSWORD}
        )
        print(f"  Form data: {form_response.status_code} - {form_response.text[:100]}")
    except Exception as e:
        print(f"  Form data error: {e}")
    
    # Try with JSON
    try:
        json_response = requests.post(
            full_url,
            json={"email": EMAIL, "password": PASSWORD}
        )
        print(f"  JSON data: {json_response.status_code} - {json_response.text[:100]}")
    except Exception as e:
        print(f"  JSON data error: {e}")
    
    print()

print("Token endpoint test completed.") 