from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from core.database import Base
import uuid
import enum


class InterviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    CALL_INITIATED = "CALL_INITIATED"
    IN_PROGRESS = "IN_PROGRESS"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    NO_RESPONSE = "NO_RESPONSE"
    SCREENING_FAILED = "SCREENING_FAILED"

class InterviewRecommendation(str, enum.Enum):
    RECOMMENDED = "RECOMMENDED"
    NOT_RECOMMENDED = "NOT_RECOMMENDED"
    MAYBE = "MAYBE"


class InterviewType(str, enum.Enum):
    PHONE = "PHONE"
    WEB = "WEB"


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SAEnum(InterviewStatus), default=InterviewStatus.PENDING, nullable=False)
    interview_type = Column(SAEnum(InterviewType), default=InterviewType.PHONE, nullable=False)
    vapi_call_id = Column(String, nullable=True)        # Vapi.AI call ID (from POST /call response)
    attempts = Column(Integer, default=0, nullable=False)
    ai_evaluation = Column(JSONB, nullable=True)         # Gemini evaluation result
    transcript = Column(JSONB, nullable=True)            # Full Vapi call transcript [{role, message}]
    summary = Column(Text, nullable=True)                # Vapi-generated call summary
    recording_url = Column(String, nullable=True)        # Recording URL from Vapi
    recommendation = Column(SAEnum(InterviewRecommendation), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
