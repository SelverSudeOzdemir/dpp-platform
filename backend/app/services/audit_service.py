"""
Audit Log Service

Mevcut AuditLog modeli alanları:
  user_id       → kim yaptı
  action        → ne yaptı  (max 100 karakter)
  resource_type → neye yaptı (max 50 karakter)
  resource_id   → hangi kayıt (max 100 karakter)
  details       → JSON detay (Text)
  ip_address    → nereden (max 45 karakter)
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuditLog

logger = logging.getLogger("audit")


class AuditActions:
    """action alanı için sabitler."""
    # Auth
    LOGIN         = "auth.login"
    LOGOUT        = "auth.logout"
    LOGIN_FAILED  = "auth.login_failed"
    TOKEN_REFRESH = "auth.token_refresh"
    PWD_CHANGED   = "auth.password_changed"
    # Kullanıcı
    USER_CREATED     = "user.created"
    USER_UPDATED     = "user.updated"
    USER_DEACTIVATED = "user.deactivated"
    ROLE_CHANGED     = "user.role_changed"
    # API Key
    APIKEY_CREATED = "apikey.created"
    APIKEY_REVOKED = "apikey.revoked"
    # DPP
    DPP_CREATED        = "dpp.created"
    DPP_UPDATED        = "dpp.updated"
    DPP_STATUS_CHANGED = "dpp.status_changed"
    DPP_DELETED        = "dpp.deleted"


class AuditService:
    """
    Kullanım örneği:
        await AuditService.log(
            action=AuditActions.USER_CREATED,
            db=db,
            user_id=current_user.id,
            resource_type="user",
            resource_id=str(new_user.id),
            details={"email": new_user.email, "role": "manufacturer"},
            ip_address=request.client.host,
        )
    """

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
        details_str = json.dumps(details, default=str) if details else None

        # Her zaman log'a yaz
        logger.info(
            "[AUDIT] action=%s user=%s %s/%s ip=%s",
            action, user_id, resource_type, resource_id, ip_address,
        )

        # db verilmemişse sadece log yaz (test ortamı)
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
        """
        İki dict arasındaki farkı hesapla.
        Audit log details alanına koymak için kullanılır.
        """
        changed = {k for k in set(old) | set(new) if old.get(k) != new.get(k)}
        return {
            "old": {k: old.get(k) for k in changed},
            "new": {k: new.get(k) for k in changed},
        }