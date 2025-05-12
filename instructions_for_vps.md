# How to Fix the Progress Endpoint Issue on VPS

## Problem
The dashboard is failing to load because the API is returning a 404 error when trying to access `/progress/progress` endpoint. 

## Solution Steps

### Step 1: Create the Progress Model and Endpoint

1. SSH into your VPS:
   ```bash
   ssh debian@vps-d067f247.vps.ovh.ca
   ```

2. Create a script to add the missing progress endpoint:
   ```bash
   cd ~/pacer
   
   # Create the Python script that will add the necessary components
   cat > fix_progress_endpoint.py << 'EOF'
   import os
   import sys
   
   # First, check if the progress router exists
   progress_router_path = "/app/app/routers/progress.py"
   if not os.path.exists(progress_router_path):
       print(f"Creating progress router at {progress_router_path}")
       
       # Create the progress router
       with open(progress_router_path, "w") as f:
           f.write("""from fastapi import APIRouter, Depends, HTTPException, status
   from sqlalchemy.orm import Session
   from app.database import get_db
   from app.models import User, Progress
   from app.deps import get_current_user
   from datetime import datetime
   
   router = APIRouter()
   
   @router.get("/progress")
   def get_user_progress(
       current_user: User = Depends(get_current_user),
       db: Session = Depends(get_db)
   ):
       \"\"\"Get the current user's progress\"\"\"
       progress = db.query(Progress).filter(Progress.user_id == current_user.id).first()
       
       if not progress:
           # Create initial progress for user if it doesn't exist
           progress = Progress(
               user_id=current_user.id,
               prospect_score=0,
               assess_score=0,
               challenge_score=0,
               execute_score=0,
               retain_score=0,
               total_score=0,
               games_played=0,
               last_updated=datetime.now()
           )
           db.add(progress)
           db.commit()
           db.refresh(progress)
       
       return progress
   
   @router.get("/progress/detailed")
   def get_user_detailed_progress(
       current_user: User = Depends(get_current_user),
       db: Session = Depends(get_db)
   ):
       \"\"\"Get detailed progress including historical data\"\"\"
       progress = db.query(Progress).filter(Progress.user_id == current_user.id).first()
       
       if not progress:
           # Create initial progress for user if it doesn't exist
           progress = Progress(
               user_id=current_user.id,
               prospect_score=0,
               assess_score=0,
               challenge_score=0,
               execute_score=0,
               retain_score=0,
               total_score=0,
               games_played=0,
               last_updated=datetime.now()
           )
           db.add(progress)
           db.commit()
           db.refresh(progress)
       
       # For now, return the same data as regular progress
       # In a real implementation, this would include more detailed metrics
       return progress
   """)
       print("Created progress router")
   else:
       print(f"Progress router already exists at {progress_router_path}")
   
   # Now check if the Progress model exists in models.py
   models_path = "/app/app/models.py"
   with open(models_path, "r") as f:
       models_content = f.read()
   
   if "class Progress" not in models_content:
       print("Adding Progress model to models.py")
       
       # Find the end of the User class definition
       import_section_end = models_content.find("Base = declarative_base()")
       if import_section_end == -1:
           import_section_end = models_content.find("class User")
       
       # Add imports if needed
       if "from datetime import datetime" not in models_content:
           models_content = models_content.replace("from sqlalchemy.ext.declarative import declarative_base", 
                                                "from sqlalchemy.ext.declarative import declarative_base\\nfrom datetime import datetime")
       
       # Add the Progress model
       progress_model = """
   
   class Progress(Base):
       __tablename__ = "progress"
   
       id = Column(Integer, primary_key=True, index=True)
       user_id = Column(Integer, ForeignKey("users.id"), unique=True)
       prospect_score = Column(Integer, default=0)
       assess_score = Column(Integer, default=0)
       challenge_score = Column(Integer, default=0)
       execute_score = Column(Integer, default=0)
       retain_score = Column(Integer, default=0)
       total_score = Column(Integer, default=0)
       games_played = Column(Integer, default=0)
       last_updated = Column(DateTime, default=datetime.now)
       
       # Relationship
       user = relationship("User", back_populates="progress")
   """
       
       # Add relationship to User class if it doesn't exist
       if "progress = relationship" not in models_content:
           # Find the User class definition
           user_class_pos = models_content.find("class User(Base):")
           if user_class_pos != -1:
               # Find the end of the User class
               next_class_pos = models_content.find("class ", user_class_pos + 1)
               if next_class_pos == -1:
                   next_class_pos = len(models_content)
               
               # Add the relationship
               user_class_content = models_content[user_class_pos:next_class_pos]
               last_line_pos = user_class_content.rfind("\\n")
               models_content = models_content[:user_class_pos + last_line_pos] + "\\n    progress = relationship(\\"Progress\\", back_populates=\\"user\\", uselist=False)" + models_content[user_class_pos + last_line_pos:]
       
       # Add the Progress model to the end of the file
       with open(models_path, "w") as f:
           f.write(models_content + progress_model)
       
       print("Added Progress model to models.py")
   else:
       print("Progress model already exists in models.py")
   
   # Check if the progress router is registered in main.py
   main_path = "/app/app/main.py"
   with open(main_path, "r") as f:
       main_content = f.read()
   
   if "from app.routers import progress" not in main_content or "app.include_router(progress.router" not in main_content:
       print("Registering progress router in main.py")
       
       # Find the router registration section
       router_section = main_content.find("app.include_router(")
       if router_section != -1:
           # Find the last router registration
           last_router = main_content.rfind("app.include_router(")
           include_line_end = main_content.find(")", last_router)
           if include_line_end != -1:
               include_line_end += 1  # Include the closing parenthesis
               
               # Add import at top
               import_section_end = main_content.find("from fastapi import FastAPI")
               if import_section_end != -1:
                   # Find next line after FastAPI import
                   next_line = main_content.find("\\n", import_section_end)
                   if next_line != -1:
                       main_content = main_content[:next_line + 1] + "from app.routers import progress\\n" + main_content[next_line + 1:]
               
               # Add router registration
               progress_router_registration = """
   
   # Register progress router
   app.include_router(
       progress.router,
       prefix="/api/progress",
       tags=["progress"]
   )
   """
               main_content = main_content[:include_line_end + 1] + progress_router_registration + main_content[include_line_end + 1:]
               
               with open(main_path, "w") as f:
                   f.write(main_content)
               
               print("Registered progress router in main.py")
       else:
           print("Could not find router registration section in main.py")
   else:
       print("Progress router is already registered in main.py")
   
   # Create table directly
   try:
       from app.database import engine
       from app.models import Base
       Base.metadata.create_all(bind=engine)
       print("Created Progress table directly using SQLAlchemy")
   except Exception as e:
       print(f"Error creating table: {str(e)}")
   
   print("Fixed progress endpoint and created necessary database tables")
   print("Please restart the server for changes to take effect")
   EOF
   ```

