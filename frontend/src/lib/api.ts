import { Monitor, MonitorStats, DiffRecord, CheckLog, TestUrlResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorDetail = `Erro HTTP: ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Stats & Monitors
  getStats: () => fetchJson<MonitorStats>("/monitors/stats"),
  
  getMonitors: (onlyUnread = false) =>
    fetchJson<Monitor[]>(`/monitors${onlyUnread ? "?only_unread=true" : ""}`),
  
  getMonitor: (id: number) => fetchJson<Monitor>(`/monitors/${id}`),

  createMonitor: (data: {
    name: string;
    url: string;
    css_selector?: string | null;
    schedule_type: string;
    schedule_config: Record<string, unknown>;
  }) =>
    fetchJson<Monitor>("/monitors", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMonitor: (
    id: number,
    data: {
      name?: string;
      url?: string;
      css_selector?: string | null;
      schedule_type?: string;
      schedule_config?: Record<string, unknown>;
      is_active?: boolean;
    }
  ) =>
    fetchJson<Monitor>(`/monitors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteMonitor: (id: number) =>
    fetchJson<{ message: string; id: number }>(`/monitors/${id}`, {
      method: "DELETE",
    }),

  checkNow: (id: number) =>
    fetchJson<{ message: string; result: unknown; monitor: Monitor }>(
      `/monitors/${id}/check-now`,
      { method: "POST" }
    ),

  acknowledgeMonitor: (id: number) =>
    fetchJson<{ message: string; monitor: Monitor }>(
      `/monitors/${id}/acknowledge`,
      { method: "POST" }
    ),

  testUrlPreview: (url: string, css_selector?: string | null) =>
    fetchJson<TestUrlResult>("/monitors/test-url", {
      method: "POST",
      body: JSON.stringify({ url, css_selector }),
    }),

  // Diffs
  getMonitorDiffs: (monitorId: number) =>
    fetchJson<DiffRecord[]>(`/monitors/${monitorId}/diffs`),

  getDiff: (diffId: number) => fetchJson<DiffRecord>(`/diffs/${diffId}`),

  acknowledgeDiff: (diffId: number) =>
    fetchJson<DiffRecord>(`/diffs/${diffId}/acknowledge`, {
      method: "POST",
    }),

  // Logs & Errors
  getLogs: (monitorId?: number, limit = 50) =>
    fetchJson<CheckLog[]>(
      `/logs?limit=${limit}${monitorId ? `&monitor_id=${monitorId}` : ""}`
    ),

  getErrors: (limit = 50) => fetchJson<CheckLog[]>(`/errors?limit=${limit}`),
};
