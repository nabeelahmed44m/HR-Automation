from sqlalchemy import Column, String, Boolean, DateTime, func, Enum
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
from .publish import PublishDestination
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # User Preferences
    preferred_platform = Column(String, default="none")  # "none", "linkedin"
    preferred_destination = Column(Enum(PublishDestination), default=PublishDestination.feed)
    
    # Platform Credentials
    linkedin_cookie = Column(String, nullable=True)  # li_at cookie as a more stable alternative to login
    linkedin_cookie_expired = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
