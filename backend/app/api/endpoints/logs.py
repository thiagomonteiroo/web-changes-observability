from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.check_log import CheckLog
from app.models.monitor import Monitor
from app.schemas.check_log import CheckLogResponse

router = APIRouter()

@router.get("/logs", response_model=List[CheckLogResponse])
async def list_check_logs(
    monitor_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    query = select(CheckLog, Monitor.name.label("monitor_name")).outerjoin(Monitor, CheckLog.monitor_id == Monitor.id)
    if monitor_id is not None:
        query = query.where(CheckLog.monitor_id == monitor_id)
    query = query.order_by(desc(CheckLog.executed_at)).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    logs = []
    for log, mon_name in rows:
        logs.append(
            CheckLogResponse(
                id=log.id,
                monitor_id=log.monitor_id,
                monitor_name=mon_name or f"Monitor #{log.monitor_id}",
                status=log.status,
                http_status_code=log.http_status_code,
                response_time_ms=log.response_time_ms,
                error_message=log.error_message,
                executed_at=log.executed_at
            )
        )
    return logs

@router.get("/errors", response_model=List[CheckLogResponse])
async def list_error_logs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated endpoint for Error Center / Observability Failures.
    """
    query = (
        select(CheckLog, Monitor.name.label("monitor_name"))
        .outerjoin(Monitor, CheckLog.monitor_id == Monitor.id)
        .where(CheckLog.status == "error")
        .order_by(desc(CheckLog.executed_at))
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    errors = []
    for log, mon_name in rows:
        errors.append(
            CheckLogResponse(
                id=log.id,
                monitor_id=log.monitor_id,
                monitor_name=mon_name or f"Monitor #{log.monitor_id}",
                status=log.status,
                http_status_code=log.http_status_code,
                response_time_ms=log.response_time_ms,
                error_message=log.error_message,
                executed_at=log.executed_at
            )
        )
    return errors
