"""
Audit logs router — G-10 güncellemesi ile granüler DPP aksiyonları eklendi
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.middleware.rbac import Permission, TokenPayload, require_permission
from app.modules.auth.models import AuditLog, User
from app.modules.audit.schemas import (
    AuditLogAccessCreate,
    AuditLogDppResponse,
    AuditLogRecentResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get(
    "/recent",
    response_model=AuditLogRecentResponse,
    summary="Son sistem aktiviteleri (rol ve aksiyon filtreli)",
)
async def get_recent_audit_logs(
    limit: int = Query(10, ge=1, le=200),
    role: Optional[str] = Query(None, description="Kullanıcı rolüne göre filtrele"),
    action: Optional[str] = Query(None, description="Aksiyon adına göre filtrele"),
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.created_at))
    )
    if role:
        stmt = stmt.where(User.role == role)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))

    stmt = stmt.limit(limit)
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
                "role": user.role.value if user and hasattr(user.role, "value") else (user.role if user else "PUBLIC"),
                "ip_address": log.ip_address,
            }
        )

    return {"data": data}


@router.get(
    "/dpp/{dpp_id}",
    response_model=AuditLogDppResponse,
    summary="DPP bazlı aksiyon geçmişi",
)
async def get_dpp_audit_logs(
    dpp_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.resource_id == str(dpp_id))
        .order_by(desc(AuditLog.created_at))
    )
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for log, user in rows:
        data.append(
            {
                "id": log.id,
                "action": log.action,
                "user_email": user.email if user else "anonim",
                "role": user.role.value if user and hasattr(user.role, "value") else (user.role if user else "PUBLIC"),
                "ip_address": log.ip_address,
                "date": log.created_at,
            }
        )
    return {"data": data}


@router.post(
    "/access",
    status_code=201,
    summary="DPP erişim aksiyonu logla (iç endpoint)",
)
async def log_dpp_access(
    body: AuditLogAccessCreate,
    request: Request,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    ip = body.ip_address or request.client.host
    await AuditService.log(
        body.action,
        db=db,
        user_id=token.sub,
        resource_type="dpp",
        resource_id=str(body.dpp_id),
        ip_address=ip,
    )
    return {"detail": "Log kaydedildi"}