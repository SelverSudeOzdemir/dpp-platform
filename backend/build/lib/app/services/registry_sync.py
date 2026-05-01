"""
EU DPP Registry Sync Service

Mevcut model: RegistrySyncQueue
  - dpp_id, sync_status, attempts, last_error, synced_at
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.integration import RegistrySyncQueue

logger = logging.getLogger("registry_sync")


class SyncStatus(str, Enum):
    PENDING   = "pending"
    SYNCING   = "syncing"
    SYNCED    = "synced"
    FAILED    = "failed"
    RETRYING  = "retrying"


class RegistrySyncService:
    """
    AB DPP Registry'ye senkronizasyon.

    Kullanım:
        await RegistrySyncService.enqueue(db=db, dpp_id=dpp.id)
        await RegistrySyncService.process_queue(db=db)
    """

    REGISTRY_BASE_URL = "https://registry.cirpass.eu/api/v1"  # Gerçek URL gelince değiştir
    MAX_ATTEMPTS = 3
    RETRY_DELAYS = [30, 120, 300]  # saniye — 30s, 2dk, 5dk

    # ── Queue Yönetimi ────────────────────────────────────────────────────────

    @staticmethod
    async def enqueue(
        db: AsyncSession,
        dpp_id: uuid.UUID,
    ) -> RegistrySyncQueue:
        """
        DPP'yi sync kuyruğuna ekle.
        DPP oluşturulunca veya güncellenince çağrılır.
        """
        # Zaten kuyrukta var mı?
        result = await db.execute(
            select(RegistrySyncQueue).where(
                RegistrySyncQueue.dpp_id == dpp_id,
                RegistrySyncQueue.sync_status == SyncStatus.PENDING,
            )
        )
        existing = result.scalars().first()
        if existing:
            return existing

        entry = RegistrySyncQueue(
            dpp_id=dpp_id,
            sync_status=SyncStatus.PENDING,
            attempts=0,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)

        logger.info("DPP sync kuyruğa eklendi: %s", dpp_id)
        return entry

    @staticmethod
    async def process_queue(
        db: AsyncSession,
        batch_size: int = 10,
    ) -> dict:
        """
        Kuyruktaki bekleyen kayıtları işle.
        Bir arka plan task olarak periyodik çalıştırılır.

        Returns:
            {"processed": int, "success": int, "failed": int}
        """
        result = await db.execute(
            select(RegistrySyncQueue).where(
                RegistrySyncQueue.sync_status.in_([
                    SyncStatus.PENDING,
                    SyncStatus.RETRYING,
                ])
            ).limit(batch_size)
        )
        entries = result.scalars().all()

        stats = {"processed": 0, "success": 0, "failed": 0}

        for entry in entries:
            stats["processed"] += 1
            success = await RegistrySyncService._sync_one(db, entry)
            if success:
                stats["success"] += 1
            else:
                stats["failed"] += 1

        return stats

    @staticmethod
    async def _sync_one(
        db: AsyncSession,
        entry: RegistrySyncQueue,
    ) -> bool:
        """Tek bir kaydı registry'ye gönder."""
        entry.sync_status = SyncStatus.SYNCING
        entry.attempts += 1
        await db.commit()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # TODO: Gerçek registry API endpoint'i ve auth gelince güncelle
                response = await client.post(
                    f"{RegistrySyncService.REGISTRY_BASE_URL}/passports",
                    json={"dpp_id": str(entry.dpp_id)},
                    headers={"Authorization": "Bearer TODO_REGISTRY_TOKEN"},
                )
                response.raise_for_status()

            entry.sync_status = SyncStatus.SYNCED
            entry.synced_at = datetime.now(timezone.utc)
            entry.last_error = None
            await db.commit()

            logger.info("Registry sync başarılı: %s", entry.dpp_id)
            return True

        except Exception as e:
            error_msg = str(e)[:500]
            logger.warning("Registry sync başarısız: %s — %s", entry.dpp_id, error_msg)

            if entry.attempts >= RegistrySyncService.MAX_ATTEMPTS:
                entry.sync_status = SyncStatus.FAILED
            else:
                entry.sync_status = SyncStatus.RETRYING

            entry.last_error = error_msg
            await db.commit()
            return False

    @staticmethod
    async def get_status(
        db: AsyncSession,
        dpp_id: uuid.UUID,
    ) -> Optional[RegistrySyncQueue]:
        """DPP'nin sync durumunu getir."""
        result = await db.execute(
            select(RegistrySyncQueue).where(
                RegistrySyncQueue.dpp_id == dpp_id
            ).order_by(RegistrySyncQueue.created_at.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def retry(
        db: AsyncSession,
        dpp_id: uuid.UUID,
    ) -> bool:
        """Başarısız sync'i manuel olarak yeniden dene."""
        result = await db.execute(
            select(RegistrySyncQueue).where(
                RegistrySyncQueue.dpp_id == dpp_id,
                RegistrySyncQueue.sync_status == SyncStatus.FAILED,
            )
        )
        entry = result.scalars().first()
        if not entry:
            return False

        entry.sync_status = SyncStatus.RETRYING
        entry.attempts = 0
        await db.commit()
        return True