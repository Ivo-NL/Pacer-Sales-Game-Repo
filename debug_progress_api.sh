#!/bin/bash

# Upload the progress initialization script to the server
cd ~/pacer
cat > create_progress.py << 'EOF'
from app.models import User, Progress
from app.database import SessionLocal
from datetime import datetime

# Create database session
db = SessionLocal()

# Get the test user
user = db.query(User).filter(User.email == "testuser@example.com").first()

if not user:
    print("Test user not found!")
    exit(1)

# Check if progress already exists
existing_progress = db.query(Progress).filter(Progress.user_id == user.id).first()

if existing_progress:
    print(f"Progress already exists for user {user.email}")
else:
    # Create initial progress data
    new_progress = Progress(
        user_id=user.id,
        prospect_score=0,
        assess_score=0,
        challenge_score=0,
        execute_score=0,
        retain_score=0,
        total_score=0,
        games_played=0,
        last_updated=datetime.now()
    )
    db.add(new_progress)
    db.commit()
    print(f"Created initial progress for user {user.email}")

# Close the database session
db.close()
EOF

# Copy the script to the container and run it
docker cp create_progress.py pacer_backend:/app/
docker exec -it pacer_backend python /app/create_progress.py

# Check backend logs for any API errors related to progress
echo "Checking backend logs for progress API errors..."
docker logs pacer_backend | grep -i progress

# Create a test script to debug the progress API endpoint
cat > test_progress_api.py << 'EOF'
import requests
import json

# API URL
url = "http://localhost:8001/api/progress/progress"

# Get the token from a successful login
login_url = "http://localhost:8001/api/login"
login_payload = {
    "email": "testuser@example.com",
    "password": "Password123!"
}

print("Logging in to get authentication token...")
login_response = requests.post(login_url, json=login_payload)
if login_response.status_code != 200:
    print(f"Login failed with status code {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json().get("access_token")
print(f"Login successful, got token: {token[:20]}...")

# Set up the headers with the token
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("\nTesting the progress API endpoint...")
response = requests.get(url, headers=headers)
print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")

# Check the specific error if any
if response.status_code != 200:
    print("\nAPI endpoint is not working correctly. Let's check the error details.")
    
    # Print out available endpoints for debugging
    print("\nListing all available API endpoints:")
    routes_url = "http://localhost:8001/docs"
    print(f"API documentation is available at: {routes_url}")
    
    # Try to navigate to each level of the path to pinpoint the issue
    base_url = "http://localhost:8001/api"
    print(f"\nChecking base API endpoint ({base_url})...")
    try:
        base_response = requests.get(base_url, headers=headers)
        print(f"Base API status: {base_response.status_code}")
    except Exception as e:
        print(f"Error: {str(e)}")
    
    progress_base_url = "http://localhost:8001/api/progress"
    print(f"\nChecking progress base endpoint ({progress_base_url})...")
    try:
        progress_base_response = requests.get(progress_base_url, headers=headers)
        print(f"Progress base status: {progress_base_response.status_code}")
        print(f"Response: {progress_base_response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")
else:
    print("Progress API endpoint is working correctly!")
EOF

# Copy and run the test script
docker cp test_progress_api.py pacer_backend:/app/
docker exec -it pacer_backend python /app/test_progress_api.py 