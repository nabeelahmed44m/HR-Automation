from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    resume_text: Optional[str] = None
    resume_base64: Optional[str] = None
    resume_filename: Optional[str] = None
    linkedin_profile: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateResponse(CandidateBase):
    id: UUID
    job_id: UUID
    status: str
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)
