"use client";

import { useState, useEffect } from "react";
import { Monitor, TestUrlResult } from "@/lib/types";
import { api } from "@/lib/api";
import {
  X,
  Globe,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface AddEditMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMonitor?: Monitor | null;
}

export function AddEditMonitorModal({
  isOpen,
  onClose,
  onSuccess,
  initialMonitor,
}: AddEditMonitorModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [cssSelector, setCssSelector] = useState("");
  const [scheduleType, setScheduleType] = useState<"interval" | "daily_multi_times" | "periodic_days">("daily_multi_times");

  // Schedule options
  const [dailyTimes, setDailyTimes] = useState<string[]>(["08:00", "12:00", "16:00", "20:00"]);
  const [newTimeInput, setNewTimeInput] = useState("09:00");
  const [everyNDays, setEveryNDays] = useState(3);
  const [periodicTime, setPeriodicTime] = useState("09:00");
  const [intervalHours, setIntervalHours] = useState(6);

  // Testing URL Preview
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestUrlResult | null>(null);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMonitor) {
      setName(initialMonitor.name);
      setUrl(initialMonitor.url);
      setCssSelector(initialMonitor.css_selector || "");
      setScheduleType(initialMonitor.schedule_type || "daily_multi_times");

      const cfg = initialMonitor.schedule_config || {};
      if (cfg.times) setDailyTimes(cfg.times);
      if (cfg.every_n_days) setEveryNDays(cfg.every_n_days);
      if (cfg.time) setPeriodicTime(cfg.time);
      if (cfg.interval_hours) setIntervalHours(cfg.interval_hours);
    } else {
      setName("");
      setUrl("");
      setCssSelector("");
      setScheduleType("daily_multi_times");
      setDailyTimes(["08:00", "12:00", "16:00", "20:00"]);
      setEveryNDays(3);
      setPeriodicTime("09:00");
      setIntervalHours(6);
      setTestResult(null);
      setError(null);
    }
  }, [initialMonitor, isOpen]);

  if (!isOpen) return null;

  const handleTestUrl = async () => {
    if (!url.trim()) {
      alert("Por favor, informe a URL primeiro.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testUrlPreview(url.trim(), cssSelector.trim() || null);
      setTestResult(res);
      // Auto-suggest name if empty
      if (!name.trim()) {
        try {
          const parsed = new URL(url.trim());
          setName(`Monitor: ${parsed.hostname}`);
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddTime = () => {
    if (newTimeInput && !dailyTimes.includes(newTimeInput)) {
      setDailyTimes([...dailyTimes, newTimeInput].sort());
    }
  };

  const handleRemoveTime = (t: string) => {
    setDailyTimes(dailyTimes.filter((time) => time !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !name.trim()) {
      setError("Nome e URL são obrigatórios.");
      return;
    }

    let scheduleConfig: Record<string, unknown> = {};
    if (scheduleType === "daily_multi_times") {
      scheduleConfig = { times: dailyTimes.length > 0 ? dailyTimes : ["09:00"] };
    } else if (scheduleType === "periodic_days") {
      scheduleConfig = { every_n_days: Number(everyNDays) || 3, time: periodicTime || "09:00" };
    } else {
      scheduleConfig = { interval_hours: Number(intervalHours) || 6 };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (initialMonitor) {
        await api.updateMonitor(initialMonitor.id, {
          name: name.trim(),
          url: url.trim(),
          css_selector: cssSelector.trim() || null,
          schedule_type: scheduleType,
          schedule_config: scheduleConfig,
        });
      } else {
        await api.createMonitor({
          name: name.trim(),
          url: url.trim(),
          css_selector: cssSelector.trim() || null,
          schedule_type: scheduleType,
          schedule_config: scheduleConfig,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialMonitor ? "Editar Página Monitorada" : "Adicionar Nova Página para Observabilidade"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure a URL, seletor de dados e horários de verificação automática.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* URL Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              URL da Página Alvo *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.gov.br/concurso/edital..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={isTesting || !url.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-blue-500" : "text-amber-500"}`} />
                <span>{isTesting ? "Testando..." : "Testar Página"}</span>
              </button>
            </div>
          </div>

          {/* Live Preview / Test Results */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300"
              }`}
            >
              {testResult.success ? (
                <div>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Conexão bem-sucedida! HTTP {testResult.status_code} ({testResult.response_time_ms}ms)</span>
                  </div>
                  <p className="text-[11px] opacity-90 mb-2">
                    {testResult.total_links_found} documentos/links detectados na página.
                  </p>
                  {testResult.preview_text && (
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-emerald-200 dark:border-emerald-900/60 font-mono text-[11px] max-h-24 overflow-y-auto">
                      {testResult.preview_text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-bold block">Falha ao acessar página:</span>
                    <span>{testResult.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monitor Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Nome de Identificação *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Concurso Público Estadual - Edital 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CSS Selector (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Seletor CSS Focado (Opcional)
              </label>
              <span className="text-[11px] text-slate-500">
                Deixe em branco para monitorar a página completa (com limpeza automática)
              </span>
            </div>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: #tabela-publicacoes ou .tabela-editais"
                value={cssSelector}
                onChange={(e) => setCssSelector(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Schedule Engine Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
              Programação de Verificação (Agendamento)
            </label>

            {/* Schedule Type Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setScheduleType("daily_multi_times")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  scheduleType === "daily_multi_times"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Múltiplos Horários Diários
              </button>

              <button
                type="button"
                onClick={() => setScheduleType("periodic_days")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  scheduleType === "periodic_days"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                A Cada X Dias
              </button>

              <button
                type="button"
                onClick={() => setScheduleType("interval")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  scheduleType === "interval"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Intervalo Regular
              </button>
            </div>

            {/* Mode 1: Daily Multi Times */}
            {scheduleType === "daily_multi_times" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <span className="text-xs text-slate-600 dark:text-slate-300 block">
                  A observabilidade será executada todos os dias nos seguintes horários selecionados:
                </span>

                <div className="flex flex-wrap gap-2 items-center">
                  {dailyTimes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(t)}
                        className="hover:text-red-500 ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Horário</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Periodic Days */}
            {scheduleType === "periodic_days" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span>Verificar 1 vez a cada</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={everyNDays}
                  onChange={(e) => setEveryNDays(Number(e.target.value))}
                  className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold"
                />
                <span>dias, pontualmente às</span>
                <input
                  type="time"
                  value={periodicTime}
                  onChange={(e) => setPeriodicTime(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
            )}

            {/* Mode 3: Simple Interval */}
            {scheduleType === "interval" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span>Executar verificação a cada</span>
                <select
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={4}>4 horas</option>
                  <option value={6}>6 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas (1 vez ao dia)</option>
                </select>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting
                ? "Salvando..."
                : initialMonitor
                ? "Salvar Alterações"
                : "Iniciar Monitoramento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
