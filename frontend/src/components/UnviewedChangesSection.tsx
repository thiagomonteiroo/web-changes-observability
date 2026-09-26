"use client";

import { Monitor } from "@/lib/types";
import { BellRing, CheckCheck, ExternalLink, FileText } from "lucide-react";

interface UnviewedChangesSectionProps {
  monitors: Monitor[];
  onOpenDiff: (monitor: Monitor) => void;
  onAcknowledge: (monitorId: number) => Promise<void>;
  acknowledgingId: number | null;
}

export function UnviewedChangesSection({
  monitors,
  onOpenDiff,
  onAcknowledge,
  acknowledgingId,
}: UnviewedChangesSectionProps) {
  const unreadMonitors = monitors.filter((m) => m.has_unread_change);

  if (unreadMonitors.length === 0) {
    return null;
  }

  return (
    <section id="alertas" className="mb-8">
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 dark:border-amber-600/60 rounded-3xl p-6 shadow-lg shadow-amber-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Páginas com Alterações Detectadas
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold">
                  {unreadMonitors.length} {unreadMonitors.length === 1 ? "pendente" : "pendentes"}
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Novos conteúdos, editais ou dados foram publicados nestas páginas desde a última verificação.
              </p>
            </div>
          </div>
        </div>

        {/* List of unread monitors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unreadMonitors.map((monitor) => (
            <div
              key={monitor.id}
              className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Alteração Detectada ({monitor.total_changes}ª desde o início)
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {monitor.name}
                    </h3>
                  </div>

                  <a
                    href={monitor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Abrir página no navegador"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                  {monitor.url}
                </p>

                <div className="mt-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Última checagem:</span>
                  <span className="font-medium">
                    {monitor.last_checked_at
                      ? new Date(monitor.last_checked_at).toLocaleString("pt-BR")
                      : "Recente"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => onOpenDiff(monitor)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ver O Que Mudou</span>
                </button>

                <button
                  onClick={() => onAcknowledge(monitor.id)}
                  disabled={acknowledgingId === monitor.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>
                    {acknowledgingId === monitor.id
                      ? "Confirmando..."
                      : "Confirmar Visualização"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
