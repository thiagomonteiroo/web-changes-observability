import json
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.diff_record import DiffRecord
from app.models.monitor import Monitor
from app.schemas.diff_record import DiffRecordResponse

router = APIRouter()

def format_diff_response(d: DiffRecord) -> DiffRecordResponse:
    added = json.loads(d.added_links) if d.added_links else []
    removed = json.loads(d.removed_links) if d.removed_links else []
    return DiffRecordResponse(
        id=d.id,
        monitor_id=d.monitor_id,
        snapshot_id=d.snapshot_id,
        diff_text=d.diff_text,
        added_links=added,
        removed_links=removed,
        is_acknowledged=d.is_acknowledged,
        acknowledged_at=d.acknowledged_at,
        created_at=d.created_at
    )

@router.get("/monitors/{monitor_id}/diffs", response_model=List[DiffRecordResponse])
async def list_monitor_diffs(monitor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Lists all detected diff records for a given monitor, ordered from newest to oldest.
    """
    result = await db.execute(
        select(DiffRecord)
        .where(DiffRecord.monitor_id == monitor_id)
        .order_by(desc(DiffRecord.created_at))
    )
    diffs = result.scalars().all()
    return [format_diff_response(d) for d in diffs]

@router.get("/diffs/{diff_id}", response_model=DiffRecordResponse)
async def get_diff_detail(diff_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiffRecord).where(DiffRecord.id == diff_id))
    diff = result.scalar_one_or_none()
    if not diff:
        raise HTTPException(status_code=404, detail="Registro de alteração não encontrado")
    return format_diff_response(diff)

@router.post("/diffs/{diff_id}/acknowledge", response_model=DiffRecordResponse)
async def acknowledge_single_diff(diff_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiffRecord).where(DiffRecord.id == diff_id))
    diff = result.scalar_one_or_none()
    if not diff:
        raise HTTPException(status_code=404, detail="Registro de alteração não encontrado")

    diff.is_acknowledged = True
    diff.acknowledged_at = datetime.utcnow()

    # Check if there are any remaining unacknowledged diffs for this monitor
    other_unack = await db.execute(
        select(DiffRecord)
        .where(DiffRecord.monitor_id == diff.monitor_id, DiffRecord.is_acknowledged == False, DiffRecord.id != diff_id)
    )
    if not other_unack.scalars().first():
        # No more unacknowledged diffs: clear monitor's unread flag
        mon_res = await db.execute(select(Monitor).where(Monitor.id == diff.monitor_id))
        mon = mon_res.scalar_one_or_none()
        if mon:
            mon.has_unread_change = False
            if mon.last_status == "changed":
                mon.last_status = "ok"

    await db.commit()
    await db.refresh(diff)
    return format_diff_response(diff)
