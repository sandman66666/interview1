from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

class InterviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELETED = "deleted"

class AvatarVideoStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class InterviewBase(BaseModel):
    status: InterviewStatus = Field(default=InterviewStatus.PENDING, description="Current status of the interview")
    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    text: str
    voice_id: Optional[str] = Field(default="en-US-JennyNeural")
    voice_style: Optional[str] = Field(default="Cheerful")
    model_config = ConfigDict(from_attributes=True)

class QuestionBase(BaseModel):
    id: UUID
    text: str
    order_number: int
    avatar_video_url: Optional[str] = None
    avatar_video_status: AvatarVideoStatus = Field(default=AvatarVideoStatus.PENDING)
    avatar_video_id: Optional[str] = None
    voice_id: Optional[str] = Field(default="en-US-JennyNeural")
    voice_style: Optional[str] = Field(default="Cheerful")
    avatar_video_error: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ResponseBase(BaseModel):
    id: UUID
    video_url: Optional[str] = None
    transcription_text: Optional[str] = None
    status: str = Field(default="pending")
    processing_metadata: Optional[dict] = None
    model_config = ConfigDict(from_attributes=True)

class InterviewCreate(InterviewBase):
    questions: List[QuestionCreate]

class InterviewUpdate(InterviewBase):
    status: Optional[InterviewStatus] = None

class InterviewResponse(InterviewBase):
    id: UUID
    url_id: str
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionBase] = []
    responses: List[ResponseBase] = []
    model_config = ConfigDict(from_attributes=True)

class InterviewDetail(InterviewResponse):
    """Detailed interview response including full question and response data"""
    pass