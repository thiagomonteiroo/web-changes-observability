export interface Monitor {
  id: number;
  name: string;
  url: string;
  css_selector: string | null;
  schedule_type: "interval" | "daily_multi_times" | "periodic_days";
  schedule_config: {
    interval_hours?: number;
    interval_minutes?: number;
    times?: string[];
    every_n_days?: number;
    time?: string;
  };
  is_active: boolean;
  total_changes: number;
  has_unread_change: boolean;
  last_checked_at: string | null;
  next_check_at: string | null;
  last_status: "pending" | "ok" | "changed" | "error";
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitorStats {
  total_monitors: number;
  active_monitors: number;
  monitors_with_unread_changes: number;
  monitors_with_errors: number;
  total_changes_detected: number;
}

export interface ExtractedLink {
  title: string;
  url: string;
  relative_path?: string;
  is_document: boolean;
  extension: string;
}

export interface DiffRecord {
  id: number;
  monitor_id: number;
  snapshot_id: number;
  diff_text: string;
  added_links: ExtractedLink[];
  removed_links: ExtractedLink[];
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface CheckLog {
  id: number;
  monitor_id: number;
  monitor_name?: string;
  status: "success_initial" | "success_no_change" | "success_changed" | "error";
  http_status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  executed_at: string;
}

export interface TestUrlResult {
  success: boolean;
  status_code?: number;
  response_time_ms?: number;
  preview_text?: string;
  total_links_found?: number;
  sample_links?: ExtractedLink[];
  error?: string;
}
