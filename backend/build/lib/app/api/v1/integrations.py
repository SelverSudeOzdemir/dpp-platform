"""
Integrations API

GET  /api/v1/integrations/registry/{dpp_id}        — Sync durumu
POST /api/v1/integrations/registry/{dpp_id}/retry  — Retry tetikle
POST /api/v1/integrations/registry/process         — Kuyruğu işle (admin)
POST /api/v1/integrations/webhook/test             — Webhook test
GET  /api/v1/integrations/backup/{dpp_id}          — Snapshot listesi
POST /api/v1/integrations/backup/{dpp_id}          — Manuel snapshot
"""
from __future__ import annotations

import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.middleware.rbac import Permission, TokenPayload, require_admin, require_any_auth, require_permission
from app.services.backup_service import BackupService
from app.services.registry_sync import RegistrySyncService, SyncStatus
from app.services.webhook_service import WebhookEvent, WebhookService

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SyncStatusResponse(BaseModel):
    dpp_id: uuid.UUID
    sync_status: str
    attempts: int
    last_error: Optional[str]
    synced_at: Optional[str]


class ProcessQueueResponse(BaseModel):
    processed: int
    success: int
    failed: int


class WebhookTestRequest(BaseModel):
    url: str
    event: WebhookEvent = WebhookEvent.DPP_CREATED
    secret: Optional[str] = None


class WebhookTestResponse(BaseModel):
    success: bool
    event: str
    url: str


class SnapshotResponse(BaseModel):
    id: uuid.UUID
    dpp_id: uuid.UUID
    snapshot_type: str
    checksum: str
    is_valid: bool
    created_at: str


class ManualSnapshotRequest(BaseModel):
    data: dict[str, Any]
    snapshot_type: str = "manual"


# ── Registry Sync ─────────────────────────────────────────────────────────────

@router.get(
    "/registry/{dpp_id}",
    response_model=SyncStatusResponse,
    summary="Registry sync durumu",
)
async def get_sync_status(
    dpp_id: uuid.UUID,
    token: TokenPayload = Depends(require_permission(Permission.INTEGRATION_MANAGE)),
    db: AsyncSession = Depends(deps.get_db),
):
    """DPP'nin AB Registry sync durumunu getir."""
    entry = await RegistrySyncService.get_status(db, dpp_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu DPP için sync kaydı bulunamadı",
        )
    return SyncStatusResponse(
        dpp_id=entry.dpp_id,
        sync_status=entry.sync_status,
        attempts=entry.attempts,
        last_error=entry.last_error,
        synced_at=str(entry.synced_at) if entry.synced_at else None,
    )


@router.post(
    "/registry/{dpp_id}/retry",
    summary="Başarısız sync'i yeniden dene",
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_sync(
    dpp_id: uuid.UUID,
    token: TokenPayload = Depends(require_permission(Permission.INTEGRATION_MANAGE)),
    db: AsyncSession = Depends(deps.get_db),
):
    """Başarısız registry sync'i manuel olarak yeniden tetikle."""
    success = await RegistrySyncService.retry(db, dpp_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Retry edilecek başarısız sync bulunamadı",
        )
    return {"message": "Retry kuyruğa alındı", "dpp_id": str(dpp_id)}


@router.post(
    "/registry/process",
    response_model=ProcessQueueResponse,
    summary="Sync kuyruğunu işle (Admin)",
)
async def process_queue(
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Bekleyen sync kayıtlarını işle.
    Normalde arka plan task çalıştırır — bu endpoint manuel tetikleme için.
    """
    stats = await RegistrySyncService.process_queue(db)
    return ProcessQueueResponse(**stats)


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post(
    "/webhook/test",
    response_model=WebhookTestResponse,
    summary="Webhook bağlantısını test et",
)
async def test_webhook(
    body: WebhookTestRequest,
    token: TokenPayload = Depends(require_permission(Permission.INTEGRATION_MANAGE)),
):
    """Verilen URL'e test webhook gönder."""
    success = await WebhookService.send(
        url=body.url,
        event=body.event,
        payload={
            "test": True,
            "message": "Kocaer DPP webhook test mesajı",
            "dpp_id": str(uuid.uuid4()),
        },
        secret=body.secret,
    )
    return WebhookTestResponse(
        success=success,
        event=body.event,
        url=body.url,
    )


# ── Backup ────────────────────────────────────────────────────────────────────

@router.get(
    "/backup/{dpp_id}",
    response_model=List[SnapshotResponse],
    summary="DPP snapshot listesi",
)
async def list_snapshots(
    dpp_id: uuid.UUID,
    limit: int = 10,
    token: TokenPayload = Depends(require_permission(Permission.INTEGRATION_MANAGE)),
    db: AsyncSession = Depends(deps.get_db),
):
    """DPP'nin tüm backup snapshot'larını listele."""
    snapshots = await BackupService.list_snapshots(db, dpp_id, limit=limit)
    return [
        SnapshotResponse(
            id=s.id,
            dpp_id=s.dpp_id,
            snapshot_type=s.snapshot_type,
            checksum=s.checksum,
            is_valid=BackupService.verify_snapshot(s),
            created_at=str(s.created_at),
        )
        for s in snapshots
    ]


@router.post(
    "/backup/{dpp_id}",
    response_model=SnapshotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manuel snapshot oluştur",
)
async def create_snapshot(
    dpp_id: uuid.UUID,
    body: ManualSnapshotRequest,
    token: TokenPayload = Depends(require_permission(Permission.INTEGRATION_MANAGE)),
    db: AsyncSession = Depends(deps.get_db),
):
    """DPP için manuel backup snapshot oluştur."""
    snapshot = await BackupService.create_snapshot(
        db=db,
        dpp_id=dpp_id,
        data=body.data,
        snapshot_type=body.snapshot_type,
    )
    return SnapshotResponse(
        id=snapshot.id,
        dpp_id=snapshot.dpp_id,
        snapshot_type=snapshot.snapshot_type,
        checksum=snapshot.checksum,
        is_valid=True,
        created_at=str(snapshot.created_at),
    )