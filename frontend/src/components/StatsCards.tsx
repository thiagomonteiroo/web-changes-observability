"use client";

import { MonitorStats } from "@/lib/types";
import { Globe, BellRing, RefreshCw, AlertCircle } from "lucide-react";

interface StatsCardsProps {
  stats: MonitorStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Monitores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Páginas Monitoradas
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.total_monitors}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({stats.active_monitors} ativas)
          </span>
        </div>
      </div>

      {/* Alterações Pendentes */}
      <div
        className={`border rounded-2xl p-5 shadow-sm transition-all ${
          stats.monitors_with_unread_changes > 0
            ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Alterações Pendentes
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              stats.monitors_with_unread_changes > 0
                ? "bg-amber-500 text-white animate-bounce"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            <BellRing className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold tracking-tight ${
              stats.monitors_with_unread_changes > 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {stats.monitors_with_unread_changes}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            aguardando visualização
          </span>
        </div>
      </div>

      {/* Total Mudanças Históricas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total de Mudanças
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.total_changes_detected}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            capturadas desde o início
          </span>
        </div>
      </div>

      {/* Erros de Observabilidade */}
      <div
        className={`border rounded-2xl p-5 shadow-sm transition-all ${
          stats.monitors_with_errors > 0
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Falhas / Erros
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              stats.monitors_with_errors > 0
                ? "bg-red-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold tracking-tight ${
              stats.monitors_with_errors > 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {stats.monitors_with_errors}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {stats.monitors_with_errors > 0 ? "requer atenção" : "todas saudáveis"}
          </span>
        </div>
      </div>
    </div>
  );
}
