import os
from pydantic_settings import BaseSettings

# backend/ klasörünün yolunu buluyoruz
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False

    # JWT — DEV-3 ekledi
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email Settings
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@dpp-platform.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "Kocaer DPP Portal"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True

    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ENV_PATH


settings = Settings()