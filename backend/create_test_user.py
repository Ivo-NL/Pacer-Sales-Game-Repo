from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import User, Progress
from app.auth import get_password_hash
from datetime import datetime

# Create a test user for Phase 3.1 testing
def create_test_user():
    # Connect to the database
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if user already exists
        email = "testuser@example.com"
        username = "testuser"
        password = "Password123!"
        
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists with ID {existing_user.id}")
            return existing_user.id
        
        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            region="Global",
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.flush()
        
        # Create initial progress entry
        progress = Progress(user_id=new_user.id)
        db.add(progress)
        
        db.commit()
        print(f"Created test user with ID {new_user.id}")
        return new_user.id
    
    except Exception as e:
        db.rollback()
        print(f"Error creating test user: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    user_id = create_test_user()
    print(f"Test user ID: {user_id}")
    print("You can now use the following credentials for testing:")
    print("Email: testuser@example.com")
    print("Password: Password123!") 