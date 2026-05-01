"""
Backup Service
DPP snapshot oluşturma ve checksum doğrulama

Mevcut model: BackupSnapshot
  - snapshot_data, checksum, snapshot_type, created_at
"""
from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.integration import BackupSnapshot

logger = logging.getLogger("backup")


class BackupService:
    """
    Kullanım:
        snapshot = await BackupService.create_snapshot(
            db=db,
            dpp_id=dpp.id,
            data=dpp_data_dict,
            snapshot_type="manual",
        )
    """

    # ── Snapshot Oluşturma ────────────────────────────────────────────────────

    @staticmethod
    async def create_snapshot(
        db: AsyncSession,
        dpp_id: uuid.UUID,
        data: dict[str, Any],
        snapshot_type: str = "auto",  # auto | manual | pre_update
    ) -> BackupSnapshot:
        """
        DPP verisi için snapshot oluştur.

        Args:
            data: JSON serialize edilebilir DPP verisi
            snapshot_type: Snapshot türü
        """
        serialized = json.dumps(data, default=str, sort_keys=True)
        checksum = BackupService._compute_checksum(serialized)

        snapshot = BackupSnapshot(
            dpp_id=dpp_id,
            snapshot_data=serialized,
            checksum=checksum,
            snapshot_type=snapshot_type,
        )
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)

        logger.info(
            "Snapshot oluşturuldu: dpp=%s type=%s checksum=%s",
            dpp_id, snapshot_type, checksum[:8],
        )
        return snapshot

    # ── Doğrulama ─────────────────────────────────────────────────────────────

    @staticmethod
    def verify_snapshot(snapshot: BackupSnapshot) -> bool:
        """
        Snapshot'ın bütünlüğünü doğrula.
        checksum eşleşmiyorsa veri bozulmuş demek.
        """
        computed = BackupService._compute_checksum(snapshot.snapshot_data)
        is_valid = computed == snapshot.checksum

        if not is_valid:
            logger.error(
                "Snapshot bütünlük hatası! dpp=%s beklenen=%s hesaplanan=%s",
                snapshot.dpp_id, snapshot.checksum[:8], computed[:8],
            )
        return is_valid

    @staticmethod
    def _compute_checksum(data: str) -> str:
        """SHA-256 checksum hesapla."""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    # ── Sorgulama ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_latest_snapshot(
        db: AsyncSession,
        dpp_id: uuid.UUID,
    ) -> Optional[BackupSnapshot]:
        """DPP'nin en son snapshot'ını getir."""
        result = await db.execute(
            select(BackupSnapshot)
            .where(BackupSnapshot.dpp_id == dpp_id)
            .order_by(BackupSnapshot.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def list_snapshots(
        db: AsyncSession,
        dpp_id: uuid.UUID,
        limit: int = 10,
    ) -> list[BackupSnapshot]:
        """DPP'nin tüm snapshot'larını listele."""
        result = await db.execute(
            select(BackupSnapshot)
            .where(BackupSnapshot.dpp_id == dpp_id)
            .order_by(BackupSnapshot.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def restore_snapshot(
        snapshot: BackupSnapshot,
    ) -> dict[str, Any]:
        """
        Snapshot verisini dict olarak döndür.
        Gerçek restore işlemi DEV-1'in DPP Engine'i ile yapılır.
        """
        if not BackupService.verify_snapshot(snapshot):
            raise ValueError("Snapshot bütünlüğü bozulmuş, restore edilemez")

        return json.loads(snapshot.snapshot_data)