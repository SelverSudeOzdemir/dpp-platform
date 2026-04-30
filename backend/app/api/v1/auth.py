"""
Auth API Endpoints

POST /api/v1/auth/login        — email + şifre → token al
POST /api/v1/auth/login/form   — Swagger UI için OAuth2 form
POST /api/v1/auth/refresh      — refresh token → yeni token çifti
POST /api/v1/auth/logout       — token iptal et
GET  /api/v1/auth/me           — token'dan kim olduğunu öğren
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.middleware.rate_limiter import RateLimits, limiter
from app.middleware.rbac import TokenPayload, require_any_auth
from app.models.user import User
from app.schemas.user import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.services.audit_service import AuditActions, AuditService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Giriş yap — email + şifre ile token al",
)
@limiter.limit(RateLimits.AUTH_LOGIN)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    # Kullanıcıyı DB'den çek
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalars().first()

    # Kullanıcı bulunamadı — yine de "hatalı şifre" de, email tespitini engelle
    if not user:
        await AuditService.log(
            action=AuditActions.LOGIN_FAILED,
            db=db,
            resource_type="user",
            resource_id=body.email,
            details={"reason": "user_not_found"},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )

    # Şifre doğrula
    try:
        tokens = await AuthService.authenticate(user, body.password)
    except ValueError as e:
        await AuditService.log(
            action=AuditActions.LOGIN_FAILED,
            db=db,
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            details={"reason": str(e)},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )

    await AuditService.log(
        action=AuditActions.LOGIN,
        db=db,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
    )


# ── Swagger UI için OAuth2 form login ────────────────────────────────────────

@router.post(
    "/login/form",
    response_model=TokenResponse,
    include_in_schema=False,  # Swagger'da görünmez, arka planda çalışır
)
@limiter.limit(RateLimits.AUTH_LOGIN)
async def login_form(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz kimlik bilgileri",
        )

    try:
        tokens = await AuthService.authenticate(user, form.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
    )


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Access token yenile",
)
@limiter.limit(RateLimits.AUTH_REFRESH)
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Refresh token ile yeni access + refresh token çifti al.
    Eski refresh token otomatik iptal edilir (token rotation güvenliği).
    """
    try:
        payload = AuthService.verify_refresh_token(body.refresh_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Geçersiz refresh token: {e}",
        )

    # Kullanıcı hâlâ aktif mi kontrol et
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(payload.sub))
    )
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya aktif değil",
        )

    tokens = await AuthService.refresh(body.refresh_token, user)

    await AuditService.log(
        action=AuditActions.TOKEN_REFRESH,
        db=db,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Çıkış yap — token iptal et",
)
async def logout(
    request: Request,
    body: LogoutRequest,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(deps.get_db),
):
    # Access token'ı iptal et
    AuthService.revoke_token(token.jti)

    # Refresh token da gönderildiyse onu da iptal et
    if body.refresh_token:
        try:
            refresh_payload = AuthService.verify_refresh_token(body.refresh_token)
            AuthService.revoke_token(refresh_payload.jti)
        except Exception:
            pass  # Zaten geçersizse önemli değil

    await AuditService.log(
        action=AuditActions.LOGOUT,
        db=db,
        user_id=uuid.UUID(token.sub),
        resource_type="user",
        resource_id=token.sub,
        ip_address=request.client.host if request.client else None,
    )


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    summary="Token'dan kullanıcı bilgisi",
)
async def get_token_info(
    token: TokenPayload = Depends(require_any_auth),
):
    """Token geçerliyse içindeki kullanıcı bilgisini döndür."""
    return {"id": token.sub, "role": token.role}