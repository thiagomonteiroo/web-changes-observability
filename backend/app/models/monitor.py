from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    css_selector: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Schedule: "interval" | "daily_multi_times" | "periodic_days"
    schedule_type: Mapped[str] = mapped_column(String(50), default="interval", nullable=False)
    # JSON string containing configuration details, e.g. {"interval_hours": 6} or {"times": ["08:00", "12:00", "16:00", "20:00"]}
    schedule_config: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Metrics and Alerts
    total_changes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    has_unread_change: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_check_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Status: "pending", "ok", "changed", "error"
    last_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    last_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    snapshots: Mapped[List["Snapshot"]] = relationship("Snapshot", back_populates="monitor", cascade="all, delete-orphan")
    diff_records: Mapped[List["DiffRecord"]] = relationship("DiffRecord", back_populates="monitor", cascade="all, delete-orphan")
    check_logs: Mapped[List["CheckLog"]] = relationship("CheckLog", back_populates="monitor", cascade="all, delete-orphan")
