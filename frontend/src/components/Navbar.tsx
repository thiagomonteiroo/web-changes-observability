"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Plus, AlertTriangle, BellRing } from "lucide-react";

interface NavbarProps {
  onOpenAddModal: () => void;
  unreadCount?: number;
  errorCount?: number;
}

export function Navbar({ onOpenAddModal, unreadCount = 0, errorCount = 0 }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Web Observability
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Monitoramento de Editais e Sites
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-slate-800">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Painel Central
            </Link>

            <Link
              href="/#alertas"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                unreadCount > 0
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BellRing className="w-4 h-4" />
              <span>Mudanças Detectadas</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/errors"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === "/errors"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Central de Erros</span>
              {errorCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
                  {errorCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm shadow-blue-500/25 transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Página</span>
          </button>
        </div>
      </div>
    </header>
  );
}
