from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Core
    DATABASE_URL: str = ""
    LINKEDIN_EMAIL: str = ""
    LINKEDIN_PASSWORD: str = ""
    SECRET_KEY: str = "392e92c9f80a2b7c4d5e6f8a9b0c1d2e3f4g5h6i7j8k9l0m"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days default

    # AI — Gemini (for question generation & post-interview evaluation)
    GEMINI_API_KEY: str = ""

    # AI Voice Screening — Vapi.AI
    VAPI_API_KEY: str = ""
    VAPI_PUBLIC_KEY: str = "" # For web SDK
    VAPI_PHONE_NUMBER_ID: str = ""  # ID of the phone number in Vapi dashboard
    VAPI_SERVER_URL: str = "" # URL for Vapi results webhook

    # Interview config
    COMPANY_NAME: str = "our company"  # Used in call greeting
    INTERVIEW_LANGUAGE: str = "en-US"

    # Email config (for interview links)
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
print(f"DEBUG: VAPI_SERVER_URL={settings.VAPI_SERVER_URL}")