3. Copy the script to the backend container and run it:
   ```bash
   # Copy the script to the container
   docker cp fix_progress_endpoint.py pacer_backend:/app/
   
   # Run the script inside the container
   docker exec -it pacer_backend python /app/fix_progress_endpoint.py
   ```

4. Restart the backend container to apply the changes:
   ```bash
   docker restart pacer_backend
   ```

### Step 2: Create Progress Data for the Existing User

1. Create a script to initialize progress data for the test user:
   ```bash
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
   ```

### Step 3: Test the Progress Endpoint

1. Create a test script to verify that the progress endpoint works:
   ```bash
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
   
   if response.status_code == 200:
       print("Progress API endpoint is working correctly!")
   else:
       print("API endpoint is not working correctly!")
   EOF
   
   # Copy and run the test script
   docker cp test_progress_api.py pacer_backend:/app/
   docker exec -it pacer_backend python /app/test_progress_api.py
   ```

## Alternative Solution

If the above solution doesn't work, try this simplified approach that works directly from the VPS without modifying the container:

1. Create a shell script for direct modification:
   ```bash
   cat > quick_fix.sh << 'EOF'
   #!/bin/bash
   
   # Stop the containers
   docker-compose -f docker-compose.vps.yml down
   
   # Pull the latest changes
   git pull
   
   # Start the containers
   docker-compose -f docker-compose.vps.yml up -d
   
   # Wait for the backend to start
   echo "Waiting for backend to start..."
   sleep 10
   
   # Create the progress endpoint by directly modifying the backend
   docker exec -it pacer_backend bash -c "mkdir -p /app/app/routers"
   
   # Create progress router
   docker exec -it pacer_backend bash -c "cat > /app/app/routers/progress.py << 'END'
   from fastapi import APIRouter, Depends, HTTPException
   from sqlalchemy.orm import Session
   from app.database import get_db
   from app.models import User, Progress
   from app.deps import get_current_user
   from datetime import datetime
   
   router = APIRouter()
   
   @router.get('/progress')
   def get_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
       # Get or create progress for the current user
       progress = db.query(Progress).filter(Progress.user_id == current_user.id).first()
       if not progress:
           progress = Progress(
               user_id=current_user.id,
               prospect_score=0,
               assess_score=0,
               challenge_score=0,
               execute_score=0,
               retain_score=0,
               total_score=0,
               games_played=0,
               last_updated=datetime.now()
           )
           db.add(progress)
           db.commit()
           db.refresh(progress)
       return progress
   END"
   
   # Add Progress model
   docker exec -it pacer_backend bash -c "cat >> /app/app/models.py << 'END'
   
   class Progress(Base):
       __tablename__ = 'progress'
       
       id = Column(Integer, primary_key=True, index=True)
       user_id = Column(Integer, ForeignKey('users.id'), unique=True)
       prospect_score = Column(Integer, default=0)
       assess_score = Column(Integer, default=0)
       challenge_score = Column(Integer, default=0)
       execute_score = Column(Integer, default=0)
       retain_score = Column(Integer, default=0)
       total_score = Column(Integer, default=0)
       games_played = Column(Integer, default=0)
       last_updated = Column(DateTime, default=datetime.now)
       
       # Relationship
       user = relationship('User', back_populates='progress')
   
   # Add relationship to User model if it doesn't exist already
   User.progress = relationship('Progress', back_populates='user', uselist=False)
   END"
   
   # Update main.py to register the progress router
   docker exec -it pacer_backend bash -c "grep -q 'from app.routers import progress' /app/app/main.py || sed -i '/from fastapi import FastAPI/a from app.routers import progress' /app/app/main.py"
   docker exec -it pacer_backend bash -c "grep -q 'app.include_router(progress.router' /app/app/main.py || sed -i '/app.include_router(/a \\\n# Register progress router\\napp.include_router(\\n    progress.router,\\n    prefix=\"/api/progress\",\\n    tags=[\"progress\"]\\n)' /app/app/main.py"
   
   # Create the progress table in the database
   docker exec -it pacer_backend python -c "
   from app.database import engine
   from app.models import Base
   Base.metadata.create_all(bind=engine)
   print('Created Progress table in database')
   "
   
   # Restart the backend to apply changes
   docker restart pacer_backend
   
   echo "Progress endpoint has been added. The backend has been restarted."
   EOF
   
   # Make the script executable
   chmod +x quick_fix.sh
   
   # Run the script
   ./quick_fix.sh
   ```

## Check the Fix

After implementing either solution, try logging in to the application again at:
```
https://vps-d067f247.vps.ovh.ca/pacer/login
```

The dashboard should now load correctly without the 404 error for the progress endpoint.

## Troubleshooting

If you're still encountering issues, check the backend logs for detailed error messages:
```bash
docker logs pacer_backend
```

You can also try inspecting the database to verify that the Progress table was created:
```bash
docker exec -it pacer_db psql -U pacer -d pacer_db -c "\dt"
```

And check if there are any progress records for your user:
```bash
docker exec -it pacer_db psql -U pacer -d pacer_db -c "SELECT * FROM progress"
```





