from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from models.job import JobStatus, PublishStatus

class JobBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10)
    requirements: str = Field(..., min_length=10)
    experience_level: str = Field(..., max_length=50)
    location: str = Field(..., max_length=100)
    salary_range: Optional[str] = Field(None, max_length=50)
    job_type: str = Field(..., max_length=50)
    status: JobStatus = JobStatus.draft
    linkedin_url: Optional[str] = None
    publish_status: Optional[PublishStatus] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    requirements: Optional[str] = Field(None, min_length=10)
    experience_level: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=100)
    salary_range: Optional[str] = Field(None, max_length=50)
    job_type: Optional[str] = Field(None, max_length=50)
    status: Optional[JobStatus] = None
    linkedin_url: Optional[str] = None
    publish_status: Optional[PublishStatus] = None

class JobResponse(JobBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
