from sqlalchemy import Column, String, Text, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import uuid

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    resume_text = Column(Text, nullable=True)
    resume_base64 = Column(Text, nullable=True)
    resume_filename = Column(String, nullable=True)
    linkedin_profile = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, reviewed, rejected, accepted
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
