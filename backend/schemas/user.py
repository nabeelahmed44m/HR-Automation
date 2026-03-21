from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from models.publish import PublishDestination

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    preferred_platform: Optional[str] = None
    preferred_destination: Optional[PublishDestination] = None
    linkedin_cookie: Optional[str] = None
    linkedin_cookie_expired: Optional[bool] = None

class UserInDBBase(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    preferred_platform: str = "none"
    preferred_destination: PublishDestination = PublishDestination.feed
    linkedin_cookie: Optional[str] = None
    linkedin_cookie_expired: bool = False
    # We do NOT include the password in the response for security
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
