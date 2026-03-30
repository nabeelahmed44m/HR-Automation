from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from models.interview import InterviewStatus


class InterviewSessionResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    job_id: UUID
    status: InterviewStatus
    vapi_call_id: Optional[str] = None
    attempts: int
    transcript: Optional[Any] = None      # list of {role, message} dicts
    summary: Optional[str] = None
    recording_url: Optional[str] = None
    ai_evaluation: Optional[Any] = None   # {communication, technical_clarity, confidence, recommendation, summary}
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InitiateCallRequest(BaseModel):
    candidate_id: UUID
