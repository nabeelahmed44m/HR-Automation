from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    LINKEDIN_EMAIL: str = ""
    LINKEDIN_PASSWORD: str = ""
    SECRET_KEY: str = "392e92c9f80a2b7c4d5e6f8a9b0c1d2e3f4g5h6i7j8k9l0m"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days default for this app
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
