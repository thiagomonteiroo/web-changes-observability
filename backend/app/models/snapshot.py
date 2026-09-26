from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    monitor_id: Mapped[int] = mapped_column(Integer, ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    cleaned_text: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON list of detected links/documents: [{"title": "Edital...", "url": "...", "ext": "pdf"}]
    extracted_links: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    
    change_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="snapshots")
    diff_record: Mapped[Optional["DiffRecord"]] = relationship("DiffRecord", back_populates="snapshot", uselist=False, cascade="all, delete-orphan")
