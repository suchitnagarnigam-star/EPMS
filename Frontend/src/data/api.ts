import { API_BASE_URL } from './apiConfig';

// ─── Types matching backend JSON responses ───────────────────

export interface KpiData {
  total_works: number;
  total_est_cost_lacs: number;
  total_tender_cost_lacs: number;
  total_expenditure_lacs: number;
  avg_financial_progress_pct: number;
  anomaly_count: number;
  by_branch: Record<string, number>;
  by_delivery_status: Record<string, number>;
  by_workflow_stage: Record<string, number>;
  by_fund_type?: Record<string, number>;
}

export interface WorkRecord {
  work_id: string;
  sr_no: number | null;
  branch: string;
  location_id: number | null;
  agency_id: number | null;
  fund_id: number | null;
  work_type_id: number | null;
  officer_id: number | null;
  work_description: string | null;
  length_rmt: number | null;
  road_width_ft: number | null;
  est_cost_lacs: number | null;
  tender_cost_lacs: number | null;
  expenditure_lacs: number | null;
  workflow_stage: string | null;
  delivery_status: string | null;
  aa_approved: boolean | null;
  ts_approved: boolean | null;
  ts_accorded_by: string | null;
  resolution_no_date: string | null;
  work_order_no_date: string | null;
  tender_float_date: string | null;
  tender_end_date: string | null;
  tech_eval_done: boolean | null;
  fin_eval_done: boolean | null;
  start_date: string | null;
  time_limit_months: number | null;
  scheduled_end_date: string | null;
  actual_completion_date: string | null;
  physical_progress_pct: number | null;
  progress_inferred?: boolean | null;
  financial_progress_pct: number | null;
  fin_progress_anomaly: boolean | null;
  days_overdue: number | null;
  risk_score: number | null;
  issues_bottlenecks: string | null;
  remarks: string | null;
  source_sheet: string | null;
  source_row: number | null;
  record_hash: string | null;
  data_quality_flags: string | null;
  pipeline_version: string | null;
  staged_at: string | null;
  // Joined dimension fields
  zone: string | null;
  sub_zone: string | null;
  constituency: string | null;
  ward: string | null;
  agency_name: string | null;
  nature_of_work: string | null;
  officer_name: string | null;
  fund_type: string | null;
  quota_label: string | null;
}

export interface WorksResponse {
  total: number;
  page: number;
  page_size: number;
  results: WorkRecord[];
}

export interface ContractorRecord {
  agency_name: string;
  total_works: number;
  completed: number;
  delayed: number;
  in_progress: number;
  avg_financial_progress_pct: number;
  total_expenditure_lacs: number;
  risk_score_avg: number;
  max_risk_score?: number;
  avg_physical_progress_pct?: number;
  health_rating?: string;
}

export interface QualityBacklogRow {
  id: number;
  source_sheet: string | null;
  source_row: number | null;
  work_description: string | null;
  raw_zone: string | null;
  raw_ward: string | null;
  raw_status: string | null;
  flags: string | null;
  raw_json: Record<string, unknown> | null;
  staged_at: string | null;
  created_at: string | null;
}

export interface QualityData {
  total_source_rows: number;
  analytics_ready_count: number;
  backlog_count: number;
  analytics_ready_pct: number;
  flag_breakdown: Record<string, number>;
  backlog_rows: {
    total: number;
    page: number;
    page_size: number;
    results: QualityBacklogRow[];
  };
}

export interface ConstituencyRecord {
  constituency: string;
  total_works: number;
  br_works: number;
  om_works: number;
  total_est_cost_lacs: number;
  total_tender_cost_lacs: number;
  total_expenditure_lacs: number;
  critical_count: number;
  completed_count?: number;
}

export interface WardRecord {
  ward: string;
  constituency: string;
  total_works: number;
  br_works: number;
  om_works: number;
  sanctioned_cost_lacs: number;
  tender_value_lacs: number;
  expenditure_lacs: number;
  utilization_pct: number;
  critical_works_count: number;
}

