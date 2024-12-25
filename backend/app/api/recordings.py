from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..db.session import get_async_db
from ..db import models
from ..schemas.response import ResponseCreate, ResponseResponse, ResponseUpdate
from ..services.did_service import DIDService
from ..services.video_service import VideoService
from ..services.storage import StorageService
from ..services.transcription_service import TranscriptionService
import uuid
import logging
from datetime import datetime, UTC
import tempfile
from pathlib import Path

router = APIRouter(prefix="/recordings", tags=["recordings"])
logger = logging.getLogger(__name__)

# Services
did_service = DIDService()
video_service = VideoService()
storage_service = StorageService()
transcription_service = TranscriptionService()

@router.post("/upload", response_model=ResponseResponse)
async def upload_recording(
    file: UploadFile = File(...),
    interview_id: uuid.UUID = Form(...),
    question_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Upload and process a new recording"""
    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_path = Path(temp_file.name)
            # Write the uploaded file to the temporary file
            content = await file.read()
            temp_file.write(content)

        try:
            # Upload to storage
            storage_result = await storage_service.upload_file(
                temp_path,
                f"recordings/{interview_id}/"
            )

            # Create database record
            recording = ResponseCreate(
                interview_id=interview_id,
                question_id=question_id,
                video_url=storage_result["url"],
                transcription=None  # We'll update this later
            )

            db_recording = models.Response(**recording.dict())
            db.add(db_recording)
            await db.commit()
            await db.refresh(db_recording)

            return db_recording

        finally:
            # Clean up the temporary file
            temp_path.unlink(missing_ok=True)

    except Exception as e:
        logger.error(f"Error processing recording: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process recording"
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

        # Delete from storage
        if recording.video_url:
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