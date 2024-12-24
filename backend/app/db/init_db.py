import asyncio
import json
from datetime import datetime, UTC
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db.session import async_session
from ..db.models import Interview, Question

async def init_db() -> None:
    """Initialize database with test data."""
    try:
        # Get the project root directory
        project_root = Path(__file__).parent.parent.parent.parent

        # Load test data
        with open(project_root / "interview.json") as f:
            interview_data = json.load(f)
        
        with open(project_root / "questions.json") as f:
            questions_data = json.load(f)

        async with async_session() as session:
            # Check if interview already exists
            result = await session.execute(
                select(Interview).where(Interview.id == interview_data["id"])
            )
            existing_interview = result.scalar_one_or_none()

            if not existing_interview:
                # Create interview
                interview = Interview(
                    id=interview_data["id"],
                    url_id=interview_data["url_id"],
                    status=interview_data["status"],
                    created_at=datetime.fromisoformat(interview_data["created_at"]),
                    updated_at=datetime.fromisoformat(interview_data["updated_at"])
                )
                session.add(interview)
                
                # Create questions
                for question_data in questions_data:
                    question = Question(
                        id=question_data["id"],
                        interview_id=question_data["interview_id"],
                        text=question_data["text"],
                        order_number=question_data["order_number"],
                        avatar_video_status=question_data.get("avatar_video_status", "pending"),
                        avatar_video_url=question_data.get("avatar_video_url", None),
                        avatar_video_id=question_data.get("avatar_video_id", None),
                        created_at=datetime.fromisoformat(question_data["created_at"]),
                        updated_at=datetime.fromisoformat(question_data["updated_at"])
                    )
                    session.add(question)

                await session.commit()
                print("Test data initialized successfully")
            else:
                # Update existing questions with avatar_video_status if missing
                questions = await session.execute(
                    select(Question).where(Question.interview_id == interview_data["id"])
                )
                for question in questions.scalars():
                    if question.avatar_video_status is None:
                        question.avatar_video_status = "pending"
                await session.commit()
                print("Test data already exists, updated avatar_video_status where missing")

    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        raise

# Run initialization
if __name__ == "__main__":
    asyncio.run(init_db())