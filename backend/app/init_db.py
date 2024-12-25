import asyncio
import json
from datetime import datetime, UTC
from app.db.session import AsyncSessionLocal
from app.db.models import Interview, Question
import os
from pathlib import Path
from sqlalchemy import text

async def check_schema():
    """Check the database schema"""
    async with AsyncSessionLocal() as session:
        # Get list of tables
        result = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result]
        print("Tables in database:", tables)
        
        if 'questions' in tables:
            # Get columns in questions table
            result = await session.execute(text("""
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'questions'
            """))
            columns = result.fetchall()
            print("\nColumns in questions table:")
            for column in columns:
                print(f"- {column[0]}: {column[1]}" + 
                      (f" (length: {column[2]})" if column[2] else ""))

async def init_db():
    """Initialize the database with interview and questions"""
    # Get the root directory (where interview.json and questions.json are located)
    root_dir = Path(__file__).parent.parent.parent

    print("\nChecking database schema...")
    await check_schema()

    print("\nInitializing database...")
    async with AsyncSessionLocal() as session:
        try:
            # Load interview data
            with open(root_dir / 'interview.json', 'r') as f:
                interview_data = json.load(f)
            
            # Create interview
            interview = Interview(
                id=interview_data['id'],
                url_id=interview_data['url_id'],
                status=interview_data['status'],
                created_at=datetime.fromisoformat(interview_data['created_at']),
                updated_at=datetime.fromisoformat(interview_data['updated_at'])
            )
            session.add(interview)
            await session.flush()
            print(f"Created interview with ID: {interview.id}")
            
            # Load questions data
            with open(root_dir / 'questions.json', 'r') as f:
                questions_data = json.load(f)
            
            # Create questions (only with existing fields)
            for question_data in questions_data:
                # Create a dict with only the fields that exist in the database
                question_dict = {
                    'id': question_data['id'],
                    'interview_id': question_data['interview_id'],
                    'text': question_data['text'],
                    'order_number': question_data['order_number'],
                    'created_at': datetime.fromisoformat(question_data['created_at']),
                    'updated_at': datetime.fromisoformat(question_data['updated_at'])
                }
                question = Question(**question_dict)
                session.add(question)
                print(f"Added question: {question.text[:50]}...")
            
            await session.commit()
            print("\nDatabase initialized successfully!")
            
        except Exception as e:
            print(f"\nError initializing database: {e}")
            await session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(init_db())