export interface ZoneRecord {
  zone: string;
  branch: string;
  total_works: number;
  avg_physical_progress: number;
  avg_financial_progress: number;
  completed_count: number;
  high_risk_count: number;
}

export interface SyncStatus {
  last_synced_at: string | null;
  total_works: number;
}

export interface ZoneProgressRecord {
  zone: string;
  br_avg_progress: number;
  om_avg_progress: number;
}

export interface FundDistributionRecord {
  fund_type: string;
  total_works: number;
  total_expenditure_lacs: number;
  total_est_cost_lacs: number;
}

// ─── Fetch helpers ───────────────────────────────────────────

async function apiFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API functions ────────────────────────────────────

export function fetchKpis(branch?: string): Promise<KpiData> {
  return apiFetch<KpiData>('/kpis', { branch });
}

export interface OfficerRecord {
  officer_id: number;
  officer_name: string;
  designation: string;
  total_works: number;
  avg_physical_progress: number;
  avg_financial_progress: number;
  avg_risk_score: number;
  total_tender_cost_lacs: number;
  total_expenditure_lacs: number;
  completed_count: number;
  in_progress_count: number;
  delayed_count: number;
}

export interface WorksFilters {
  branch?: string;
  zone?: string;
  constituency?: string;
  delivery_status?: string;
  workflow_stage?: string;
  risk_score_min?: number;
  officer_id?: number;
  agency_id?: number;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export function fetchWorks(filters: WorksFilters = {}): Promise<WorksResponse> {
  return apiFetch<WorksResponse>('/works', filters as Record<string, string | number | undefined>);
}

export function fetchWorkById(workId: string): Promise<WorkRecord> {
  return apiFetch<WorkRecord>(`/works/${encodeURIComponent(workId)}`);
}

export function fetchOfficers(designation?: string, branch?: string): Promise<OfficerRecord[]> {
  return apiFetch<OfficerRecord[]>('/kpis/officers', { designation, branch });
}

export function fetchContractors(): Promise<ContractorRecord[]> {
  return apiFetch<ContractorRecord[]>('/contractors');
}

export function fetchQuality(page = 1, pageSize = 50): Promise<QualityData> {
  return apiFetch<QualityData>('/quality', { page, page_size: pageSize });
}

export function fetchConstituencies(branch?: string): Promise<ConstituencyRecord[]> {
  return apiFetch<ConstituencyRecord[]>('/kpis/constituencies', { branch });
}

export function fetchWards(constituency?: string, branch?: string): Promise<WardRecord[]> {
  return apiFetch<WardRecord[]>('/kpis/wards', { constituency, branch });
}

export function fetchZoneProgress(branch?: string): Promise<ZoneProgressRecord[]> {
  return apiFetch<ZoneProgressRecord[]>('/kpis/zones', { branch });
}

export function fetchZones(branch?: string): Promise<ZoneRecord[]> {
  return apiFetch<ZoneRecord[]>('/kpis/zones', { branch });
}

export function fetchFundDistribution(): Promise<FundDistributionRecord[]> {
  return apiFetch<FundDistributionRecord[]>('/kpis/fund-distribution');
}

export function fetchSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>('/sync/status');
}

export function fetchHealth(): Promise<{ status: string; database_connected: boolean }> {
  return apiFetch('/health');
}

export interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

export function fetchUsers(): Promise<DashboardUser[]> {
  return apiFetch<DashboardUser[]>('/admin/users');
}

export async function createUser(data: { name: string; email: string; role: string }): Promise<DashboardUser> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create user' }));
    throw new Error(err.detail || 'Failed to create user');
  }
  return res.json();
}

export async function updateUser(id: number, data: { role?: string; is_active?: boolean }): Promise<DashboardUser> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update user' }));
    throw new Error(err.detail || 'Failed to update user');
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<{ status: string; id: number }> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete user' }));
    throw new Error(err.detail || 'Failed to delete user');
  }
  return res.json();
}

