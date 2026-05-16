from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.deps import get_db, require_admin, TokenPayload
from app.modules.lifecycle import schemas, services

router = APIRouter(prefix="/dpp", tags=["Lifecycle"])

@router.get("/{id}/lifecycle", response_model=List[schemas.LifecycleEvent])
async def get_lifecycle_events(id: UUID, db: AsyncSession = Depends(get_db)):
    return await services.LifecycleService.get_events_by_dpp(db, id)

@router.post("/{id}/lifecycle", response_model=schemas.LifecycleEvent)
async def add_lifecycle_event(
    id: UUID,
    event: schemas.LifecycleEventCreate,
    db: AsyncSession = Depends(get_db)
):
    if id != event.dpp_id:
        raise HTTPException(status_code=400, detail="DPP ID mismatch")
    return await services.LifecycleService.create_event(db, event)

@router.post("/{id}/archive")
async def archive_dpp(
    id: UUID,
    req: schemas.ArchiveRecallRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_admin)
):
    dpp = await services.LifecycleService.archive_dpp(db, id, req.reason, UUID(token.sub))
    if not dpp:
        raise HTTPException(status_code=404, detail="DPP not found")
    return {"message": "DPP archived successfully", "status": dpp.dpp_status}

@router.post("/{id}/recall")
async def recall_dpp(
    id: UUID,
    req: schemas.ArchiveRecallRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_admin)
):
    dpp = await services.LifecycleService.recall_dpp(db, id, req.reason, UUID(token.sub))
    if not dpp:
        raise HTTPException(status_code=404, detail="DPP not found")
    return {"message": "DPP recalled successfully", "status": dpp.dpp_status}
