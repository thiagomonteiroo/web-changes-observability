"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  ArrowLeft,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Power,
  Search,
  MessageSquare,
  Zap,
} from "lucide-react";

import { TelegramBot, TelegramDetectedChat } from "@/lib/types";
import { api } from "@/lib/api";

export default function TelegramBotsPage() {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formChatId, setFormChatId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSendOnChange, setFormSendOnChange] = useState(true);
  const [formSendOnError, setFormSendOnError] = useState(false);

  // Actions / Async States
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Chat Detection State
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedChats, setDetectedChats] = useState<TelegramDetectedChat[]>([]);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  // Testing per-card
  const [testingBotId, setTestingBotId] = useState<number | null>(null);

  // Guide expand state
  const [isGuideOpen, setIsGuideOpen] = useState(true);

  const loadBots = useCallback(async () => {
    try {
      const data = await api.getTelegramBots();
      setBots(data);
    } catch (err) {
      console.error("Erro ao carregar bots do Telegram:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBots();
  };

  const handleOpenAdd = () => {
    setEditingBot(null);
    setFormName("");
    setFormToken("");
    setFormChatId("");
    setFormIsActive(true);
    setFormSendOnChange(true);
    setFormSendOnError(false);
    setTestResult(null);
    setDetectedChats([]);
    setDetectionMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bot: TelegramBot) => {
    setEditingBot(bot);
    setFormName(bot.name);
    setFormToken(bot.bot_token);
    setFormChatId(bot.chat_id);
    setFormIsActive(bot.is_active);
    setFormSendOnChange(bot.send_on_change);
    setFormSendOnError(bot.send_on_error);
    setTestResult(null);
    setDetectedChats([]);
    setDetectionMessage(null);
    setIsModalOpen(true);
  };

  const handleDetectChat = async () => {
    if (!formToken.trim()) {
      alert("Por favor, informe primeiro o Token do Bot gerado pelo @BotFather.");
      return;
    }

    setIsDetecting(true);
    setDetectedChats([]);
    setDetectionMessage(null);

    try {
      const res = await api.detectTelegramChat(formToken.trim());
      setDetectedChats(res.chats);
      setDetectionMessage(res.message);
      if (res.chats.length === 1) {
        setFormChatId(res.chats[0].chat_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDetectionMessage(`Falha ao detectar: ${msg}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestModal = async () => {
    if (!formToken.trim() || !formChatId.trim()) {
      alert("Informe o Token do Bot e o Chat ID para testar o envio.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testTelegramBot(formToken.trim(), formChatId.trim());
      setTestResult({ success: true, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formToken.trim() || !formChatId.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios (Nome, Token e Chat ID).");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBot) {
        await api.updateTelegramBot(editingBot.id, {
          name: formName.trim(),
          bot_token: formToken.trim(),
          chat_id: formChatId.trim(),
          is_active: formIsActive,
          send_on_change: formSendOnChange,
          send_on_error: formSendOnError,
        });
      } else {
        await api.createTelegramBot({
          name: formName.trim(),
          bot_token: formToken.trim(),
          chat_id: formChatId.trim(),
          is_active: formIsActive,
          send_on_change: formSendOnChange,
          send_on_error: formSendOnError,
        });
      }

      setIsModalOpen(false);
      await loadBots();
    } catch (err: unknown) {
      alert("Erro ao salvar bot: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (bot: TelegramBot) => {
    try {
      await api.updateTelegramBot(bot.id, { is_active: !bot.is_active });
      await loadBots();
    } catch (err: unknown) {
      alert("Erro ao alterar status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleTestExisting = async (botId: number) => {
    setTestingBotId(botId);
    try {
      const res = await api.testExistingTelegramBot(botId);
      alert("✅ " + res.message);
      await loadBots();
    } catch (err: unknown) {
      alert("❌ Falha no envio: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTestingBotId(null);
    }
  };

  const handleDeleteBot = async (bot: TelegramBot) => {
    if (!confirm(`Tem certeza que deseja remover o bot "${bot.name}"?`)) return;
    try {
      await api.deleteTelegramBot(bot.id);
      await loadBots();
    } catch (err: unknown) {
      alert("Erro ao excluir bot: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const activeBotsCount = bots.filter((b) => b.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Painel</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Notificações via Telegram
                  {activeBotsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {activeBotsCount} ativo{activeBotsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Envio automático de alertas e novos editais para chats, grupos ou canais.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Conectar Bot</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Step-by-Step BotFather Guide Card */}
        <div className="bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/60 border border-sky-100 dark:border-sky-900/40 rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Como criar seu Bot no Telegram em 1 minuto utilizando o @BotFather
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Os bots do Telegram são gratuitos, seguros e criados diretamente pelo bot oficial da equipe do Telegram.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              {isGuideOpen ? "Recolher Guia" : "Ver Passo a Passo"}
            </button>
          </div>

          {isGuideOpen && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4 pt-5 border-t border-sky-100/80 dark:border-slate-800">
              <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 relative">
                <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Abra o @BotFather
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                  Pesquise por <b>@BotFather</b> no Telegram ou clique no link oficial verificado.
                </p>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <span>Abrir @BotFather</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 relative">
                <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Envie /newbot
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Digite <code>/newbot</code>, dê um nome (ex: <i>Monitor Editais</i>) e um username terminando em <code>bot</code>.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 relative">
                <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Copie o Token da API
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  O BotFather responderá com o Token HTTP API (ex: <code>123456:ABC-DEF...</code>). Guarde este código.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 relative">
                <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Inicie e Conecte
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Abra a conversa do seu novo bot, envie <code>/start</code> e use o botão <b>Detectar Chat ID</b> para preenchimento com 1 clique!
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Documentação Oficial:</span>
            <a
              href="https://core.telegram.org/bots"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 underline"
            >
              <span>Telegram Bots Overview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://core.telegram.org/bots/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 underline"
            >
              <span>Telegram Bot API Reference</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Configured Bots List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Bots e Destinos Configurados ({bots.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sempre que uma alteração for detectada em qualquer página observada, a notificação com os novos editais e links será enviada para todos os bots ativos.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Carregando bots cadastrados...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Nenhum Bot do Telegram Conectado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                Receba alertas instantâneos no seu celular ou computador sempre que uma nova publicação, edital ou convocação for publicada nos sites que você monitora.
              </p>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeiro Bot</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                    bot.is_active
                      ? "border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800"
                      : "border-slate-200/60 dark:border-slate-800/60 opacity-75"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                            bot.is_active
                              ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {bot.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Chat ID: {bot.chat_id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bot.is_active
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {bot.is_active ? "Ativo" : "Pausado"}
                      </span>
                    </div>

                    {/* Bot Details */}
                    <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Token Mascarado:</span>
                        <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          {bot.masked_token}
                        </code>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Alertas de Mudança:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {bot.send_on_change ? "Sim ✅" : "Não ❌"}
                        </span>
                      </div>

                      {bot.last_test_at && (
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span>Último Teste:</span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-300">
                            {new Date(bot.last_test_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleActive(bot)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        bot.is_active
                          ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      }`}
                      title={bot.is_active ? "Pausar envio de notificações" : "Ativar envio de notificações"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{bot.is_active ? "Pausar" : "Ativar"}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestExisting(bot.id)}
                        disabled={testingBotId === bot.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                        title="Enviar mensagem de teste agora para este bot"
                      >
                        <Send className={`w-3 h-3 ${testingBotId === bot.id ? "animate-pulse" : ""}`} />
                        <span>{testingBotId === bot.id ? "Enviando..." : "Testar"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(bot)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar configurações"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteBot(bot)}
                        className="p-1.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        title="Excluir bot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Adicionar / Editar Bot */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingBot ? "Editar Bot do Telegram" : "Conectar Bot do Telegram"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Utilize o token oficial gerado no @BotFather
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBot} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Nome do Destino */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Identificador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Meu Telegram Pessoal, Canal de Editais, Grupo Concurso"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Token do BotFather */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Token da API do Bot <span className="text-red-500">*</span>
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <span>Gerar no @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Código de acesso secreto fornecido pelo @BotFather ao criar o bot.
                </p>
              </div>

              {/* Chat ID & Auto-Detect */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chat ID do Destinatário <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 987654321 ou @meucanal"
                    value={formChatId}
                    onChange={(e) => setFormChatId(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleDetectChat}
                    disabled={isDetecting || !formToken.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`} />
                    <span>{isDetecting ? "Buscando..." : "Detectar Chat ID"}</span>
                  </button>
                </div>

                {detectionMessage && (
                  <p className="text-[11px] mt-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg">
                    {detectionMessage}
                  </p>
                )}

                {/* Detected Chats List */}
                {detectedChats.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Selecione um chat detectado:
                    </span>
                    <div className="space-y-1">
                      {detectedChats.map((c) => (
                        <button
                          key={c.chat_id}
                          type="button"
                          onClick={() => setFormChatId(c.chat_id)}
                          className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-800 text-left transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {c.title_or_name} {c.username && <span className="font-normal text-slate-400">({c.username})</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: {c.chat_id} ({c.type})
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                            Usar este ➔
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Bot ativo para receber notificações
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSendOnChange}
                    onChange={(e) => setFormSendOnChange(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Disparar alerta ao detectar qualquer alteração ou novo edital
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSendOnError}
                    onChange={(e) => setFormSendOnError(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Disparar alerta se o site monitorado cair ou falhar
                  </span>
                </label>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestModal}
                  disabled={isTesting || !formToken.trim() || !formChatId.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                  <span>{isTesting ? "Enviando notificação de teste..." : "Testar Conexão / Enviar Notificação de Teste"}</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border flex items-start gap-2 ${
                      testResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span className="text-[11px] leading-tight font-medium">{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md shadow-sky-500/25 transition-all disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBot ? "Salvar Alterações" : "Conectar Bot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
