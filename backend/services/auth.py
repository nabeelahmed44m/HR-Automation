from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user import UserRepository
from schemas.user import UserCreate
from core.security import verify_password, get_password_hash, create_access_token
from models.user import User
from typing import Optional

class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.repository.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def register(self, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        user = await self.repository.create(user_in, hashed_password)
        await self.repository.session.commit()
        return user

    async def update_profile(self, user: User, update_data: dict) -> User:
        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        updated_user = await self.repository.update(user, update_data)
        await self.repository.session.commit()
        return updated_user

    def create_token(self, user: User) -> str:
        return create_access_token(subject=user.email)
