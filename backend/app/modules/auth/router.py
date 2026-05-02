"""
Auth router — Login, Logout, Refresh, Me endpoints
Orijinal app/api/v1/auth.py içeriğinin aynısıdır.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db
from app.modules.auth.models import User
from app.modules.auth.schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse, UserResponse
from app.modules.auth.services import AuthService, TokenPayload
from app.modules.audit.services import AuditActions, AuditService
from app.middleware.rbac import require_any_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalars().first()

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

    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = AuthService.verify_refresh_token(body.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz refresh token",
        )

    result = await db.execute(select(User).where(User.id == UUID(payload.sub)))
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

    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    body: LogoutRequest,
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(get_db),
):
    AuthService.revoke_token(token.jti)

    if body.refresh_token:
        try:
            refresh_payload = AuthService.verify_refresh_token(body.refresh_token)
            AuthService.revoke_token(refresh_payload.jti)
        except Exception:
            pass

    await AuditService.log(
        action=AuditActions.LOGOUT,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=token.sub,
        ip_address=request.client.host if request.client else None,
    )


@router.get("/me", response_model=UserResponse)
async def me(
    token: TokenPayload = Depends(require_any_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == UUID(token.sub)))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    return user
