"""
Users router — Kullanıcı yönetimi CRUD
Orijinal app/api/v1/users.py içeriğinin aynısıdır.
"""

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db
from app.middleware.rbac import TokenPayload, require_admin
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)
from app.modules.audit.services import AuditActions, AuditService
from app.modules.auth.services import PasswordService

router = APIRouter(prefix="/users", tags=["Users"])


async def _get_user_or_404(user_id: UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı",
        )

    return user


@router.get("/", response_model=List[UserListResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    body: UserCreate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == body.email))

    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta zaten kullanılıyor",
        )

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=PasswordService.hash(body.password),
        role=body.role,
        is_active=True,
        is_superuser=body.role.value == "ADMIN",
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.USER_CREATED,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role.value},
        ip_address=request.client.host if request.client else None,
    )

    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _get_user_or_404(user_id, db)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: UUID,
    body: UserUpdate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(user_id, db)

    old = {
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
    }

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.USER_UPDATED,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details=AuditService.diff(
            old,
            {
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
            },
        ),
        ip_address=request.client.host if request.client else None,
    )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    request: Request,
    user_id: UUID,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(user_id, db)

    user.is_active = False
    await db.commit()

    await AuditService.log(
        action=AuditActions.USER_DEACTIVATED,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email},
        ip_address=request.client.host if request.client else None,
    )


@router.patch("/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    request: Request,
    user_id: UUID,
    body: UserRoleUpdate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(user_id, db)

    old_role = user.role.value if hasattr(user.role, "value") else user.role
    user.role = body.role
    user.is_superuser = body.role.value == "ADMIN"

    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.ROLE_CHANGED,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"old_role": old_role, "new_role": body.role.value},
        ip_address=request.client.host if request.client else None,
    )

    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
async def change_user_status(
    request: Request,
    user_id: UUID,
    body: UserStatusUpdate,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(user_id, db)

    old_status = user.is_active
    user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)

    await AuditService.log(
        action=AuditActions.USER_ACTIVATED if user.is_active else AuditActions.USER_DEACTIVATED,
        db=db,
        user_id=UUID(token.sub),
        resource_type="user",
        resource_id=str(user.id),
        details={"old_status": old_status, "new_status": user.is_active},
        ip_address=request.client.host if request.client else None,
    )

    return user
