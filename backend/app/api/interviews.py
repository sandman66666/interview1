from fastapi import APIRouter, HTTPException, Depends, Query, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from ..db.session import get_async_db
from ..db import models
from ..schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewUpdate,
    InterviewDetail,
    InterviewStatus
)
from ..schemas.question import QuestionCreate, QuestionResponse
from ..core.security import create_access_token, verify_interview_token
from ..services.did_service import DIDService
from ..core.config import settings
import uuid
from datetime import datetime, UTC, timedelta
from pydantic import BaseModel
import logging
import json

logger = logging.getLogger(__name__)

class QuestionText(BaseModel):
    text: str
    voice_id: Optional[str] = "en-US-JennyNeural"
    voice_style: Optional[str] = None

router = APIRouter(prefix="/interviews", tags=["interviews"])
did_service = DIDService()

@router.get("/by-token/{token}", response_model=InterviewDetail)
async def get_interview_by_token(
    token: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get interview by JWT token"""
    logger.debug(f"Attempting to verify token: {token}")
    interview_id = verify_interview_token(token)
    if not interview_id:
        logger.error("Token verification failed")
        raise HTTPException(status_code=404, detail="Interview not found or token invalid")
    
    try:
        interview_uuid = uuid.UUID(interview_id)
        logger.debug(f"Looking up interview with UUID: {interview_uuid}")
    except ValueError:
        logger.error(f"Invalid UUID format: {interview_id}")
        raise HTTPException(status_code=400, detail="Invalid interview ID format")
    
    result = await db.execute(
        select(models.Interview)
        .options(
            selectinload(models.Interview.questions),
            selectinload(models.Interview.responses)
        )
        .where(models.Interview.id == interview_uuid)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        logger.error(f"No interview found for UUID: {interview_uuid}")
        raise HTTPException(status_code=404, detail="Interview not found")
    
    logger.debug(f"Successfully found interview: {interview.id}")
    return interview

async def generate_avatar_video(
    question_id: uuid.UUID,
    text: str,
    voice_id: str,
    voice_style: Optional[str],
    db: AsyncSession,
    max_retries: int = 3,
    retry_delay: int = 5
):
    """Background task to generate avatar video for a question with retry logic"""
    try:
        result = await db.execute(
            select(models.Question).where(models.Question.id == question_id)
        )
        question = result.scalar_one_or_none()
        
        if not question:
            logger.error(f"Question {question_id} not found")
            return
        
        logger.info(f"Generating avatar video for question {question_id}")
        logger.info(f"Text: {text}")
        logger.info(f"Voice ID: {voice_id}")
        logger.info(f"Voice Style: {voice_style}")
        
        # Create avatar video
        talk_id = await did_service.create_avatar_video(
            text=text,
            voice_id=voice_id,
            voice_style=None  # Temporarily disable voice style
        )
        
        # Update question with talk ID and status
        question.avatar_video_id = talk_id
        question.avatar_video_status = "processing"
        await db.commit()
        
        # Initial check for video URL
        video_url = await did_service.get_video_url(talk_id)
        
        if video_url:
            question.avatar_video_url = video_url
            question.avatar_video_status = "completed"
            await db.commit()
            logger.info(f"Successfully generated avatar video for question {question_id}")
            return
        
        logger.info(f"Video processing initiated for question {question_id}")
        return
            
    except Exception as e:
        logger.error(f"Error generating avatar video: {str(e)}")
        if question:
            question.avatar_video_status = "error"
            question.avatar_video_error = str(e)
            await db.commit()

@router.post("/", response_model=InterviewResponse)
async def create_interview(
    request: Request,
    questions: List[QuestionText],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new interview session with questions and generate a unique URL"""
    try:
        # Generate a unique ID for the interview
        interview_id = uuid.uuid4()
        
        # Create JWT token
        token = create_access_token(
            data={"interview_id": str(interview_id)},
            expires_delta=timedelta(days=7)
        )
        
        # Create interview with token as url_id
        interview = models.Interview(
            id=interview_id,
            url_id=token,  # Store just the token
            status=InterviewStatus.PENDING,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        db.add(interview)
        await db.flush()

        # Add questions and schedule avatar video generation
        for i, q in enumerate(questions):
            logger.info(f"Adding question {i + 1}: {q.text}")
            question = models.Question(
                interview_id=interview.id,
                text=q.text,
                order_number=i,
                avatar_video_status="pending",
                voice_id=q.voice_id,
                voice_style=q.voice_style,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            db.add(question)
            await db.flush()
            
            # Schedule avatar video generation
            background_tasks.add_task(
                generate_avatar_video,
                question.id,
                q.text,
                q.voice_id,
                q.voice_style,
                db
            )

        await db.commit()
        
        # Load relationships for response
        result = await db.execute(
            select(models.Interview)
            .options(
                selectinload(models.Interview.questions),
                selectinload(models.Interview.responses)
            )
            .where(models.Interview.id == interview.id)
        )
        interview = result.scalar_one()
        
        logger.info(f"Successfully created interview with ID: {interview.id}")
        return interview

    except Exception as e:
        logger.error(f"Error creating interview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating interview: {str(e)}"
        )

@router.get("/url/{url_id}", response_model=InterviewDetail)
async def get_interview_by_url(
    url_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get interview by URL ID"""
    result = await db.execute(
        select(models.Interview)
        .options(
            selectinload(models.Interview.questions),
            selectinload(models.Interview.responses)
        )
        .where(models.Interview.url_id == url_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return interview

@router.get("/{interview_id}", response_model=InterviewDetail)
async def get_interview(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get detailed interview information including questions and responses"""
    result = await db.execute(
        select(models.Interview)
        .options(
            selectinload(models.Interview.questions),
            selectinload(models.Interview.responses)
        )
        .where(models.Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return interview

@router.get("/", response_model=List[InterviewResponse])
async def list_interviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[InterviewStatus] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """List interviews with optional filtering and pagination"""
    query = select(models.Interview).options(
        selectinload(models.Interview.questions),
        selectinload(models.Interview.responses)
    )
    
    if status:
        query = query.where(models.Interview.status == status)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    interviews = result.scalars().all()
    
    return interviews

@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: uuid.UUID,
    interview_update: InterviewUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update interview status and details"""
    result = await db.execute(
        select(models.Interview)
        .options(
            selectinload(models.Interview.questions),
            selectinload(models.Interview.responses)
        )
        .where(models.Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Update only provided fields
    update_data = interview_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interview, field, value)
    
    interview.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(interview)
    return interview

@router.delete("/{interview_id}", status_code=204)
async def delete_interview(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Soft delete an interview"""
    result = await db.execute(
        select(models.Interview).where(models.Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Implement soft delete instead of actual deletion
    interview.status = InterviewStatus.DELETED
    interview.updated_at = datetime.now(UTC)
    await db.commit()
    return None

@router.post("/{interview_id}/complete", response_model=InterviewResponse)
async def complete_interview(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Mark an interview as completed"""
    result = await db.execute(
        select(models.Interview)
        .options(
            selectinload(models.Interview.questions),
            selectinload(models.Interview.responses)
        )
        .where(models.Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Interview already completed")
    
    interview.status = InterviewStatus.COMPLETED
    interview.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(interview)
    return interview

@router.get("/questions/{question_id}/avatar-status")
async def get_question_avatar_status(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get the status of avatar video generation for a question"""
    result = await db.execute(
        select(models.Question).where(models.Question.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # If the video is still processing, check its status
    if question.avatar_video_status == "processing" and question.avatar_video_id:
        try:
            video_url = await did_service.get_video_url(question.avatar_video_id)
            if video_url:
                question.avatar_video_url = video_url
                question.avatar_video_status = "completed"
                await db.commit()
        except Exception as e:
            logger.error(f"Error checking video status: {str(e)}")
    
    return {
        "status": question.avatar_video_status,
        "video_url": question.avatar_video_url,
        "error": getattr(question, "avatar_video_error", None)
    }

@router.post("/questions/{question_id}/regenerate-avatar")
async def regenerate_question_avatar(
    question_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    voice_id: Optional[str] = None,
    voice_style: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Regenerate the avatar video for a question"""
    result = await db.execute(
        select(models.Question).where(models.Question.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Reset avatar video fields
    question.avatar_video_url = None
    question.avatar_video_id = None
    question.avatar_video_status = "pending"
    question.avatar_video_error = None
    await db.commit()
    
    # Schedule new avatar video generation
    background_tasks.add_task(
        generate_avatar_video,
        question.id,
        question.text,
        voice_id or question.voice_id or "en-US-JennyNeural",
        voice_style,
        db
    )
    
    return {"status": "regeneration_scheduled"}