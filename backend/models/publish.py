from sqlalchemy import Column, String, Text, Enum, DateTime, ForeignKey, func, Integer
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import uuid
import enum

class PublishDestination(str, enum.Enum):
    feed = "feed"
    job_page = "job_page"
    both = "both"

class PublishStatus(str, enum.Enum):
    pending = "pending"
    published = "published"
    failed = "failed"

class Publication(Base):
    __tablename__ = "publications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Set true to migrate existing safely
    platform = Column(String, default="linkedin", nullable=False)
    destination = Column(Enum(PublishDestination), nullable=False)
    status = Column(Enum(PublishStatus), default=PublishStatus.pending, nullable=False)
    external_url = Column(String, nullable=True)
    error_log = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
