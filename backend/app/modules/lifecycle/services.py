from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.lifecycle import LifecycleEvent
from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.integration import DppChangelog
from app.modules.lifecycle import schemas
from uuid import UUID
from datetime import datetime

class LifecycleService:
    @staticmethod
    async def get_events_by_dpp(db: AsyncSession, dpp_id: UUID):
        stmt = select(LifecycleEvent).where(LifecycleEvent.dpp_id == dpp_id).order_by(LifecycleEvent.event_date.desc())
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def create_event(db: AsyncSession, event_data: schemas.LifecycleEventCreate):
        db_event = LifecycleEvent(**event_data.model_dump())
        db.add(db_event)
        await db.commit()
        await db.refresh(db_event)
        return db_event

    @staticmethod
    async def archive_dpp(db: AsyncSession, dpp_id: UUID, reason: str, user_id: UUID = None):
        stmt = select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        result = await db.execute(stmt)
        dpp = result.scalars().first()
        if not dpp:
            return None
        
        previous_status = dpp.dpp_status
        dpp.dpp_status = DppStatusEnum.ARCHIVED
        dpp.is_active = False # Deactivate QR
        dpp.status_changed_at = datetime.utcnow()
        
        # Log event
        event = LifecycleEvent(
            dpp_id=dpp_id,
            stage="EOL",
            event_type="ARCHIVED",
            event_date=datetime.utcnow(),
            description=f"DPP Archived. Reason: {reason}",
            status="Completed"
        )
        db.add(event)
        
        # Log to Changelog
        changelog = DppChangelog(
            dpp_id=dpp_id,
            changed_by_user_id=user_id,
            change_type="ARCHIVE",
            previous_state={"status": previous_status},
            new_state={"status": "archived", "is_active": False}
        )
        db.add(changelog)
        
        await db.commit()
        return dpp

    @staticmethod
    async def recall_dpp(db: AsyncSession, dpp_id: UUID, reason: str, user_id: UUID = None):
        stmt = select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        result = await db.execute(stmt)
        dpp = result.scalars().first()
        if not dpp:
            return None
        
        previous_status = dpp.dpp_status
        dpp.dpp_status = DppStatusEnum.RECALLED
        dpp.is_active = False
        dpp.status_changed_at = datetime.utcnow()
        
        # Log event
        event = LifecycleEvent(
            dpp_id=dpp_id,
            stage="EOL",
            event_type="RECALLED",
            event_date=datetime.utcnow(),
            description=f"DPP Recalled. Reason: {reason}",
            status="Completed"
        )
        db.add(event)
        
        # Log to Changelog
        changelog = DppChangelog(
            dpp_id=dpp_id,
            changed_by_user_id=user_id,
            change_type="RECALL",
            previous_state={"status": str(previous_status.value if hasattr(previous_status, 'value') else previous_status)},
            new_state={"status": "recalled", "is_active": False, "recall_reason": reason}
        )
        db.add(changelog)
        
        await db.commit()
        return dpp
