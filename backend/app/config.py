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

    class Config:
        env_file = ENV_PATH


settings = Settings()