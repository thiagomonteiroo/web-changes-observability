import html
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.telegram_bot import TelegramBot
from app.models.monitor import Monitor
from app.models.snapshot import Snapshot
from app.models.diff_record import DiffRecord

logger = logging.getLogger(__name__)

class TelegramService:
    BASE_URL = "https://api.telegram.org"

    @staticmethod
    def mask_token(token: str) -> str:
        """
        Masks the bot token for secure display (e.g. 123456:ABC...xyz).
        """
        if not token or len(token) < 12:
            return "******"
        return f"{token[:8]}...{token[-4:]}"

    @classmethod
    async def get_me(cls, token: str) -> Dict[str, Any]:
        """
        Queries Telegram getMe endpoint to validate the bot token.
        """
        url = f"{cls.BASE_URL}/bot{token.strip()}/getMe"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            data = res.json()
            if not res.is_success or not data.get("ok"):
                error_desc = data.get("description", f"Status {res.status_code}")
                raise ValueError(f"Token do Telegram inválido: {error_desc}")
            return data.get("result", {})

    @classmethod
    async def get_recent_chats(cls, token: str) -> List[Dict[str, Any]]:
        """
        Queries Telegram getUpdates to auto-detect recent chats (users, groups, channels).
        """
        url = f"{cls.BASE_URL}/bot{token.strip()}/getUpdates?limit=50"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            data = res.json()
            if not res.is_success or not data.get("ok"):
                error_desc = data.get("description", f"Status {res.status_code}")
                raise ValueError(f"Falha ao obter atualizações do bot: {error_desc}")

            updates = data.get("result", [])
            seen_chats = {}
            for upd in updates:
                msg = upd.get("message") or upd.get("channel_post") or upd.get("my_chat_member")
                if not msg:
                    continue
                chat = msg.get("chat")
                if not chat:
                    continue

                chat_id = str(chat.get("id"))
                chat_type = chat.get("type", "private")
                title = chat.get("title")
                first_name = chat.get("first_name", "")
                last_name = chat.get("last_name", "")
                username = chat.get("username")
                last_text = msg.get("text")

                display_name = title or f"{first_name} {last_name}".strip() or username or f"Chat {chat_id}"

                seen_chats[chat_id] = {
                    "chat_id": chat_id,
                    "title_or_name": display_name,
                    "type": chat_type,
                    "username": f"@{username}" if username else None,
                    "last_message": last_text[:60] if last_text else None,
                }

            return list(seen_chats.values())

    @classmethod
    async def send_message(
        cls,
        token: str,
        chat_id: str,
        text: str,
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = False
    ) -> Dict[str, Any]:
        """
        Sends a message to a Telegram chat/channel.
        """
        # Telegram max length is 4096 characters
        if len(text) > 4000:
            text = text[:3900] + "\n\n<i>[...conteúdo truncado para limite do Telegram]</i>"

        url = f"{cls.BASE_URL}/bot{token.strip()}/sendMessage"
        payload = {
            "chat_id": str(chat_id).strip(),
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload)
            data = res.json()
            if not res.is_success or not data.get("ok"):
                error_desc = data.get("description", f"Status {res.status_code}")
                raise ValueError(f"Falha ao enviar mensagem no Telegram: {error_desc}")
            return data.get("result", {})

    @classmethod
    async def send_test_message(cls, token: str, chat_id: str) -> Dict[str, Any]:
        """
        Validates token and sends a formatted test notification.
        """
        bot_info = await cls.get_me(token)
        bot_username = bot_info.get("username", "ObservabilityBot")
        bot_name = bot_info.get("first_name", "Bot de Observabilidade")

        now_str = datetime.now().strftime("%d/%m/%Y às %H:%M:%S")

        test_msg = (
            f"🤖 <b>Notificação de Teste - Conexão Ativa!</b>\n\n"
            f"Olá! O bot <b>{html.escape(bot_name)}</b> (<code>@{html.escape(bot_username)}</code>) "
            f"foi configurado com sucesso no <b>Web Changes Observability</b>.\n\n"
            f"🕒 <b>Data do Teste:</b> {now_str}\n"
            f"✅ <b>Status:</b> Pronto para receber alertas em tempo real de editais e páginas observadas!\n\n"
            f"<i>Sempre que uma alteração for detectada em seus sites cadastrados, você receberá a notificação completa por aqui.</i>"
        )

        sent_msg = await cls.send_message(
            token=token,
            chat_id=chat_id,
            text=test_msg,
            parse_mode="HTML"
        )

        return {
            "success": True,
            "message": "Mensagem de teste enviada com sucesso ao Telegram!",
            "bot_info": bot_info,
            "sent_message": sent_msg
        }

    @classmethod
    async def send_change_notification(
        cls,
        monitor: Monitor,
        snapshot: Snapshot,
        diff_record: DiffRecord
    ) -> List[Dict[str, Any]]:
        """
        Sends an alert notification to all active Telegram bots configured in the system.
        """
        async with async_session_maker() as session:
            result = await session.execute(
                select(TelegramBot).where(
                    TelegramBot.is_active == True,
                    TelegramBot.send_on_change == True
                )
            )
            active_bots = result.scalars().all()

        if not active_bots:
            logger.info("Nenhum bot do Telegram ativo configurado para envio de notificações.")
            return []

        # Parse new links
        added_links = []
        if diff_record.added_links:
            try:
                added_links = json.loads(diff_record.added_links) if isinstance(diff_record.added_links, str) else diff_record.added_links
            except Exception:
                added_links = []

        # Build documents section
        docs_section = ""
        doc_links = [l for l in added_links if l.get("is_document")]
        if doc_links:
            docs_section = "\n📎 <b>Novos Documentos Detectados:</b>\n"
            for doc in doc_links[:5]:
                title = html.escape(doc.get("title", "Documento"))
                url = html.escape(doc.get("url", "#"))
                ext = doc.get("extension", "").upper()
                docs_section += f"• <a href=\"{url}\">{title}</a> <code>[{ext}]</code>\n"
            if len(doc_links) > 5:
                docs_section += f"<i>...e mais {len(doc_links) - 5} documento(s)</i>\n"

        # Build clean diff snippet
        diff_lines = diff_record.diff_text.splitlines()
        meaningful_diff_lines = []
        for line in diff_lines:
            if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
                meaningful_diff_lines.append(line)

        diff_snippet = ""
        if meaningful_diff_lines:
            sample_lines = meaningful_diff_lines[:10]
            escaped_lines = "\n".join(html.escape(l) for l in sample_lines)
            diff_snippet = f"\n📝 <b>Resumo das Alterações:</b>\n<pre>{escaped_lines}</pre>\n"
            if len(meaningful_diff_lines) > 10:
                diff_snippet += f"<i>...(+{len(meaningful_diff_lines) - 10} linhas alteradas)</i>\n"

        now_str = (snapshot.created_at or datetime.utcnow()).strftime("%d/%m/%Y às %H:%M:%S")

        message = (
            f"🚨 <b>ALTERAÇÃO DETECTADA!</b> 🚨\n\n"
            f"📌 <b>Página:</b> {html.escape(monitor.name)}\n"
            f"🌐 <b>URL:</b> <a href=\"{html.escape(monitor.url)}\">{html.escape(monitor.url)}</a>\n"
            f"🔢 <b>Versão:</b> #{snapshot.change_number} ({monitor.total_changes}ª alteração detectada)\n"
            f"🕒 <b>Data/Hora:</b> {now_str}\n"
            f"{docs_section}"
            f"{diff_snippet}\n"
            f"👉 <i>Acesse o Dashboard para visualizar o Diff completo e confirmar a visualização!</i>"
        )

        dispatch_results = []
        for bot in active_bots:
            try:
                res = await cls.send_message(
                    token=bot.bot_token,
                    chat_id=bot.chat_id,
                    text=message,
                    parse_mode="HTML"
                )
                dispatch_results.append({"bot_id": bot.id, "status": "sent", "response": res})
                logger.info(f"Notificação Telegram enviada com sucesso para o bot {bot.name} (Chat {bot.chat_id}).")
            except Exception as e:
                logger.error(f"Erro ao enviar notificação Telegram via bot {bot.name} ({bot.id}): {e}")
                dispatch_results.append({"bot_id": bot.id, "status": "failed", "error": str(e)})

        return dispatch_results

telegram_service = TelegramService()
