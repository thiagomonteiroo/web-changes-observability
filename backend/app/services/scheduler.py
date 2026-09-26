import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, desc
from app.core.database import async_session_maker
from app.models.monitor import Monitor
from app.models.snapshot import Snapshot
from app.models.diff_record import DiffRecord
from app.models.check_log import CheckLog
from app.services.scraper import ScraperService
from app.services.diff_engine import DiffEngine
from app.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("APScheduler inicializado com sucesso.")

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("APScheduler finalizado.")

    async def reload_all_monitors(self):
        """
        Loads all active monitors from SQLite and schedules their jobs.
        """
        async with async_session_maker() as session:
            result = await session.execute(select(Monitor).where(Monitor.is_active == True))
            monitors = result.scalars().all()
            for monitor in monitors:
                self.schedule_monitor(monitor)

    def schedule_monitor(self, monitor: Monitor):
        """
        Configures APScheduler jobs for a monitor according to its schedule_type and schedule_config.
        """
        job_prefix = f"monitor_{monitor.id}"
        
        # Remove any existing jobs for this monitor
        for job in self.scheduler.get_jobs():
            if job.id.startswith(job_prefix):
                self.scheduler.remove_job(job.id)

        if not monitor.is_active:
            return

        config: Dict[str, Any] = {}
        try:
            config = json.loads(monitor.schedule_config) if isinstance(monitor.schedule_config, str) else monitor.schedule_config
        except Exception:
            config = {"interval_hours": 6}

        schedule_type = monitor.schedule_type or "interval"

        if schedule_type == "daily_multi_times":
            # e.g. {"times": ["08:00", "12:00", "16:00", "20:00"]}
            times: List[str] = config.get("times", ["09:00"])
            for idx, t in enumerate(times):
                try:
                    parts = t.split(":")
                    hour = int(parts[0])
                    minute = int(parts[1]) if len(parts) > 1 else 0
                    job_id = f"{job_prefix}_daily_{idx}"
                    self.scheduler.add_job(
                        self.execute_check,
                        CronTrigger(hour=hour, minute=minute),
                        args=[monitor.id],
                        id=job_id,
                        replace_existing=True
                    )
                except Exception as e:
                    logger.error(f"Erro ao agendar horário '{t}' para o monitor {monitor.id}: {e}")

        elif schedule_type == "periodic_days":
            # e.g. {"every_n_days": 3, "time": "09:00"}
            every_n_days = int(config.get("every_n_days", 3))
            t = config.get("time", "09:00")
            try:
                parts = t.split(":")
                hour = int(parts[0])
                minute = int(parts[1]) if len(parts) > 1 else 0
                job_id = f"{job_prefix}_periodic"
                # Using interval in days with start_date aligned to time
                self.scheduler.add_job(
                    self.execute_check,
                    IntervalTrigger(days=every_n_days, start_date=datetime.now().replace(hour=hour, minute=minute, second=0)),
                    args=[monitor.id],
                    id=job_id,
                    replace_existing=True
                )
            except Exception as e:
                logger.error(f"Erro ao agendar periodicidade {every_n_days} dias para monitor {monitor.id}: {e}")

        else:
            # interval (default)
            interval_hours = int(config.get("interval_hours", 6))
            interval_minutes = int(config.get("interval_minutes", 0))
            if interval_hours <= 0 and interval_minutes <= 0:
                interval_hours = 6
            job_id = f"{job_prefix}_interval"
            self.scheduler.add_job(
                self.execute_check,
                IntervalTrigger(hours=interval_hours, minutes=interval_minutes),
                args=[monitor.id],
                id=job_id,
                replace_existing=True
            )

    def compute_next_run(self, monitor_id: int) -> Optional[datetime]:
        """
        Gets the closest next execution time among all jobs for a monitor.
        """
        job_prefix = f"monitor_{monitor_id}"
        next_times = []
        try:
            for job in self.scheduler.get_jobs():
                if job.id.startswith(job_prefix):
                    nxt = getattr(job, "next_run_time", None)
                    if nxt:
                        next_times.append(nxt)
        except Exception:
            pass

        if next_times:
            closest = min(next_times)
            return closest.replace(tzinfo=None) if closest.tzinfo else closest
        return None

    async def execute_check(self, monitor_id: int) -> Dict[str, Any]:
        """
        Executes a scrape and comparison for the given monitor.
        """
        async with async_session_maker() as session:
            result = await session.execute(select(Monitor).where(Monitor.id == monitor_id))
            monitor = result.scalar_one_or_none()
            if not monitor:
                logger.warning(f"Monitor {monitor_id} não encontrado para execução.")
                return {"status": "not_found"}

            now = datetime.utcnow()
            status_result = "ok"
            http_status = None
            response_ms = None
            error_msg = None

            created_snapshot: Optional[Snapshot] = None
            created_diff: Optional[DiffRecord] = None

            try:
                # 1. Fetch page
                html, http_status, response_ms = await ScraperService.fetch_page(monitor.url)
                
                # 2. Extract and clean
                extracted = ScraperService.clean_and_extract(
                    html=html,
                    base_url=monitor.url,
                    css_selector=monitor.css_selector
                )

                cleaned_text = extracted["cleaned_text"]
                extracted_links = extracted["extracted_links"]
                new_hash = extracted["content_hash"]

                # 3. Get latest snapshot
                snap_res = await session.execute(
                    select(Snapshot)
                    .where(Snapshot.monitor_id == monitor.id)
                    .order_by(desc(Snapshot.change_number))
                    .limit(1)
                )
                latest_snapshot = snap_res.scalar_one_or_none()

                if not latest_snapshot:
                    # First time snapshot!
                    new_snapshot = Snapshot(
                        monitor_id=monitor.id,
                        content_hash=new_hash,
                        cleaned_text=cleaned_text,
                        extracted_links=json.dumps(extracted_links, ensure_ascii=False),
                        change_number=0,
                        created_at=now
                    )
                    session.add(new_snapshot)
                    monitor.last_status = "ok"
                    monitor.last_error_message = None
                    status_result = "success_initial"
                else:
                    # Check for changes
                    if new_hash != latest_snapshot.content_hash:
                        # Changes detected!
                        diff_text = DiffEngine.generate_diff(
                            old_text=latest_snapshot.cleaned_text,
                            new_text=cleaned_text,
                            from_label=f"Versão #{latest_snapshot.change_number}",
                            to_label=f"Versão #{latest_snapshot.change_number + 1}"
                        )
                        
                        old_links = json.loads(latest_snapshot.extracted_links) if latest_snapshot.extracted_links else []
                        added_links, removed_links = DiffEngine.compare_links(old_links, extracted_links)

                        next_change_num = latest_snapshot.change_number + 1
                        new_snapshot = Snapshot(
                            monitor_id=monitor.id,
                            content_hash=new_hash,
                            cleaned_text=cleaned_text,
                            extracted_links=json.dumps(extracted_links, ensure_ascii=False),
                            change_number=next_change_num,
                            created_at=now
                        )
                        session.add(new_snapshot)
                        await session.flush() # get new_snapshot.id

                        diff_record = DiffRecord(
                            monitor_id=monitor.id,
                            snapshot_id=new_snapshot.id,
                            diff_text=diff_text,
                            added_links=json.dumps(added_links, ensure_ascii=False),
                            removed_links=json.dumps(removed_links, ensure_ascii=False),
                            is_acknowledged=False,
                            created_at=now
                        )
                        session.add(diff_record)

                        created_snapshot = new_snapshot
                        created_diff = diff_record

                        monitor.total_changes += 1
                        monitor.has_unread_change = True
                        monitor.last_status = "changed"
                        monitor.last_error_message = None
                        status_result = "success_changed"
                    else:
                        # Content is unchanged
                        if not monitor.has_unread_change:
                            monitor.last_status = "ok"
                        monitor.last_error_message = None
                        status_result = "success_no_change"

            except Exception as e:
                logger.error(f"Erro ao verificar monitor {monitor.id} ({monitor.url}): {e}")
                error_msg = str(e)
                monitor.last_status = "error"
                monitor.last_error_message = error_msg
                status_result = "error"

            # 4. Save check log
            log = CheckLog(
                monitor_id=monitor.id,
                status=status_result,
                http_status_code=http_status,
                response_time_ms=response_ms,
                error_message=error_msg,
                executed_at=now
            )
            session.add(log)

            monitor.last_checked_at = now
            monitor.next_check_at = self.compute_next_run(monitor.id)
            await session.commit()

            # 5. Trigger Telegram notifications if changes detected
            if status_result == "success_changed" and created_snapshot and created_diff:
                try:
                    await telegram_service.send_change_notification(
                        monitor=monitor,
                        snapshot=created_snapshot,
                        diff_record=created_diff
                    )
                except Exception as t_err:
                    logger.error(f"Erro ao disparar notificações do Telegram para o monitor {monitor.id}: {t_err}")

            return {
                "monitor_id": monitor.id,
                "status": status_result,
                "http_status": http_status,
                "response_ms": response_ms,
                "error": error_msg,
                "has_unread_change": monitor.has_unread_change,
                "total_changes": monitor.total_changes
            }

scheduler_service = SchedulerService()
