import sys
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, UTC

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.models import Interview, Question
from app.core.config import settings

def load_sample_data():
    # Create database connection
    DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Get the project root directory (two levels up from the script)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

        # Load interview data
        interview_path = os.path.join(project_root, "interview.json")
        with open(interview_path, "r") as f:
            interview_data = json.load(f)

        # Create interview
        interview = Interview(
            id=interview_data["id"],
            url_id=interview_data.get("url_id", f"interview-{interview_data['id']}"),
            status=interview_data["status"],
            created_at=datetime.fromisoformat(interview_data["created_at"]),
            updated_at=datetime.fromisoformat(interview_data["updated_at"])
        )
        db.merge(interview)  # Use merge instead of add to handle existing records

        # Load questions data
        questions_path = os.path.join(project_root, "questions.json")
        with open(questions_path, "r") as f:
            questions_data = json.load(f)

        # Create questions
        for question_data in questions_data:
            question = Question(
                id=question_data["id"],
                interview_id=question_data["interview_id"],
                text=question_data["text"],
                order_number=question_data["order_number"],
                created_at=datetime.fromisoformat(question_data["created_at"]),
                updated_at=datetime.fromisoformat(question_data["updated_at"])
            )
            db.merge(question)  # Use merge instead of add to handle existing records

        # Commit changes
        db.commit()
        print("Sample data loaded successfully!")

    except Exception as e:
        print(f"Error loading sample data: {str(e)}")
        db.rollback()
        raise  # Re-raise the exception to see the full traceback
    finally:
        db.close()

if __name__ == "__main__":
    load_sample_data()