from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, func, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import uuid
import enum


class QuestionSource(str, enum.Enum):
    AI = "AI"
    HR = "HR"


class JobScreeningQuestion(Base):
    __tablename__ = "job_screening_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_order = Column(Integer, nullable=False, default=0)
    question_source = Column(SAEnum(QuestionSource), default=QuestionSource.AI, nullable=False)
    is_required = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
