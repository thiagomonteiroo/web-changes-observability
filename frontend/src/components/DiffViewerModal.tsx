"use client";

import { useEffect, useState } from "react";
import { Monitor, DiffRecord } from "@/lib/types";
import { api } from "@/lib/api";
import {
  X,
  FileText,
  Download,
  CheckCheck,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface DiffViewerModalProps {
  monitor: Monitor | null;
  onClose: () => void;
  onAcknowledgeSuccess?: () => void;
}

export function DiffViewerModal({
  monitor,
  onClose,
  onAcknowledgeSuccess,
}: DiffViewerModalProps) {
  const [diffs, setDiffs] = useState<DiffRecord[]>([]);
  const [selectedDiffId, setSelectedDiffId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (monitor) {
      loadDiffs(monitor.id);
    }
  }, [monitor]);

  const loadDiffs = async (monitorId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await api.getMonitorDiffs(monitorId);
      setDiffs(records);
      if (records.length > 0) {
        setSelectedDiffId(records[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!monitor) return null;

  const currentDiff = diffs.find((d) => d.id === selectedDiffId) || diffs[0];

  const handleAcknowledge = async () => {
    if (!monitor) return;
    setIsAcknowledging(true);
    try {
      if (currentDiff && !currentDiff.is_acknowledged) {
        await api.acknowledgeDiff(currentDiff.id);
      } else {
        await api.acknowledgeMonitor(monitor.id);
      }
      await loadDiffs(monitor.id);
      if (onAcknowledgeSuccess) onAcknowledgeSuccess();
    } catch (err: unknown) {
      alert("Erro ao confirmar visualização: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                Histórico de Alterações
              </span>
              {currentDiff?.is_acknowledged ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Visualizado
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 animate-pulse">
                  Não Visualizado
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {monitor.name}
            </h2>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-blue-500 flex items-center gap-1 mt-0.5 truncate"
            >
              <span className="truncate">{monitor.url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {!currentDiff?.is_acknowledged && (
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>
                  {isAcknowledging ? "Salvando..." : "Confirmar Visualização"}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Carregando detalhes das alterações...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : diffs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 stroke-[1.5] mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Nenhuma alteração registrada ainda
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                O primeiro snapshot inicial foi salvo. Quando a página sofrer atualizações, os diffs detalhados aparecerão aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Revision Selector (if multiple changes exist) */}
              {diffs.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    Versões detectadas:
                  </span>
                  {diffs.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDiffId(d.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        (selectedDiffId === d.id || (!selectedDiffId && idx === 0))
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>Alteração #{diffs.length - idx}</span>
                      {!d.is_acknowledged && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp Info */}
              {currentDiff && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Detectada em:{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {new Date(currentDiff.created_at).toLocaleString("pt-BR")}
                    </strong>
                  </span>
                  {currentDiff.is_acknowledged && currentDiff.acknowledged_at && (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                      (Visualizado em {new Date(currentDiff.acknowledged_at).toLocaleString("pt-BR")})
                    </span>
                  )}
                </div>
              )}

              {/* Highlighted New Documents / Downloads */}
              {currentDiff && currentDiff.added_links && currentDiff.added_links.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Novos Documentos / Publicações Detectados ({currentDiff.added_links.length})
                  </h4>
                  <div className="space-y-2">
                    {currentDiff.added_links.map((link, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 shrink-0">
                            {link.extension || "DOC"}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {link.title}
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shrink-0 transition-colors"
                        >
                          <span>Baixar</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Diff Representation */}
              {currentDiff && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Comparativo de Conteúdo (Diff Unificado)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Linhas verdes indicam adições | Vermelhas indicam remoções
                    </span>
                  </div>

                  <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
                    {currentDiff.diff_text.split("\n").map((line, idx) => {
                      let lineClass = "text-slate-300";
                      let bgClass = "";
                      if (line.startsWith("+") && !line.startsWith("+++")) {
                        lineClass = "text-emerald-400 font-semibold";
                        bgClass = "bg-emerald-950/40 px-1 rounded";
                      } else if (line.startsWith("-") && !line.startsWith("---")) {
                        lineClass = "text-red-400 line-through opacity-80";
                        bgClass = "bg-red-950/40 px-1 rounded";
                      } else if (line.startsWith("@@")) {
                        lineClass = "text-cyan-400 font-bold";
                      }

                      return (
                        <div key={idx} className={`${bgClass} py-0.5`}>
                          <span className={lineClass}>{line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
