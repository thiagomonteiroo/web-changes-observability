from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CheckLogResponse(BaseModel):
    id: int
    monitor_id: int
    monitor_name: Optional[str] = None
    status: str
    http_status_code: Optional[int]
    response_time_ms: Optional[int]
    error_message: Optional[str]
    executed_at: datetime

    class Config:
        from_attributes = True
