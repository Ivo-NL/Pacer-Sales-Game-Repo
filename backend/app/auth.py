from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status, APIRouter, Query, Body, WebSocket, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging
import os

from . import schemas, models
from .database import get_db

logger = logging.getLogger(__name__)

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_TO_A_SECRET_KEY_IN_PRODUCTION_ENVIRONMENT")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Log the SECRET_KEY and ALGORITHM being used
logger.debug(f"Using SECRET_KEY starting with: {SECRET_KEY[:5]}... and ALGORITHM: {ALGORITHM}")

# Workaround for bcrypt/passlib compatibility issues
try:
    import bcrypt
    # Add missing __about__ module to bcrypt to make passlib happy
    if not hasattr(bcrypt, '__about__'):
        import types
        bcrypt.__about__ = types.ModuleType("bcrypt.__about__")
        bcrypt.__about__.__version__ = bcrypt.__version__
except ImportError:
    pass

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

def verify_password(plain_password, hashed_password):
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a hash for a password."""
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    
    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT token with encoded user data."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Log the data that's being encoded into the token (excluding sensitive info)
    safe_data = {k: v for k, v in to_encode.items() if k != 'password'}
    logger.debug(f"Creating access token with data: {safe_data}")
    
    # Ensure token_type is preserved exactly as provided
    if 'token_type' in data:
        to_encode['token_type'] = data['token_type']  # Ensure token_type is copied from input data
        logger.debug(f"Setting token_type in payload to: {data['token_type']}")
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Created token starting with: {encoded_jwt[:20]}...")
    
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get the current authenticated user from the token."""
    logger.debug("Attempting to get current user...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.debug("Decoding token...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        logger.debug(f"Token decoded successfully. Email from payload: {email}")
        if email is None:
            logger.warning("Email not found in token payload.")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWTError during token decoding: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error during token decoding: {e}")
        raise credentials_exception

    try:
        logger.debug(f"Querying database for user with email: {email}")
        user = db.query(models.User).filter(models.User.email == email).first()
        logger.debug(f"Database query finished. User found: {'Yes' if user else 'No'}")
    except Exception as e:
        logger.error(f"Database error during user lookup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during user lookup.",
        )

    if user is None:
        logger.warning(f"User not found in database for email: {email}")
        raise credentials_exception
        
    logger.debug(f"Returning user: {user.email}")
    return user

async def get_current_active_user(current_user: schemas.UserResponse = Depends(get_current_user)):
    """Check if the current user is active."""
    logger.debug(f"Checking if user {current_user.email} is active...")
    if not current_user.is_active:
        logger.warning(f"User {current_user.email} is inactive.")
        raise HTTPException(status_code=400, detail="Inactive user")
    logger.debug(f"User {current_user.email} is active.")
    return current_user

async def get_manager_user(current_user: schemas.UserResponse = Depends(get_current_user)):
    """Check if the current user is a manager."""
    if not current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Add debug function for token verification
def debug_token(token: str):
    """Debug a JWT token to check if it's valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.debug(f"Token payload: {payload}")
        return {"status": "valid", "payload": payload}
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        return {"status": "expired", "error": "Token has expired"}
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        return {"status": "invalid", "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}")
        return {"status": "error", "error": str(e)}

# Add route to debug token
@router.get("/debug-token")
async def debug_token_route(token: str = Query(...), current_user: models.User = Depends(get_current_active_user)):
    """Debug route to verify a token. Only available to admin users."""
    # Only allow admins to debug tokens
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to debug tokens")
    
    result = debug_token(token)
    return result

def verify_token(token: str):
    """Verify a token and return the payload if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.debug(f"Token verified successfully")
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except JWTError as e:
        logger.error(f"JWT Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error decoding token: {str(e)}"
        )

def create_websocket_token(user_email: str, token_type: str = "websocket") -> str:
    """Create a token for WebSocket authentication."""
    # Validate token type
    valid_types = ["websocket", "realtime"]
    if token_type not in valid_types:
        logger.warning(f"Invalid token type requested: {token_type}. Defaulting to websocket.")
        token_type = "websocket"  # Default to websocket if invalid type
    
    logger.debug(f"Creating token with type: {token_type} for user: {user_email}")
    
    payload = {
        "sub": user_email,
        "token_type": token_type,  # This is the key field that needs to be set correctly
        "exp": datetime.utcnow() + timedelta(days=30)  # 30 day expiration
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Created token starting with: {token[:20]}...")
    
    return token

@router.post("/websocket-token")
def get_websocket_token(
    token_request: dict = Body(...),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a token for WebSocket authentication."""
    # Get token type from request, default to websocket
    token_type = token_request.get("type", "websocket")
    logger.debug(f"WebSocket token request for user: {current_user.email}, type: {token_type}")
    
    # Create token with specified type
    token = create_websocket_token(current_user.email, token_type)
    
    # Log the token type being returned
    logger.debug(f"Returning token with type: {token_type}")
    
    # Return consistent response format
    return {
        "access_token": token,  # Keep access_token for backward compatibility
        "token": token,         # Add token field for new endpoints
        "token_type": token_type  # Return the actual token type used
    }

async def get_current_active_user_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> models.User:
    """Dependency to get the current active user from a WebSocket connection via query param token."""
    credentials_exception = HTTPException(
        status_code=status.WS_1008_POLICY_VIOLATION,
        detail="Could not validate credentials",
    )
    
    if token is None:
        logger.warning("WebSocket connection attempt without token query parameter.")
        raise credentials_exception

    try:
        payload = verify_token(token=token)
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token payload missing 'sub' (email).")
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError as e:
        logger.warning(f"JWTError during WebSocket token verification: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error during WebSocket token verification: {e}")
        raise credentials_exception
        
    user = get_user(db, email=token_data.email)
    if user is None:
        logger.warning(f"User '{token_data.email}' not found during WebSocket auth.")
        raise credentials_exception
        
    if not user.is_active:
        logger.warning(f"Inactive user '{user.email}' attempted WebSocket connection.")
        raise HTTPException(status_code=status.WS_1008_POLICY_VIOLATION, detail="Inactive user")
        
    logger.debug(f"WebSocket authenticated for user: {user.email}")
    return user 

async def get_token_from_header(authorization: str = Header(...)) -> str:
    """Extracts the Bearer token from the Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header. Expected 'Bearer <token>'."
        )
    return authorization.split(" ", 1)[1] 