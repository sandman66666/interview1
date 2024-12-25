import json
from app.db.session import SessionLocal
from app.db.models import Interview, Question
from datetime import datetime, UTC

def import_test_data():
    db = SessionLocal()
    try:
        # Read interview data
        with open('interview.json', 'r') as f:
            interview_data = json.load(f)
        
        # Read questions data
        with open('questions.json', 'r') as f:
            questions_data = json.load(f)
        
        # Create interview
        interview = Interview(
            id=interview_data['id'],
            status=interview_data['status'],
            url_id=interview_data['id'],  # Using ID as URL ID for test data
            created_at=datetime.fromisoformat(interview_data['created_at']),
            updated_at=datetime.fromisoformat(interview_data['updated_at'])
        )
        db.add(interview)
        
        # Create questions
        for question_data in questions_data:
            question = Question(
                id=question_data['id'],
                interview_id=question_data['interview_id'],
                text=question_data['text'],
                order_number=question_data['order_number'],
                created_at=datetime.fromisoformat(question_data['created_at']),
                updated_at=datetime.fromisoformat(question_data['updated_at'])
            )
            db.add(question)
        
        db.commit()
        print("Test data imported successfully")
        
    except Exception as e:
        print(f"Error importing test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_test_data()