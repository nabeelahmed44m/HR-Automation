from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from models.publish import PublishStatus, PublishDestination

class PublicationBase(BaseModel):
    job_id: UUID
    platform: str = "linkedin"
    destination: PublishDestination
    status: PublishStatus = PublishStatus.pending
    external_url: Optional[str] = None
    error_log: Optional[str] = None
    attempt_count: int = 1

class PublicationCreate(PublicationBase):
    pass

class PublicationResponse(PublicationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
