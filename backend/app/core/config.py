from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Interview Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Server
    BACKEND_URL: str = "http://localhost:8000"  # Added for serving static files
    
    # PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "interview_db"
    POSTGRES_PORT: str = "5432"
    
    # Security
    SECRET_KEY: str = "development-secret-key"  # Updated to match .env
    JWT_ALGORITHM: str = "HS256"  # Added JWT algorithm
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    
    # AWS
    AWS_BUCKET_NAME: str = "interview-platform-bucket"
    AWS_ACCESS_KEY_ID: str = "your-access-key-id"
    AWS_SECRET_ACCESS_KEY: str = "your-secret-access-key"
    AWS_REGION: str = "us-east-1"
    
    # D-ID
    DID_API_KEY: str = ""  # Get from https://studio.d-id.com/account-settings
    DID_API_URL: str = "https://api.d-id.com"
    
    # OpenAI
    OPENAI_API_KEY: str = "your-openai-api-key"
    
    # Transcription
    TRANSCRIPTION_PROVIDER: str = "whisper"
    
    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def validate_all(cls, values):
        # Construct database URI if not provided
        if not values.get("SQLALCHEMY_DATABASE_URI"):
            values["SQLALCHEMY_DATABASE_URI"] = (
                f"postgresql+asyncpg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}"
                f"@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT')}/{values.get('POSTGRES_DB')}"
            )
        return values

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra fields

settings = Settings()