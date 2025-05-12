from app.database import get_db, SessionLocal
from app.models import User
import sys

def make_admin(email):
    """Set a user as manager by email address."""
    db = SessionLocal()
    try:
        # Find the user by email
        user = db.query(User).filter(User.email == email).first()
        
        # Check if user exists
        if not user:
            print(f"Error: User with email {email} not found!")
            return False
            
        # Update user to be a manager
        user.is_manager = True
        db.commit()
        
        print(f"Success! User {user.username} (ID: {user.id}) has been granted manager privileges.")
        return True
        
    except Exception as e:
        print(f"Error updating user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    email = "pascal.mauze@worldline.com"
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
    
    print(f"Attempting to make user with email {email} a manager...")
    make_admin(email) 