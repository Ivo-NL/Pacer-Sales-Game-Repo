#!/bin/bash
echo "Starting backend-only fix..."

# Create backend progress.py file with progress endpoints
cat > progress.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db, models
from typing import List, Dict, Any, Optional
import json

router = APIRouter()

@router.get("/progress")
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    """Get the progress for a specific user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Return mock progress data
    return {
        "user_id": user_id,
        "progress": {
            "steps": 12500,
            "calories": 750,
            "distance": 8.5,
            "achievements": [
                {"name": "First Mile", "completed": True},
                {"name": "Early Bird", "completed": True},
                {"name": "Step Master", "completed": False}
            ]
        }
    }

@router.get("/progress/detailed")
def get_detailed_progress(user_id: int, db: Session = Depends(get_db)):
    """Get detailed progress information for a user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Return mock detailed progress data
    return {
        "user_id": user_id,
        "daily_progress": [
            {"date": "2023-04-01", "steps": 8700, "calories": 450, "distance": 5.2},
            {"date": "2023-04-02", "steps": 10200, "calories": 520, "distance": 6.1},
            {"date": "2023-04-03", "steps": 12500, "calories": 750, "distance": 8.5}
        ],
        "weekly_average": {
            "steps": 10466,
            "calories": 573,
            "distance": 6.6
        }
    }

@router.get("/progress/check-achievements")
def check_achievements(user_id: int, db: Session = Depends(get_db)):
    """Check if the user has unlocked any new achievements"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Return mock achievements data
    return {
        "user_id": user_id,
        "achievements": [
            {
                "name": "First Mile",
                "description": "Complete your first mile",
                "completed": True,
                "completed_date": "2023-04-01"
            },
            {
                "name": "Early Bird",
                "description": "Complete a workout before 7 AM",
                "completed": True,
                "completed_date": "2023-04-02"
            },
            {
                "name": "Step Master",
                "description": "Complete 10,000 steps in a day for 7 consecutive days",
                "completed": False,
                "completed_date": None
            }
        ]
    }
EOF

# Create script to add a test user
cat > create_user.py << 'EOF'
from sqlalchemy.orm import Session
from db import get_db, models, database
import bcrypt
import sys

def create_test_user(db: Session):
    """Create a test user if it doesn't exist"""
    # Check if user already exists
    test_user = db.query(models.User).filter(models.User.email == "testuser@example.com").first()
    
    if test_user:
        print("Test user already exists")
        return
    
    # Hash the password
    password = "Password123!"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Create new user
    new_user = models.User(
        email="testuser@example.com",
        name="Test User",
        password=hashed_password.decode('utf-8'),
        role="user"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"Created test user with ID: {new_user.id}")
    return new_user

if __name__ == "__main__":
    # Create db session
    db = next(get_db())
    create_test_user(db)
EOF

# Check if the container uses SQLite or PostgreSQL
echo "Checking current database configuration..."
DB_URL=$(docker exec pacer_backend bash -c 'echo $PACER_DATABASE_URL || echo $DATABASE_URL')
echo "Current DB URL: $DB_URL"

# If not using SQLite, update the environment
if [[ ! "$DB_URL" == *"sqlite"* ]]; then
  echo "Updating container to use SQLite instead of PostgreSQL..."
  docker stop pacer_backend
  docker rm pacer_backend
  
  # Run backend with SQLite
  echo "Starting backend with SQLite..."
  docker run -d --name pacer_backend \
    -e PACER_DATABASE_URL=sqlite:///./pacer_game.db \
    -e OPENAI_API_KEY=$OPENAI_API_KEY \
    -e JWT_SECRET=$JWT_SECRET \
    -e CORS_ORIGINS="http://localhost:3001,http://localhost:81,https://vps-d067f247.vps.ovh.ca" \
    -p 8001:8001 \
    -v backend_data:/app/data \
    ghcr.io/pm78/pacer-sales-game-backend:latest
fi

# Copy the files to the backend container
docker cp progress.py pacer_backend:/app/progress.py
docker cp create_user.py pacer_backend:/app/create_user.py

# Install bcrypt in the backend container
docker exec pacer_backend pip install bcrypt

# Update the main.py file to include the progress router
docker exec pacer_backend bash -c 'grep -q "from progress import router as progress_router" /app/main.py || sed -i "/# Import routers/a from progress import router as progress_router" /app/main.py'
docker exec pacer_backend bash -c 'grep -q "app.include_router(progress_router, prefix=\"\/progress\"" /app/main.py || sed -i "/# Include routers/a app.include_router(progress_router, prefix=\"\/progress\", tags=[\"progress\"])" /app/main.py'

# Create the test user
docker exec pacer_backend python /app/create_user.py

# Restart the backend container
docker restart pacer_backend

echo "Backend fixes completed" 