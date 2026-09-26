from datetime import datetime
from typing import Optional
from sqlalchemy import Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class DiffRecord(Base):
    __tablename__ = "diff_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    monitor_id: Mapped[int] = mapped_column(Integer, ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_id: Mapped[int] = mapped_column(Integer, ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False, index=True)
    
    diff_text: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON list of newly added links (e.g. new published files/edits)
    added_links: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    # JSON list of removed links
    removed_links: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    
    # Acknowledgment flow ("Confirmar visualização / Marcar como visto")
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="diff_records")
    snapshot: Mapped["Snapshot"] = relationship("Snapshot", back_populates="diff_record")
