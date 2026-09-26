from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class TelegramBotBase(BaseModel):
    name: str
    bot_token: str
    chat_id: str
    is_active: bool = True
    send_on_change: bool = True
    send_on_error: bool = False

class TelegramBotCreate(TelegramBotBase):
    pass

class TelegramBotUpdate(BaseModel):
    name: Optional[str] = None
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    is_active: Optional[bool] = None
    send_on_change: Optional[bool] = None
    send_on_error: Optional[bool] = None

class TelegramBotResponse(BaseModel):
    id: int
    name: str
    bot_token: str
    masked_token: str
    chat_id: str
    is_active: bool
    send_on_change: bool
    send_on_error: bool
    last_test_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TelegramTestRequest(BaseModel):
    bot_token: str
    chat_id: str

class TelegramTestResponse(BaseModel):
    success: bool
    message: str
    bot_info: Optional[dict] = None

class TelegramDetectChatRequest(BaseModel):
    bot_token: str

class TelegramDetectedChat(BaseModel):
    chat_id: str
    title_or_name: str
    type: str
    username: Optional[str] = None
    last_message: Optional[str] = None

class TelegramDetectChatResponse(BaseModel):
    success: bool
    bot_username: Optional[str] = None
    chats: List[TelegramDetectedChat] = []
    message: Optional[str] = None
