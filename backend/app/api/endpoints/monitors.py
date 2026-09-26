import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.models.monitor import Monitor
from app.models.diff_record import DiffRecord
from app.schemas.monitor import MonitorCreate, MonitorUpdate, MonitorResponse, MonitorStats
from app.services.scheduler import scheduler_service
from app.services.scraper import ScraperService

router = APIRouter()

def format_monitor_response(m: Monitor) -> MonitorResponse:
    config = {}
    if m.schedule_config:
        try:
            config = json.loads(m.schedule_config) if isinstance(m.schedule_config, str) else m.schedule_config
        except Exception:
            config = {}
    return MonitorResponse(
        id=m.id,
        name=m.name,
        url=m.url,
        css_selector=m.css_selector,
        schedule_type=m.schedule_type,
        schedule_config=config,
        is_active=m.is_active,
        total_changes=m.total_changes,
        has_unread_change=m.has_unread_change,
        last_checked_at=m.last_checked_at,
        next_check_at=m.next_check_at,
        last_status=m.last_status,
        last_error_message=m.last_error_message,
        created_at=m.created_at,
        updated_at=m.updated_at
    )

@router.get("/stats", response_model=MonitorStats)
async def get_monitor_stats(db: AsyncSession = Depends(get_db)):
    """
    Returns global metrics for the dashboard KPIs.
    """
    result = await db.execute(select(Monitor))
    monitors = result.scalars().all()

    total = len(monitors)
    active = sum(1 for m in monitors if m.is_active)
    unread = sum(1 for m in monitors if m.has_unread_change)
    errors = sum(1 for m in monitors if m.last_status == "error")
    total_changes = sum(m.total_changes for m in monitors)

    return MonitorStats(
        total_monitors=total,
        active_monitors=active,
        monitors_with_unread_changes=unread,
        monitors_with_errors=errors,
        total_changes_detected=total_changes
    )

@router.get("", response_model=List[MonitorResponse])
async def list_monitors(
    only_unread: bool = Query(False, description="Filtrar apenas monitores com alterações pendentes de confirmação"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all monitors, optionally filtered by unread changes.
    """
    query = select(Monitor).order_by(desc(Monitor.has_unread_change), desc(Monitor.updated_at))
    if only_unread:
        query = query.where(Monitor.has_unread_change == True)

    result = await db.execute(query)
    monitors = result.scalars().all()
    return [format_monitor_response(m) for m in monitors]

@router.post("/test-url")
async def test_url_preview(data: dict):
    """
    Tests scraping a URL and selector before saving the monitor.
    """
    url = data.get("url")
    css_selector = data.get("css_selector")
    if not url:
        raise HTTPException(status_code=400, detail="URL é obrigatória.")

    try:
        html, status_code, elapsed_ms = await ScraperService.fetch_page(url)
        extracted = ScraperService.clean_and_extract(html, url, css_selector)
        return {
            "success": True,
            "status_code": status_code,
            "response_time_ms": elapsed_ms,
            "preview_text": extracted["cleaned_text"][:600] + ("..." if len(extracted["cleaned_text"]) > 600 else ""),
            "total_links_found": extracted["total_links"],
            "sample_links": extracted["extracted_links"][:5]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("", response_model=MonitorResponse)
async def create_monitor(payload: MonitorCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new monitor, schedules its checks, and runs an initial check.
    """
    schedule_cfg_str = json.dumps(payload.schedule_config) if payload.schedule_config else "{}"
    
    monitor = Monitor(
        name=payload.name.strip(),
        url=str(payload.url).strip(),
        css_selector=payload.css_selector.strip() if payload.css_selector else None,
        schedule_type=payload.schedule_type,
        schedule_config=schedule_cfg_str,
        is_active=True,
        total_changes=0,
        has_unread_change=False,
        last_status="pending"
    )
    db.add(monitor)
    await db.commit()
    await db.refresh(monitor)

    # Schedule the recurring job
    scheduler_service.schedule_monitor(monitor)
    monitor.next_check_at = scheduler_service.compute_next_run(monitor.id)
    await db.commit()

    # Trigger immediate initial check
    await scheduler_service.execute_check(monitor.id)
    await db.refresh(monitor)

    return format_monitor_response(monitor)

@router.get("/{monitor_id}", response_model=MonitorResponse)
async def get_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor não encontrado")
    return format_monitor_response(monitor)

@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(monitor_id: int, payload: MonitorUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor não encontrado")

    if payload.name is not None:
        monitor.name = payload.name.strip()
    if payload.url is not None:
        monitor.url = str(payload.url).strip()
    if payload.css_selector is not None:
        monitor.css_selector = payload.css_selector.strip() if payload.css_selector else None
    if payload.schedule_type is not None:
        monitor.schedule_type = payload.schedule_type
    if payload.schedule_config is not None:
        monitor.schedule_config = json.dumps(payload.schedule_config)
    if payload.is_active is not None:
        monitor.is_active = payload.is_active

    monitor.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(monitor)

    # Reschedule
    scheduler_service.schedule_monitor(monitor)
    monitor.next_check_at = scheduler_service.compute_next_run(monitor.id)
    await db.commit()
    await db.refresh(monitor)

    return format_monitor_response(monitor)

@router.delete("/{monitor_id}")
async def delete_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor não encontrado")

    # Stop scheduler jobs for this monitor
    job_prefix = f"monitor_{monitor.id}"
    for job in scheduler_service.scheduler.get_jobs():
        if job.id.startswith(job_prefix):
            scheduler_service.scheduler.remove_job(job.id)

    await db.delete(monitor)
    await db.commit()
    return {"message": "Monitor excluído com sucesso", "id": monitor_id}

@router.post("/{monitor_id}/check-now")
async def trigger_check_now(monitor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Manually triggers an immediate check for this monitor.
    """
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor não encontrado")

    res = await scheduler_service.execute_check(monitor_id)
    await db.refresh(monitor)
    return {
        "message": "Verificação concluída",
        "result": res,
        "monitor": format_monitor_response(monitor)
    }

@router.post("/{monitor_id}/acknowledge")
async def acknowledge_monitor_changes(monitor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Confirms viewing the change ("Confirmar visualização / Marcar como visto"),
    clearing the pending unread alert.
    """
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor não encontrado")

    now = datetime.utcnow()
    monitor.has_unread_change = False
    if monitor.last_status == "changed":
        monitor.last_status = "ok"

    # Also mark all unacknowledged DiffRecords as acknowledged
    diff_res = await db.execute(
        select(DiffRecord)
        .where(DiffRecord.monitor_id == monitor_id, DiffRecord.is_acknowledged == False)
    )
    diffs = diff_res.scalars().all()
    for d in diffs:
        d.is_acknowledged = True
        d.acknowledged_at = now

    await db.commit()
    await db.refresh(monitor)
    return {
        "message": "Alterações confirmadas com sucesso",
        "monitor": format_monitor_response(monitor)
    }
