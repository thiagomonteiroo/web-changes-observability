from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DiffRecordResponse(BaseModel):
    id: int
    monitor_id: int
    snapshot_id: int
    diff_text: str
    added_links: List[Dict[str, Any]]
    removed_links: List[Dict[str, Any]]
    is_acknowledged: bool
    acknowledged_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
