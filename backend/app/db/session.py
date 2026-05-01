# backend/app/db/session.py
# Tüm içeriği bununla değiştir:

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Not: get_db dependency'si app/api/deps.py içinde tanımlıdır.
# Rollback koruması olan o versiyon kullanılmalıdır.