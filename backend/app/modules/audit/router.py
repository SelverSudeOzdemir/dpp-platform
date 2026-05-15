"""
Audit logs router — Orijinal app/api/v1/audit_logs.py içeriğinin aynısıdır.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, Permission, TokenPayload, require_permission
from app.modules.auth.models import AuditLog, User
from app.modules.audit.schemas import AuditLogRecentResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get(
    "/recent",
    response_model=AuditLogRecentResponse,
    summary="Son sistem aktiviteleri",
)
async def get_recent_audit_logs(
    skip: int = 0,
    limit: int = 10,
    role: Optional[str] = None,
    action: Optional[str] = None,
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
    )

    if role:
        stmt = stmt.filter(User.role == role)
    if action:
        stmt = stmt.filter(AuditLog.action.ilike(f"%{action}%"))

    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    data = []

    def mask_ip(ip: str) -> str:
        if not ip or "." not in ip:
            return ip
        parts = ip.split(".")
        if len(parts) >= 4:
            return f"{parts[0]}.{parts[1]}.x.x"
        return ip

    for log, user in rows:
        data.append(
            {
                "id": log.id,
                "action": log.action,
                "target_id": log.resource_id,
                "user_email": user.email if user else "anonim",
                "date": log.created_at,
                "role": user.role.value if user and hasattr(user.role, "value") else user.role if user else "PUBLIC",
                "ip_address": mask_ip(log.ip_address),
            }
        )

    return {"data": data}


@router.get("/access-logs", response_model=AuditLogRecentResponse)
async def get_access_logs(
    skip: int = 0,
    limit: int = 20,
    role: Optional[str] = None,
    dpp_id: Optional[str] = None,
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    # 'DPP_PDF_DOWNLOADED', 'DPP_QR_SCANNED' gibi erişim aksiyonları
    access_actions = [
        "Pasaport PDF indirildi", 
        "QR Kod tarandı", 
        "Kimyasal kompozisyon görüntülendi", 
        "Tedarik zinciri görüntülendi"
    ]
    
    stmt = select(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id)
    stmt = stmt.filter(AuditLog.action.in_(access_actions))
    
    if role:
        stmt = stmt.filter(User.role == role)
    if dpp_id:
        stmt = stmt.filter(AuditLog.resource_id == dpp_id)
        
    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for log, user in rows:
        # Mask IP: '195.142.10.5' -> '195.142.x.x'
        ip = log.ip_address
        if ip and "." in ip:
            parts = ip.split(".")
            if len(parts) >= 4:
                ip = f"{parts[0]}.{parts[1]}.x.x"
                
        data.append({
            "id": log.id,
            "action": log.action,
            "target_id": log.resource_id,
            "user_email": user.email if user else "anonim",
            "date": log.created_at,
            "role": user.role.value if user and hasattr(user.role, "value") else user.role if user else "PUBLIC",
            "ip_address": ip,
        })
    return {"data": data}


@router.get("/dpp/{dpp_id}", response_model=AuditLogRecentResponse)
async def get_dpp_audit_history(
    dpp_id: str,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.AUDIT_READ)),
):
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(AuditLog.resource_id == dpp_id)
        .order_by(desc(AuditLog.created_at))
    )
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
            "role": user.role.value if user and hasattr(user.role, "value") else user.role if user else "PUBLIC",
            "ip_address": log.ip_address, # Full IP allowed for Admin in history? 
                                          # Requirement says IP address mask in access-logs.
        })
    return {"data": data}


@router.post("/access")
async def log_access_internal(
    action: str,
    dpp_id: str,
    ip_address: str,
    user_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    from app.modules.audit.services import AuditService
    await AuditService.log(
        action=action,
        db=db,
        user_id=user_id,
        resource_type="DPP",
        resource_id=dpp_id,
        ip_address=ip_address
    )
    return {"status": "logged"}
