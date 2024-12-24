import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import jwt
from .config import settings

def generate_interview_url(interview_id: str) -> str:
    """Generate a secure URL for accessing the interview"""
    # Create a unique token using the interview ID and a random component
    timestamp = datetime.utcnow().timestamp()
    random_component = secrets.token_urlsafe(16)
    
    # Create a JWT token with the interview ID and expiration
    token = create_access_token(
        data={"interview_id": interview_id, "random": random_component},
        expires_delta=timedelta(days=7)  # Interview links expire after 7 days
    )
    
    # Construct the full URL with the token
    interview_url = f"{settings.FRONTEND_URL}/interview/{token}"
    return interview_url

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token with optional expiration"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1)  # Default 1 day expiration
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def verify_interview_token(token: str) -> Optional[str]:
    """Verify an interview access token and return the interview ID if valid"""
    try:
        # Add logging to help debug token verification
        print(f"Verifying token: {token}")
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        print(f"Decoded payload: {payload}")
        
        # Extract interview_id from payload
        interview_id = payload.get("interview_id")
        if not interview_id:
            print("No interview_id found in payload")
            return None
            
        print(f"Found interview_id: {interview_id}")
        return interview_id
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error during token verification: {str(e)}")
        return None

def hash_content(content: str) -> str:
    """Create a hash of content for verification purposes"""
    return hashlib.sha256(content.encode()).hexdigest()

def generate_random_token(length: int = 32) -> str:
    """Generate a random secure token"""
    return secrets.token_urlsafe(length)