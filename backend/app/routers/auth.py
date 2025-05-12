from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
import json
from typing import Optional
from jose import JWTError, jwt
from pydantic import BaseModel
import os

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user, create_access_token, authenticate_user, get_manager_user, ACCESS_TOKEN_EXPIRE_MINUTES, verify_password, get_password_hash, debug_token, SECRET_KEY, ALGORITHM

router = APIRouter(tags=["authentication"])

# Add LoginRequest model for JSON login
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        region=user.region
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create initial progress entry for the user
    progress = models.Progress(user_id=db_user.id)
    db.add(progress)
    db.commit()
    
    return db_user

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and generate access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "is_manager": user.is_manager
    }

@router.post("/login", response_model=dict)
def login(user_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint that accepts JSON data with email/password"""
    # Log the incoming request data for debugging
    print(f"Login attempt with email: {user_data.email}")
    
    try:
        # Authenticate user
        user = authenticate_user(db, user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Generate access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Return token and user data
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
            "is_manager": user.is_manager
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        # Check if this is a validation error
        if isinstance(e, HTTPException):
            raise e
        # For any other unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """Get current authenticated user's profile."""
    return current_user 

@router.post("/test-auth")
def test_auth(user_data: dict, db: Session = Depends(get_db)):
    """Test endpoint for authentication troubleshooting."""
    try:
        # Try to find the user
        email = user_data.get("email", "")
        password = user_data.get("password", "")
        
        # Log the user lookup
        print(f"Looking for user with email: {email}")
        
        # Get user from database
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            return {"status": "error", "detail": "User not found"}
        
        # Check password
        if not verify_password(password, user.hashed_password):
            return {"status": "error", "detail": "Invalid password"}
        
        # Return user details (excluding password)
        return {
            "status": "success",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username if hasattr(user, "username") else None,
                "is_active": user.is_active,
                "is_manager": user.is_manager
            }
        }
    except Exception as e:
        # Log the error and return details
        print(f"Authentication error: {str(e)}")
        return {
            "status": "error", 
            "detail": str(e),
            "error_type": type(e).__name__
        } 

@router.post("/admin/make-manager/{email}")
def make_manager(
    email: str,
    db: Session = Depends(get_db)
):
    """Temporary endpoint to make a user a manager by email.
    This endpoint is intentionally unsecured for initial setup purposes.
    """
    # Security note: This is intentionally unsecured for easy initial setup
    # In a production environment, this would have proper authentication
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {email} not found"
        )
    
    # Make user a manager
    user.is_manager = True
    db.commit()
    
    return {
        "success": True,
        "message": f"User {user.username} (ID: {user.id}) has been granted manager privileges."
    } 

@router.get("/debug-token")
async def debug_token_route(token: str, db: Session = Depends(get_db)):
    """Debug route to verify a token."""
    try:
        # Decode the token
        payload = jwt.decode(token, debug_token(), algorithms=[debug_token().split(".")[0]])
        
        # Get the user from the payload
        username = payload.get("sub")
        if username is None:
            return {"status": "invalid", "error": "Token missing subject claim"}
        
        # Find the user in the database
        user = db.query(models.User).filter(models.User.email == username).first()
        if not user:
            return {"status": "invalid", "error": "User not found in database"}
        
        return {
            "status": "valid", 
            "payload": payload,
            "user_id": user.id,
            "username": user.username
        }
    except jwt.ExpiredSignatureError:
        return {"status": "expired", "error": "Token has expired"}
    except jwt.InvalidTokenError as e:
        return {"status": "invalid", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": str(e), "error_type": type(e).__name__} 

@router.post("/websocket-token")
async def create_websocket_token(
    token_request: dict = Body(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a dedicated token for WebSocket connections."""
    # Get token type from request
    token_type = token_request.get("type", "websocket")
    print(f"Creating WebSocket token with type: {token_type}")  # Debug log
    
    # Create token with user email as subject and explicit token type
    token_data = {
        "sub": current_user.email,
        "token_type": token_type  # This will be preserved in the token
    }
    
    # Set longer expiration for WebSocket tokens (30 minutes)
    expiration = timedelta(minutes=30)
    
    # Create the token
    token = create_access_token(token_data, expires_delta=expiration)
    print(f"Created token with type: {token_type}")  # Debug log
    
    # Return response with consistent token type
    return {
        "access_token": token,
        "token": token,
        "token_type": token_type  # Return the same token type that was requested
    } 