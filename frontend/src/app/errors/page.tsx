"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckLog } from "@/lib/types";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function ErrorsPage() {
  const [errors, setErrors] = useState<CheckLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<number | null>(null);

  const loadErrors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getErrors(100);
      setErrors(data);
    } catch (err) {
      console.error("Erro ao carregar log de falhas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const handleRetry = async (monitorId: number) => {
    setIsRetrying(monitorId);
    try {
      await api.checkNow(monitorId);
      await loadErrors();
      alert("Checagem de retry concluída!");
    } catch (err: unknown) {
      alert("Falha no retry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRetrying(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                Central de Falhas e Erros de Observabilidade
              </h1>
            </div>
          </div>

          <button
            onClick={loadErrors}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Histórico das requisições que falharam (quedas de conexão, timeouts, páginas 403/500 ou alterações drásticas de seletor).
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Consultando registros de erros...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhuma falha de observabilidade registrada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Todas as checagens recentes foram executadas com sucesso e as páginas responderam com integridade.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {log.http_status_code ? `HTTP ${log.http_status_code}` : "Falha de Conexão"}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.executed_at).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {log.monitor_name || `Monitor #${log.monitor_id}`}
                  </h3>

                  <p className="text-xs font-mono text-red-600 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-900/40 break-words">
                    {log.error_message || "Erro desconhecido durante a requisição."}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end gap-2">
                  <button
                    onClick={() => handleRetry(log.monitor_id)}
                    disabled={isRetrying === log.monitor_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying === log.monitor_id ? "animate-spin" : ""}`} />
                    <span>{isRetrying === log.monitor_id ? "Retentando..." : "Retentar Agora"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
