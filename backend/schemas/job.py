from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.job import JobStatus, PublishStatus, PublishDestination

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
    publish_destination: Optional[PublishDestination] = Field(default=PublishDestination.feed, description="Feed is available now. Job page is an incoming feature.")
    image_url: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

    @field_validator('tags', mode='before')
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return [t.strip() for t in v.split(',') if t.strip()]
        return v or []

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
    publish_destination: Optional[PublishDestination] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None

class JobResponse(JobBase):
    id: UUID
    owner_id: UUID
    owner_email: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
