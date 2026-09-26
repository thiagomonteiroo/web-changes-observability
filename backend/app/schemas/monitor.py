from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, HttpUrl, Field

class MonitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nome de identificação do monitor")
    url: str = Field(..., description="URL a ser monitorada")
    css_selector: Optional[str] = Field(None, max_length=500, description="Seletor CSS focado (opcional)")
    schedule_type: str = Field("interval", description="'interval', 'daily_multi_times' ou 'periodic_days'")
    schedule_config: Dict[str, Any] = Field(
        default_factory=lambda: {"interval_hours": 6},
        description="Configuração do agendamento (ex: {'times': ['08:00', '12:00', '16:00', '20:00']} ou {'interval_hours': 6} ou {'every_n_days': 3, 'time': '09:00'})"
    )

class MonitorCreate(MonitorBase):
    pass

class MonitorUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    css_selector: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class MonitorResponse(BaseModel):
    id: int
    name: str
    url: str
    css_selector: Optional[str]
    schedule_type: str
    schedule_config: Dict[str, Any]
    is_active: bool
    total_changes: int
    has_unread_change: bool
    last_checked_at: Optional[datetime]
    next_check_at: Optional[datetime]
    last_status: str
    last_error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MonitorStats(BaseModel):
    total_monitors: int
    active_monitors: int
    monitors_with_unread_changes: int
    monitors_with_errors: int
    total_changes_detected: int
