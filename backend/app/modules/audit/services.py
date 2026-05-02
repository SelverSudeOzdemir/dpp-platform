"""
Audit service — Orijinal app/services/audit_service.py içeriğinin aynısıdır.
"""

import json
import logging
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuditLog

logger = logging.getLogger("audit")


class AuditActions:
    LOGIN = "Kullanıcı giriş yaptı"
    LOGOUT = "Kullanıcı çıkış yaptı"
    LOGIN_FAILED = "Başarısız giriş denemesi"
    TOKEN_REFRESH = "Token yenilendi"
    PWD_CHANGED = "Şifre değiştirildi"

    USER_CREATED = "Kullanıcı oluşturuldu"
    USER_UPDATED = "Kullanıcı güncellendi"
    USER_DEACTIVATED = "Kullanıcı pasifleştirildi"
    USER_ACTIVATED = "Kullanıcı aktifleştirildi"
    ROLE_CHANGED = "Rol değiştirildi"

    DPP_CREATED = "DPP oluşturuldu"
    DPP_UPDATED = "DPP güncellendi"
    DPP_SUBMITTED = "DPP onaya gönderildi"
    DPP_APPROVED = "DPP onaylandı"
    DPP_REJECTED = "DPP reddedildi"
    DPP_DELETED = "DPP silindi"

    PDF_DOWNLOADED = "Pasaport PDF indirildi"
    SUPPLY_CHAIN_VIEWED = "Tedarik zinciri görüntülendi"


class AuditService:
    @staticmethod
    async def log(
        action: str,
        *,
        db: Optional[AsyncSession] = None,
        user_id: Optional[uuid.UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        details_str = json.dumps(details, default=str, ensure_ascii=False) if details else None

        logger.info(
            "[AUDIT] action=%s user=%s resource=%s/%s ip=%s",
            action,
            user_id,
            resource_type,
            resource_id,
            ip_address,
        )

        if db is None:
            return

        entry = AuditLog(
            user_id=user_id,
            action=action[:100],
            resource_type=resource_type[:50] if resource_type else None,
            resource_id=resource_id[:100] if resource_id else None,
            details=details_str,
            ip_address=ip_address[:45] if ip_address else None,
        )

        db.add(entry)
        await db.commit()

    @staticmethod
    def diff(old: dict, new: dict) -> dict:
        changed = {k for k in set(old) | set(new) if old.get(k) != new.get(k)}
        return {
            "old": {k: old.get(k) for k in changed},
            "new": {k: new.get(k) for k in changed},
        }
