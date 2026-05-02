"""
Audit logs router — Orijinal app/api/v1/audit_logs.py içeriğinin aynısıdır.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.middleware.rbac import Permission, TokenPayload, require_permission
from app.modules.auth.models import AuditLog, User
from app.modules.audit.schemas import AuditLogRecentResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get(
    "/recent",
    response_model=AuditLogRecentResponse,
    summary="Son sistem aktiviteleri",
)
async def get_recent_audit_logs(
    limit: int = 10,
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    data = []

    for log, user in rows:
        data.append(
            {
                "id": log.id,
                "action": log.action,
                "target_id": log.resource_id,
                "user_email": user.email if user else "anonim",
                "date": log.created_at,
                "role": user.role.value if user and hasattr(user.role, "value") else user.role if user else "PUBLIC",
                "ip_address": log.ip_address,
            }
        )

    return {"data": data}
