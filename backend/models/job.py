from sqlalchemy import Column, String, Text, Numeric, Enum, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import uuid
import enum

class JobStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"

from .publish import PublishStatus, PublishDestination

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    experience_level = Column(String, nullable=False)
    location = Column(String, nullable=False)
    salary_range = Column(String, nullable=True)
    job_type = Column(String, nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.draft, nullable=False)
    linkedin_url = Column(String, nullable=True)
    publish_status = Column(Enum(PublishStatus), nullable=True)
    publish_destination = Column(Enum(PublishDestination), nullable=True, default=PublishDestination.feed)
    image_base64 = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
