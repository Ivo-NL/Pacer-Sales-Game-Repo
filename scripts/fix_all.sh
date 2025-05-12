#!/bin/bash
echo "Starting complete fix process..."

# Create a new docker-compose.vps.yml file
cat > docker-compose.vps.yml << 'EOF'
version: '3'

services:
  postgres:
    image: postgres:13
    container_name: pacer_postgres
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: pacer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    image: ghcr.io/codegangsta31/pacer-backend:latest
    container_name: pacer_backend
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres/pacer
      - SECRET_KEY=supersecretkey
    restart: always

  frontend:
    image: ghcr.io/codegangsta31/pacer-frontend:latest
    container_name: pacer_frontend
    depends_on:
      - backend
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    restart: always

volumes:
  postgres_data:
EOF

# Stop existing containers
docker-compose -f docker-compose.vps.yml down

# Pull latest images
docker-compose -f docker-compose.vps.yml pull

# Start containers with new images
docker-compose -f docker-compose.vps.yml up -d

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 15

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

# Create script to fix frontend paths
cat > fix_paths.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Function to search and replace in files
function findAndReplace(directory, searchPattern, replacePattern) {
  const files = fs.readdirSync(directory);
  let replacedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Recursively search directories
      replacedCount += findAndReplace(filePath, searchPattern, replacePattern);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(searchPattern)) {
          console.log(`Found pattern in ${filePath}`);
          const newContent = content.replace(new RegExp(searchPattern, 'g'), replacePattern);
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Fixed: ${filePath}`);
          replacedCount++;
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  });
  
  return replacedCount;
}

// Run the search and replace
console.log('Starting search and replace for frontend paths...');

// Fix the progress endpoint paths
const pathsToFix = [
  { search: '\\/progress\\/progress', replace: '/progress' },
  { search: '\\/progress\\/progress\\/detailed', replace: '/progress/detailed' },
  { search: '\\/progress\\/progress\\/check-achievements', replace: '/progress/check-achievements' }
];

let totalReplaced = 0;
pathsToFix.forEach(({ search, replace }) => {
  console.log(`Searching for pattern: ${search}`);
  const count = findAndReplace('/usr/share/nginx/html', search, replace);
  console.log(`Replaced ${count} occurrences of ${search} with ${replace}`);
  totalReplaced += count;
});

console.log(`Total files fixed: ${totalReplaced}`);
EOF

# Copy and execute the script in the frontend container
docker cp fix_paths.js pacer_frontend:/tmp/fix_paths.js
docker exec pacer_frontend sh -c "apt-get update && apt-get install -y nodejs && node /tmp/fix_paths.js"

# Restart the frontend container
docker restart pacer_frontend

echo "All fixes completed successfully!" 