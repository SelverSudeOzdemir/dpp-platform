"""
User CRUD + API Key Yönetimi

GET    /api/v1/users/              — kullanıcı listesi (admin)
POST   /api/v1/users/              — kullanıcı oluştur (admin)
GET    /api/v1/users/me            — kendi profilim
PATCH  /api/v1/users/me            — profilimi güncelle
POST   /api/v1/users/me/change-password  — şifre değiştir
GET    /api/v1/users/{id}          — kullanıcı detayı (admin)
PATCH  /api/v1/users/{id}/role     — rol değiştir (admin)
DELETE /api/v1/users/{id}          — deaktive et (admin, soft delete)
POST   /api/v1/users/me/api-keys   — API key oluştur
GET    /api/v1/users/me/api-keys   — API key listesi
DELETE /api/v1/users/me/api-keys/{key_id} — API key iptal et
"""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.middleware.rbac import Permission, TokenPayload, require_admin, require_any_auth, require_permission
from app.models.user import ApiKey, User
from app.schemas.user import (
    ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse,
    PasswordChange, UserCreate, UserListResponse,
    UserResponse, UserRoleUpdate, UserUpdate,
)
from app.services.api_key_service import APIKeyService
from app.services.audit_service import AuditActions, AuditService
from app.services.password_service import PasswordService

router = APIRouter(prefix="/users", tags=["Users"])


# ── Yardımcı ─────────────────────────────────────────────────────────────────

async def _get_user_or_404(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı",
        )
    return user


# ── Kullanıcı CRUD ────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=List[UserListResponse],
    summary="Kullanıcı listesi (Admin)",
)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Kullanıcı oluştur (Admin)",
)
async def create_user(
    request: Request,
    body: UserCreate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(deps.get_db),
):
    # Email daha önce alınmış mı?
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta zaten kullanılıyor",
        )

    # Şifre kurallarını kontrol et
    errors = PasswordService.validate_strength(body.password)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"password_errors": errors},
        )

    user = User(
        email=body.email,
        hashed_password=PasswordService.hash(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.USER_CREATED,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role.value},
        ip_address=request.client.host if request.client else None,
    )
    return user


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Kendi profilim",
)
async def get_me(
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    return await _get_user_or_404(uuid.UUID(token.sub), db)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Profilimi güncelle",
)
async def update_me(
    request: Request,
    body: UserUpdate,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    user = await _get_user_or_404(uuid.UUID(token.sub), db)

    old = {"email": user.email, "full_name": user.full_name}
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.USER_UPDATED,
        db=db,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details=AuditService.diff(old, {"email": user.email, "full_name": user.full_name}),
        ip_address=request.client.host if request.client else None,
    )
    return user


@router.post(
    "/me/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Şifre değiştir",
)
async def change_password(
    request: Request,
    body: PasswordChange,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    user = await _get_user_or_404(uuid.UUID(token.sub), db)

    if not PasswordService.verify(body.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifre hatalı",
        )

    errors = PasswordService.validate_strength(body.new_password)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"password_errors": errors},
        )

    user.hashed_password = PasswordService.hash(body.new_password)
    await db.commit()

    await AuditService.log(
        action=AuditActions.PWD_CHANGED,
        db=db,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Kullanıcı detayı (Admin)",
)
async def get_user(
    user_id: uuid.UUID,
    token: TokenPayload = Depends(require_permission(Permission.USER_READ)),
    db: AsyncSession = Depends(deps.get_db),
):
    return await _get_user_or_404(user_id, db)


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Rol değiştir (Admin)",
)
async def change_role(
    request: Request,
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(deps.get_db),
):
    user = await _get_user_or_404(user_id, db)
    old_role = user.role.value

    user.role = body.role
    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.ROLE_CHANGED,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"old_role": old_role, "new_role": body.role.value},
        ip_address=request.client.host if request.client else None,
    )
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Kullanıcıyı deaktive et (Admin — soft delete)",
)
async def deactivate_user(
    request: Request,
    user_id: uuid.UUID,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(deps.get_db),
):
    user = await _get_user_or_404(user_id, db)
    user.is_active = False
    await db.commit()

    await AuditService.log(
        action=AuditActions.USER_DEACTIVATED,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
    )


# ── API Key Yönetimi ──────────────────────────────────────────────────────────

@router.post(
    "/me/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni API key oluştur",
)
async def create_api_key(
    request: Request,
    body: ApiKeyCreate,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    ⚠️ plain_key YALNIZCA bu response'da döner.
    Bir daha görüntülenemez — güvenli bir yere kaydet!
    """
    generated = APIKeyService.generate()

    api_key = ApiKey(
        user_id=uuid.UUID(token.sub),
        key_hint=generated.key_hint,
        hashed_key=generated.hashed_key,
        name=body.name,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    await AuditService.log(
        action=AuditActions.APIKEY_CREATED,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="api_key",
        resource_id=str(api_key.id),
        details={"name": body.name},
        ip_address=request.client.host if request.client else None,
    )

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_hint=api_key.key_hint,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        plain_key=generated.plain_key,
    )


@router.get(
    "/me/api-keys",
    response_model=List[ApiKeyResponse],
    summary="API key listesi",
)
async def list_api_keys(
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == uuid.UUID(token.sub))
    )
    return result.scalars().all()


@router.delete(
    "/me/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="API key iptal et",
)
async def revoke_api_key(
    request: Request,
    key_id: uuid.UUID,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == uuid.UUID(token.sub),
        )
    )
    api_key = result.scalars().first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key bulunamadı",
        )

    api_key.is_active = False
    await db.commit()

    await AuditService.log(
        action=AuditActions.APIKEY_REVOKED,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="api_key",
        resource_id=str(key_id),
        ip_address=request.client.host if request.client else None,
    )