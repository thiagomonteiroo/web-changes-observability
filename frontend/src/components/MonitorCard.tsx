"use client";

import { Monitor } from "@/lib/types";
import {
  Globe,
  Clock,
  RefreshCw,
  ExternalLink,
  FileText,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

interface MonitorCardProps {
  monitor: Monitor;
  onCheckNow: (id: number) => Promise<void>;
  onOpenDiff: (monitor: Monitor) => void;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: number) => Promise<void>;
  isChecking: boolean;
}

export function MonitorCard({
  monitor,
  onCheckNow,
  onOpenDiff,
  onEdit,
  onDelete,
  isChecking,
}: MonitorCardProps) {
  // Format schedule description
  const formatSchedule = () => {
    const type = monitor.schedule_type;
    const cfg = monitor.schedule_config || {};

    if (type === "daily_multi_times") {
      const times = cfg.times || ["08:00", "12:00", "16:00", "20:00"];
      return `Diário em ${times.length} horários (${times.join(", ")})`;
    }
    if (type === "periodic_days") {
      return `A cada ${cfg.every_n_days || 3} dias às ${cfg.time || "09:00"}`;
    }
    if (type === "interval") {
      return `A cada ${cfg.interval_hours || 6}h`;
    }
    return "Intervalo padrão";
  };

  // Status visual badge
  const renderStatusBadge = () => {
    if (!monitor.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          Pausado
        </span>
      );
    }
    if (monitor.has_unread_change) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          Alteração Pendente
        </span>
      );
    }
    if (monitor.last_status === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          Falha na Observabilidade
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        Monitorando Ativo
      </span>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
        monitor.has_unread_change
          ? "border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/20"
          : monitor.last_status === "error"
          ? "border-red-300 dark:border-red-800/60"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {renderStatusBadge()}
            {monitor.css_selector && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Layers className="w-3 h-3" />
                {monitor.css_selector}
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
            {monitor.name}
          </h3>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span className="truncate">{monitor.url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Change Counter Badge */}
        <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Mudanças
          </span>
          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {monitor.total_changes}
          </span>
        </div>
      </div>

      {/* Error alert message if any */}
      {monitor.last_status === "error" && monitor.last_error_message && (
        <div className="mt-3.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold block">Erro na última verificação:</span>
            <span className="break-words opacity-90">{monitor.last_error_message}</span>
          </div>
        </div>
      )}

      {/* Timing and Schedule Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            Última:{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {monitor.last_checked_at
                ? new Date(monitor.last_checked_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })
                : "Aguardando"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate" title={formatSchedule()}>
            Frequência:{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {formatSchedule()}
            </span>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDiff(monitor)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Histórico / Diffs</span>
          </button>

          <button
            onClick={() => onEdit(monitor)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Editar configurações e agendamento"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(monitor.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Excluir monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onCheckNow(monitor.id)}
          disabled={isChecking}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-blue-600" : ""}`} />
          <span>{isChecking ? "Verificando..." : "Verificar agora"}</span>
        </button>
      </div>
    </div>
  );
}
