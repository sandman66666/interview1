from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from enum import Enum

class ResponseStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    COMPLETED = "completed"
    FAILED = "failed"

class ResponseBase(BaseModel):
    interview_id: UUID = Field(..., description="ID of the interview this response belongs to")
    question_id: UUID = Field(..., description="ID of the question being answered")
    video_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the stored video response"
    )
    transcription_text: Optional[str] = Field(
        None,
        description="Transcribed text of the video response"
    )
    status: ResponseStatus = Field(
        default=ResponseStatus.PENDING,
        description="Current status of the response processing"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the response (duration, format, size, etc.)"
    )

class ResponseCreate(ResponseBase):
    pass

class ResponseUpdate(BaseModel):
    video_url: Optional[HttpUrl] = None
    transcription_text: Optional[str] = None
    status: Optional[ResponseStatus] = None
    metadata: Optional[Dict[str, Any]] = None

class ResponseInQuestion(BaseModel):
    id: UUID
    video_url: Optional[HttpUrl] = None
    transcription_text: Optional[str] = None
    status: ResponseStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ResponseResponse(ResponseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ResponseList(BaseModel):
    items: list[ResponseResponse]
    total: int = Field(..., description="Total number of responses")

    class Config:
        from_attributes = True