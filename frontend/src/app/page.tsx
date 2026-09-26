"use client";

import { useEffect, useState, useCallback } from "react";
import { Monitor, MonitorStats } from "@/lib/types";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { StatsCards } from "@/components/StatsCards";
import { UnviewedChangesSection } from "@/components/UnviewedChangesSection";
import { MonitorCard } from "@/components/MonitorCard";
import { DiffViewerModal } from "@/components/DiffViewerModal";
import { AddEditMonitorModal } from "@/components/AddEditMonitorModal";
import {
  Globe,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<MonitorStats>({
    total_monitors: 0,
    active_monitors: 0,
    monitors_with_unread_changes: 0,
    monitors_with_errors: 0,
    total_changes_detected: 0,
  });
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [telegramActiveCount, setTelegramActiveCount] = useState<number>(0);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedMonitorForEdit, setSelectedMonitorForEdit] = useState<Monitor | null>(null);
  const [selectedMonitorForDiff, setSelectedMonitorForDiff] = useState<Monitor | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsData, monitorsData, botsData] = await Promise.all([
        api.getStats(),
        api.getMonitors(),
        api.getTelegramBots().catch(() => []),
      ]);
      setStats(statsData);
      setMonitors(monitorsData);
      setTelegramActiveCount(botsData.filter((b) => b.is_active).length);
    } catch (err) {
      console.error("Falha ao carregar dados:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);


  useEffect(() => {
    loadData();
    // Auto refresh data every 20 seconds
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleCheckNow = async (id: number) => {
    setCheckingIds((prev) => new Set(prev).add(id));
    try {
      await api.checkNow(id);
      await loadData();
    } catch (err: unknown) {
      alert("Erro ao verificar monitor: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAcknowledge = async (id: number) => {
    setAcknowledgingId(id);
    try {
      await api.acknowledgeMonitor(id);
      await loadData();
    } catch (err: unknown) {
      alert("Erro ao confirmar visualização: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este monitoramento?")) return;
    try {
      await api.deleteMonitor(id);
      await loadData();
    } catch (err: unknown) {
      alert("Erro ao excluir: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenAddModal = () => {
    setSelectedMonitorForEdit(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditModal = (monitor: Monitor) => {
    setSelectedMonitorForEdit(monitor);
    setIsAddEditOpen(true);
  };

  // Filtered monitors
  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "unread") return m.has_unread_change;
    if (statusFilter === "error") return m.last_status === "error";
    if (statusFilter === "active") return m.is_active;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        onOpenAddModal={handleOpenAddModal}
        unreadCount={stats.monitors_with_unread_changes}
        errorCount={stats.monitors_with_errors}
        telegramBotCount={telegramActiveCount}
      />


      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Metrics Cards */}
        <section className="mb-8">
          <StatsCards stats={stats} />
        </section>

        {/* Spotlight Section for Unviewed Changes */}
        <UnviewedChangesSection
          monitors={monitors}
          onOpenDiff={(m) => setSelectedMonitorForDiff(m)}
          onAcknowledge={handleAcknowledge}
          acknowledgingId={acknowledgingId}
        />

        {/* Central Dashboard List Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Central de Observabilidade de Páginas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhamento de mudanças mínimas, editais publicados e status de integridade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
              title="Atualizar lista agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Página</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Todos ({monitors.length})
            </button>

            <button
              onClick={() => setStatusFilter("unread")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "unread"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Com Alterações ({stats.monitors_with_unread_changes})
            </button>

            <button
              onClick={() => setStatusFilter("error")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "error"
                  ? "bg-red-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Com Falhas ({stats.monitors_with_errors})
            </button>
          </div>
        </div>

        {/* Monitored List or Empty State */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Carregando painel de observabilidade...</p>
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhuma página encontrada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {monitors.length === 0
                ? "Você ainda não cadastrou páginas para observabilidade. Clique no botão abaixo para adicionar a primeira página que deseja acompanhar."
                : "Nenhum monitor corresponde ao filtro de busca atual."}
            </p>

            {monitors.length === 0 && (
              <div className="mt-6 flex items-center justify-center">
                <button
                  onClick={handleOpenAddModal}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  Adicionar Nova Página
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMonitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onCheckNow={handleCheckNow}
                onOpenDiff={(m) => setSelectedMonitorForDiff(m)}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                isChecking={checkingIds.has(monitor.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddEditMonitorModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSuccess={loadData}
        initialMonitor={selectedMonitorForEdit}
      />

      <DiffViewerModal
        monitor={selectedMonitorForDiff}
        onClose={() => setSelectedMonitorForDiff(null)}
        onAcknowledgeSuccess={loadData}
      />
    </div>
  );
}
