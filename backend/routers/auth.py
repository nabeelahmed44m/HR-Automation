from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.user import User
from core.security import get_current_user
from schemas.user import UserCreate, UserResponse, Token, UserUpdate
from services.auth import AuthService
from typing import Any

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    auth_service = AuthService(db)
    user = await auth_service.repository.get_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    return await auth_service.register(user_in)

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    auth_service = AuthService(db)
    user = await auth_service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_token(user)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: User = Depends(get_current_user)
) -> Any:
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    auth_service = AuthService(db)
    return await auth_service.update_profile(current_user, user_in.model_dump(exclude_unset=True))

@router.post("/linkedin/connect", response_model=UserResponse)
async def connect_linkedin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    auth_service = AuthService(db)
    from services.linkedin_auth import connect_linkedin_manually
    
    try:
        # Triggers a visible browser window so the user can log in and bypass captchas naturally
        li_at_cookie = await connect_linkedin_manually()
        
        # Save perfectly into the DB and reset expiration tag
        updated_user = await auth_service.update_profile(current_user, {
            "linkedin_cookie": li_at_cookie,
            "linkedin_cookie_expired": False
        })
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
