from pydantic import BaseModel, Field, constr, ConfigDict
from datetime import datetime
from typing import Optional, Union
from uuid import UUID
from .interview import AvatarVideoStatus

class QuestionBase(BaseModel):
    text: constr(min_length=1, max_length=1000) = Field(
        ...,
        description="The question text to be asked by the AI interviewer"
    )
    order_number: int = Field(
        ge=0,
        description="The order in which this question should be asked during the interview"
    )

class QuestionCreate(QuestionBase):
    interview_id: UUID = Field(
        ...,
        description="The ID of the interview this question belongs to"
    )

class QuestionUpdate(BaseModel):
    text: Optional[constr(min_length=1, max_length=1000)] = Field(
        None,
        description="Updated question text"
    )
    order_number: Optional[int] = Field(
        None,
        ge=0,
        description="Updated order number for the question"
    )

class QuestionInInterview(QuestionBase):
    id: UUID
    response: Optional[dict] = Field(
        None,
        description="Associated response data if available"
    )

class QuestionResponse(QuestionBase):
    id: UUID
    interview_id: UUID
    created_at: datetime
    updated_at: datetime
    response: Optional[dict] = None
    avatar_video_url: Optional[str] = None
    avatar_video_status: AvatarVideoStatus = Field(default=AvatarVideoStatus.PENDING)
    avatar_video_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class QuestionList(BaseModel):
    items: list[QuestionResponse]
    total: int = Field(..., description="Total number of questions")

    model_config = ConfigDict(from_attributes=True)