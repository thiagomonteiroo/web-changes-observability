from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.telegram_bot import TelegramBot
from app.schemas.telegram_bot import (
    TelegramBotCreate,
    TelegramBotUpdate,
    TelegramBotResponse,
    TelegramTestRequest,
    TelegramTestResponse,
    TelegramDetectChatRequest,
    TelegramDetectChatResponse,
    TelegramDetectedChat,
)
from app.services.telegram_service import telegram_service

router = APIRouter()

def format_bot_response(bot: TelegramBot) -> TelegramBotResponse:
    return TelegramBotResponse(
        id=bot.id,
        name=bot.name,
        bot_token=bot.bot_token,
        masked_token=telegram_service.mask_token(bot.bot_token),
        chat_id=bot.chat_id,
        is_active=bot.is_active,
        send_on_change=bot.send_on_change,
        send_on_error=bot.send_on_error,
        last_test_at=bot.last_test_at,
        created_at=bot.created_at,
        updated_at=bot.updated_at,
    )

@router.get("/bots", response_model=List[TelegramBotResponse])
async def list_telegram_bots(db: AsyncSession = Depends(get_db)):
    """
    Lists all configured Telegram bots.
    """
    result = await db.execute(select(TelegramBot).order_by(desc(TelegramBot.is_active), desc(TelegramBot.created_at)))
    bots = result.scalars().all()
    return [format_bot_response(b) for b in bots]

@router.post("/bots", response_model=TelegramBotResponse)
async def create_telegram_bot(payload: TelegramBotCreate, db: AsyncSession = Depends(get_db)):
    """
    Registers a new Telegram bot after validating the token.
    """
    clean_token = payload.bot_token.strip()
    clean_chat_id = payload.chat_id.strip()

    # Validate token with Telegram
    try:
        await telegram_service.get_me(clean_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token do BotFather inválido: {str(e)}")

    bot = TelegramBot(
        name=payload.name.strip(),
        bot_token=clean_token,
        chat_id=clean_chat_id,
        is_active=payload.is_active,
        send_on_change=payload.send_on_change,
        send_on_error=payload.send_on_error,
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return format_bot_response(bot)

@router.get("/bots/{bot_id}", response_model=TelegramBotResponse)
async def get_telegram_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TelegramBot).where(TelegramBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot do Telegram não encontrado.")
    return format_bot_response(bot)

@router.put("/bots/{bot_id}", response_model=TelegramBotResponse)
async def update_telegram_bot(
    bot_id: int,
    payload: TelegramBotUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TelegramBot).where(TelegramBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot do Telegram não encontrado.")

    if payload.name is not None:
        bot.name = payload.name.strip()
    if payload.bot_token is not None:
        clean_token = payload.bot_token.strip()
        try:
            await telegram_service.get_me(clean_token)
            bot.bot_token = clean_token
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Token inválido: {str(e)}")
    if payload.chat_id is not None:
        bot.chat_id = payload.chat_id.strip()
    if payload.is_active is not None:
        bot.is_active = payload.is_active
    if payload.send_on_change is not None:
        bot.send_on_change = payload.send_on_change
    if payload.send_on_error is not None:
        bot.send_on_error = payload.send_on_error

    bot.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(bot)
    return format_bot_response(bot)

@router.delete("/bots/{bot_id}")
async def delete_telegram_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TelegramBot).where(TelegramBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot do Telegram não encontrado.")

    await db.delete(bot)
    await db.commit()
    return {"message": "Bot do Telegram removido com sucesso.", "id": bot_id}

@router.post("/test", response_model=TelegramTestResponse)
async def test_bot_connection(payload: TelegramTestRequest):
    """
    Sends a test message with token and chat_id without requiring it to be saved yet.
    """
    try:
        res = await telegram_service.send_test_message(payload.bot_token, payload.chat_id)
        return TelegramTestResponse(
            success=True,
            message="Mensagem de teste enviada com sucesso! Verifique seu aplicativo do Telegram.",
            bot_info=res.get("bot_info")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bots/{bot_id}/test", response_model=TelegramTestResponse)
async def test_existing_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    """
    Sends a test message using a saved bot configuration and updates last_test_at.
    """
    result = await db.execute(select(TelegramBot).where(TelegramBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot do Telegram não encontrado.")

    try:
        res = await telegram_service.send_test_message(bot.bot_token, bot.chat_id)
        bot.last_test_at = datetime.utcnow()
        await db.commit()
        return TelegramTestResponse(
            success=True,
            message=f"Mensagem de teste enviada com sucesso para {bot.name}!",
            bot_info=res.get("bot_info")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/detect-chat", response_model=TelegramDetectChatResponse)
async def detect_telegram_chat(payload: TelegramDetectChatRequest):
    """
    Retrieves recent chats that sent /start or messages to the bot via getUpdates.
    """
    clean_token = payload.bot_token.strip()
    try:
        bot_info = await telegram_service.get_me(clean_token)
        bot_username = bot_info.get("username")
        raw_chats = await telegram_service.get_recent_chats(clean_token)
        
        detected = [TelegramDetectedChat(**c) for c in raw_chats]
        msg = f"Detectado(s) {len(detected)} chat(s) recente(s)." if detected else (
            f"Nenhum chat detectado ainda. Abra o Telegram, pesquise por @{bot_username} e envie /start, depois tente novamente!"
        )
        return TelegramDetectChatResponse(
            success=True,
            bot_username=bot_username,
            chats=detected,
            message=msg
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
