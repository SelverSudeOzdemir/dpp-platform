
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import UserRole
from app.services.auth_service import AuthService, TokenPayload

_bearer_scheme = HTTPBearer(auto_error=True)


class Permission:
    DPP_READ = "dpp:read"
    DPP_CREATE = "dpp:create"
    DPP_UPDATE = "dpp:update"
    DPP_DELETE = "dpp:delete"
    DPP_APPROVE = "dpp:approve"

    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_MANAGE = "user:manage"

    AUDIT_READ = "audit:read"
    ADMIN_PANEL = "admin:panel"
    INTEGRATION_MANAGE = "integration:manage"


_ROLE_PERMISSIONS = {
    UserRole.ADMIN.value: {
        Permission.DPP_READ,
        Permission.DPP_CREATE,
        Permission.DPP_UPDATE,
        Permission.DPP_DELETE,
        Permission.DPP_APPROVE,
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_MANAGE,
        Permission.AUDIT_READ,
        Permission.ADMIN_PANEL,
        Permission.INTEGRATION_MANAGE,
    },
    UserRole.ENGINEER.value: {
        Permission.DPP_READ,
        Permission.DPP_CREATE,
        Permission.DPP_UPDATE,
    },
    UserRole.AUTHORITY.value: {
        Permission.DPP_READ,
    },
    UserRole.CUSTOMER.value: {
        Permission.DPP_READ,
    },
    UserRole.SUPPLIER.value: {
        Permission.DPP_READ,
    },
}


def has_permission(role: str, permission: str) -> bool:
    return permission in _ROLE_PERMISSIONS.get(role, set())


async def get_current_token(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> TokenPayload:
    try:
        return AuthService.verify_access_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_permission(permission: str):
    async def dep(token: TokenPayload = Depends(get_current_token)) -> TokenPayload:
        if not has_permission(token.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem için yetkiniz yok",
            )
        return token

    return dep


def require_role(*roles: str):
    async def dep(token: TokenPayload = Depends(get_current_token)) -> TokenPayload:
        if token.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu role sahip kullanıcı işlem yapamaz",
            )
        return token

    return dep


require_any_auth = get_current_token
require_authenticated = require_any_auth

require_admin = require_role(UserRole.ADMIN.value)
require_engineer = require_role(UserRole.ENGINEER.value)
require_admin_or_engineer = require_role(UserRole.ADMIN.value, UserRole.ENGINEER.value)
require_auditor = require_role(UserRole.AUTHORITY.value, UserRole.ADMIN.value)
require_manufacturer = require_role(UserRole.SUPPLIER.value, UserRole.ADMIN.value)


def require_roles(*roles: str):
    return require_role(*roles)


def has_role(token: TokenPayload, *roles: str) -> bool:
    return token.role in roles