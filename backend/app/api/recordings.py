from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..db.session import get_async_db
from ..db import models
from ..schemas.response import ResponseCreate, ResponseResponse, ResponseUpdate
from ..services.did_service import DIDService
from ..services.video_service import VideoService
from ..services.storage import StorageService
from ..services.transcription import TranscriptionService
import uuid
import logging
from datetime import datetime, UTC

router = APIRouter(prefix="/recordings", tags=["recordings"])
logger = logging.getLogger(__name__)

# Services
did_service = DIDService()
video_service = VideoService()
storage_service = StorageService()
transcription_service = TranscriptionService()

@router.post("/question/{question_id}/avatar", response_model=dict)
async def generate_avatar_video(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Generate an avatar video for a question"""
    try:
        # Get question from database
        question = await db.get(models.Question, question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        # Generate avatar video
        avatar_result = await did_service.create_avatar_video(question.text)
        
        return {
            "video_url": avatar_result["video_url"],
            "avatar_id": avatar_result["id"]
        }
    except Exception as e:
        logger.error(f"Error generating avatar video: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate avatar video"
        )

@router.post("/upload", response_model=ResponseResponse)
async def upload_recording(
    file: UploadFile = File(...),
    interview_id: uuid.UUID = Form(...),
    question_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Upload and process a new recording"""
    try:
        # Validate video
        await video_service.validate_video(file)

        # Compress video
        compressed_video = await video_service.compress_video(file)

        # Upload to S3
        storage_result = await storage_service.upload_file(
            compressed_video,
            f"recordings/{interview_id}/"
        )

        # Get video metadata
        metadata = await video_service.get_video_metadata(compressed_video)

        # Transcribe video
        transcription = await transcription_service.transcribe_video(
            storage_result["url"]
        )

        # Create database record
        recording = ResponseCreate(
            interview_id=interview_id,
            question_id=question_id,
            video_url=storage_result["url"],
            transcription_text=transcription["text"]
        )

        db_recording = models.Response(**recording.dict())
        db.add(db_recording)
        await db.commit()
        await db.refresh(db_recording)

        return db_recording

    except Exception as e:
        logger.error(f"Error processing recording: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process recording"
        )

@router.post("/upload/multipart/init", response_model=dict)
async def init_multipart_upload(
    filename: str = Form(...),
    content_type: str = Form(...),
    interview_id: uuid.UUID = Form(...)
):
    """Initialize a multipart upload"""
    try:
        result = await storage_service.create_multipart_upload(
            filename,
            content_type,
            f"recordings/{interview_id}/"
        )
        return result
    except Exception as e:
        logger.error(f"Error initializing multipart upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize upload"
        )

@router.post("/upload/multipart/complete", response_model=ResponseResponse)
async def complete_multipart_upload(
    interview_id: uuid.UUID = Form(...),
    question_id: uuid.UUID = Form(...),
    upload_id: str = Form(...),
    key: str = Form(...),
    parts: List[dict] = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Complete a multipart upload and process the video"""
    try:
        # Complete multipart upload
        result = await storage_service.complete_multipart_upload(
            key,
            upload_id,
            parts
        )

        # Transcribe video
        transcription = await transcription_service.transcribe_video(
            result["url"]
        )

        # Create database record
        recording = ResponseCreate(
            interview_id=interview_id,
            question_id=question_id,
            video_url=result["url"],
            transcription_text=transcription["text"]
        )

        db_recording = models.Response(**recording.dict())
        db.add(db_recording)
        await db.commit()
        await db.refresh(db_recording)

        return db_recording

    except Exception as e:
        logger.error(f"Error completing multipart upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to complete upload"
        )

@router.get("/{interview_id}/all", response_model=List[ResponseResponse])
async def get_interview_recordings(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all recordings for a specific interview"""
    result = await db.execute(
        models.Response.__table__.select().where(
            models.Response.interview_id == interview_id
        )
    )
    recordings = result.fetchall()
    return [dict(r) for r in recordings]

@router.get("/{recording_id}", response_model=ResponseResponse)
async def get_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get a specific recording"""
    recording = await db.get(models.Response, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording

@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a recording"""
    try:
        recording = await db.get(models.Response, recording_id)
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")

        # Delete from S3
        key = recording.video_url.split("/")[-1]
        await storage_service.delete_file(f"recordings/{key}")

        # Delete from database
        await db.delete(recording)
        await db.commit()

        return {"message": "Recording deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting recording: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete recording"
        )