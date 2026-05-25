"""
Audit logs router — G-10 güncellemesi ile granüler DPP aksiyonları eklendi
"""
from typing import Optional
from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, Permission, TokenPayload, require_permission
from app.modules.auth.models import AuditLog, User
from app.modules.audit.schemas import (
    AuditLogAccessCreate,
    AuditLogDppResponse,
    AuditLogRecentResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


def _mask_ip(ip: str) -> str:
    """195.142.10.5 → 195.142.x.x"""
    if not ip or "." not in ip:
        return ip
    parts = ip.split(".")
    if len(parts) >= 4:
        return f"{parts[0]}.{parts[1]}.x.x"
    return ip


@router.get(
    "/recent",
    response_model=AuditLogRecentResponse,
    summary="Son sistem aktiviteleri (rol ve aksiyon filtreli)",
)
async def get_recent_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=200),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
    )
    if role:
        stmt = stmt.where(User.role == role)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))

    # Total count for pagination
    count_stmt = (
        select(func.count(AuditLog.id))
        .outerjoin(User, AuditLog.user_id == User.id)
    )
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if action:
        count_stmt = count_stmt.where(AuditLog.action.ilike(f"%{action}%"))
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for log, user in rows:
        data.append({
            "id": log.id,
            "action": log.action,
            "target_id": log.resource_id,
            "user_email": user.email if user else "anonim",
            "date": log.created_at,
            "role": user.role.value if user and hasattr(user.role, "value") else (user.role if user else "PUBLIC"),
            "ip_address": _mask_ip(log.ip_address),
        })

    return {"data": data, "total": total}


@router.get(
    "/access-logs",
    response_model=AuditLogRecentResponse,
    summary="Erişim logları — IP maskelenmiş, sayfalı",
)
async def get_access_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = Query(None),
    dpp_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    access_actions = [
        "DPP PDF indirildi",
        "DPP QR tarandı",
        "DPP kimyasal kompozisyon görüntülendi",
        "DPP tedarik zinciri görüntülendi",
        "DPP oluşturuldu",
        "DPP güncellendi",
        "DPP onaya gönderildi",
        "DPP onaylandı",
        "DPP reddedildi",
        "DPP silindi",
        "DPP arşivlendi",
        "DPP geri çağrıldı",
        "DPP taslağa alındı",
        "DPP tedarik zinciri güncellendi",
        "Kullanıcı giriş yaptı",
        "Kullanıcı çıkış yaptı",
        "Başarısız giriş denemesi",
        "Kullanıcı oluşturuldu",
        "Kullanıcı güncellendi",
        "Kullanıcı pasifleştirildi",
        "Kullanıcı aktifleştirildi",
        "Rol değiştirildi",
        "Şifre değiştirildi",
        "Şifre sıfırlandı",
    ]

    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
    )
    if role:
        stmt = stmt.where(User.role == role)
    if dpp_id:
        stmt = stmt.where(AuditLog.resource_id == dpp_id)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))

    # Total count
    count_stmt = (
        select(func.count(AuditLog.id))
        .outerjoin(User, AuditLog.user_id == User.id)
    )
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if dpp_id:
        count_stmt = count_stmt.where(AuditLog.resource_id == dpp_id)
    if action:
        count_stmt = count_stmt.where(AuditLog.action.ilike(f"%{action}%"))
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for log, user in rows:
        data.append({
            "id": log.id,
            "action": log.action,
            "target_id": log.resource_id,
            "user_email": user.email if user else "anonim",
            "date": log.created_at,
            "role": user.role.value if user and hasattr(user.role, "value") else (user.role if user else "PUBLIC"),
            "ip_address": _mask_ip(log.ip_address),
        })

    return {"data": data, "total": total}


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
        data.append({
            "id": log.id,
            "action": log.action,
            "user_email": user.email if user else "anonim",
            "role": user.role.value if user and hasattr(user.role, "value") else (user.role if user else "PUBLIC"),
            "ip_address": log.ip_address,
            "date": log.created_at,
        })
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
    ip = body.ip_address or (request.client.host if request.client else None)
    await AuditService.log(
        body.action,
        db=db,
        user_id=uuid.UUID(str(token.sub)) if token.sub else None,
        resource_type="dpp",
        resource_id=str(body.dpp_id),
        ip_address=ip,
    )
    return {"detail": "Log kaydedildi"}