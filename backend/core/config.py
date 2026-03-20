from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_l7wAcs8BkboO@ep-hidden-credit-an3ni4ft-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    LINKEDIN_EMAIL: str = ""
    LINKEDIN_PASSWORD: str = ""
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
