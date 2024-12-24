from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..db.session import get_async_db
from ..db import models
from ..schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate
import uuid

router = APIRouter(prefix="/questions", tags=["questions"])

@router.post("/", response_model=QuestionResponse)
async def create_question(
    question: QuestionCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new question for an interview"""
    db_question = models.Question(**question.dict())
    db.add(db_question)
    await db.commit()
    await db.refresh(db_question)
    return db_question

@router.get("/{interview_id}/all", response_model=List[QuestionResponse])
async def get_interview_questions(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all questions for a specific interview"""
    result = await db.execute(
        select(models.Question)
        .where(models.Question.interview_id == interview_id)
        .order_by(models.Question.order_number)
    )
    questions = result.scalars().all()
    return questions

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: uuid.UUID,
    question_update: QuestionUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update a question"""
    question = await db.get(models.Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    for field, value in question_update.dict(exclude_unset=True).items():
        setattr(question, field, value)
    
    await db.commit()
    await db.refresh(question)
    return question

@router.delete("/{question_id}")
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a question"""
    question = await db.get(models.Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.delete(question)
    await db.commit()
    return {"message": "Question deleted successfully"}