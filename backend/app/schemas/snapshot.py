from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SnapshotResponse(BaseModel):
    id: int
    monitor_id: int
    content_hash: str
    cleaned_text: str
    extracted_links: List[Dict[str, Any]]
    change_number: int
    created_at: datetime

    class Config:
        from_attributes = True
