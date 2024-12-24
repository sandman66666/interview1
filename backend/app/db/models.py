from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
import uuid
from datetime import datetime, UTC

Base = declarative_base()

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url_id = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Relationships
    questions = relationship("Question", back_populates="interview", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="interview", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id"), nullable=False)
    text = Column(Text, nullable=False)
    order_number = Column(Integer, nullable=False)
    
    # Avatar video fields
    avatar_video_id = Column(String, nullable=True)
    avatar_video_url = Column(String, nullable=True)
    avatar_video_status = Column(String, nullable=True)
    avatar_video_error = Column(Text, nullable=True)
    
    # Voice customization fields
    voice_id = Column(String, nullable=True, default="en-US-JennyNeural")
    voice_style = Column(String, nullable=True, default="Cheerful")
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Relationships
    interview = relationship("Interview", back_populates="questions")
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")

class Response(Base):
    __tablename__ = "responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    video_url = Column(String, nullable=True)
    transcription = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Relationships
    interview = relationship("Interview", back_populates="responses")
    question = relationship("Question", back_populates="responses")