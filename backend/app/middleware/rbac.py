"""
Role-Based Access Control (RBAC)

Mevcut UserRole enum:
  admin > manufacturer > auditor > stakeholder
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import UserRole
from app.services.auth_service import AuthService, TokenPayload

_bearer_scheme = HTTPBearer(auto_error=True)

# ── Rol ağırlıkları — yüksek sayı = daha yetkili ─────────────────────────────
_ROLE_WEIGHT: dict[str, int] = {
    UserRole.ADMIN.value:        100,
    UserRole.MANUFACTURER.value:  60,
    UserRole.AUDITOR.value:       40,
    UserRole.STAKEHOLDER.value:   10,
}

# ── Her role hangi izinler var ────────────────────────────────────────────────
class Permission:
    # DPP
    DPP_READ    = "dpp:read"
    DPP_CREATE  = "dpp:create"
    DPP_UPDATE  = "dpp:update"
    DPP_DELETE  = "dpp:delete"
    DPP_PUBLISH = "dpp:publish"
    # Ürün
    PRODUCT_READ  = "product:read"
    PRODUCT_WRITE = "product:write"
    # Kullanıcı
    USER_READ   = "user:read"
    USER_WRITE  = "user:write"
    USER_MANAGE = "user:manage"
    # Sistem
    ADMIN_PANEL        = "admin:panel"
    AUDIT_READ         = "audit:read"
    INTEGRATION_MANAGE = "integration:manage"
    APIKEY_CREATE      = "apikey:create"
    APIKEY_READ        = "apikey:read"

_ROLE_PERMISSIONS: dict[str, set[str]] = {
    UserRole.ADMIN.value: {
        Permission.DPP_READ, Permission.DPP_CREATE, Permission.DPP_UPDATE,
        Permission.DPP_DELETE, Permission.DPP_PUBLISH,
        Permission.PRODUCT_READ, Permission.PRODUCT_WRITE,
        Permission.USER_READ, Permission.USER_WRITE, Permission.USER_MANAGE,
        Permission.ADMIN_PANEL, Permission.AUDIT_READ,
        Permission.INTEGRATION_MANAGE,
        Permission.APIKEY_CREATE, Permission.APIKEY_READ,
    },
    UserRole.MANUFACTURER.value: {
        Permission.DPP_READ, Permission.DPP_CREATE,
        Permission.DPP_UPDATE, Permission.DPP_PUBLISH,
        Permission.PRODUCT_READ, Permission.PRODUCT_WRITE,
        Permission.USER_READ,
        Permission.APIKEY_CREATE, Permission.APIKEY_READ,
    },
    UserRole.AUDITOR.value: {
        Permission.DPP_READ,
        Permission.PRODUCT_READ,
        Permission.USER_READ,
        Permission.AUDIT_READ,
    },
    UserRole.STAKEHOLDER.value: {
        Permission.DPP_READ,
        Permission.PRODUCT_READ,
    },
}

# ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

def has_role(user_role: str, required_role: str) -> bool:
    """Kullanıcı rolü gerekli rolden büyük veya eşit mi?"""
    return _ROLE_WEIGHT.get(user_role, 0) >= _ROLE_WEIGHT.get(required_role, 999)

def has_permission(user_role: str, permission: str) -> bool:
    """Kullanıcının belirtilen izni var mı?"""
    return permission in _ROLE_PERMISSIONS.get(user_role, set())

# ── FastAPI Dependency'leri ───────────────────────────────────────────────────

async def get_current_token(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> TokenPayload:
    """
    Her korumalı endpoint'in temel dependency'si.
    Authorization: Bearer <token> header'ını okur ve doğrular.
    """
    try:
        return AuthService.verify_access_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(minimum_role: str):
    """
    Minimum rol gerektiren dependency factory.

    Kullanım:
        @router.get("/rapor")
        async def rapor(token = Depends(require_role(UserRole.AUDITOR.value))):
    """
    async def dep(
        token: TokenPayload = Depends(get_current_token),
    ) -> TokenPayload:
        if not has_role(token.role, minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için minimum '{minimum_role}' rolü gereklidir",
            )
        return token
    return dep

def require_permission(permission: str):
    """
    Belirli izin gerektiren dependency factory.

    Kullanım:
        @router.post("/dpp")
        async def create(token = Depends(require_permission(Permission.DPP_CREATE))):
    """
    async def dep(
        token: TokenPayload = Depends(get_current_token),
    ) -> TokenPayload:
        if not has_permission(token.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için '{permission}' izni gereklidir",
            )
        return token
    return dep

# ── Hazır kısayollar — endpoint'lerde direkt kullanılır ──────────────────────
require_admin        = require_role(UserRole.ADMIN.value)
require_manufacturer = require_role(UserRole.MANUFACTURER.value)
require_auditor      = require_role(UserRole.AUDITOR.value)
require_any_auth     = get_current_token  # Sadece giriş yapmış olsun yeter