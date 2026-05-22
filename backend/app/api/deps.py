from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from typing import AsyncGenerator


from app.middleware.rbac import (  # noqa: F401
    Permission,
    TokenPayload,
    get_current_token,
    has_permission,
    has_role,
    require_admin,
    require_admin_or_engineer,
    require_any_auth,
    require_auditor,
    require_manufacturer,
    require_permission,
    require_role,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise