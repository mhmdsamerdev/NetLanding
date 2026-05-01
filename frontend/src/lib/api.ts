import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default api

export interface Source {
  id: number
  name: string
  created_at: string
}

export interface BankAccount {
  id: number
  name: string
  created_at: string
}

export interface Entry {
  id: number
  project_client_name: string
  gross_amount: number
  gross_currency: string
  platform_fee: number
  withdrawal_fee: number
  net_income: number
  source_id: number | null
  bank_account_id: number | null
  status: string
  date_received: string | null
  date_available: string | null
  date_expiry: string | null
  current_location: string | null
  date_withdrawn: string | null
  date_cleared: string | null
  invoice_ref: string | null
  notes: string | null
  created_at: string
  updated_at: string
  source: Source | null
  bank_account: BankAccount | null
}

export interface EntryPayload {
  project_client_name: string
  gross_amount: number
  gross_currency: string
  platform_fee: number
  withdrawal_fee: number
  source_id: number | null
  bank_account_id: number | null
  status: string
  date_received: string | null
  date_available: string | null
  date_expiry: string | null
  current_location: string | null
  date_withdrawn: string | null
  date_cleared: string | null
  invoice_ref: string | null
  notes: string | null
}

export interface DashboardData {
  total_gross_all_time: number
  total_net_all_time: number
  total_fees_all_time: number
  gross_this_month: number
  net_this_month: number
  fees_this_month: number
  cleared_this_month: number
  platform_fees_this_month: number
  withdrawal_fees_this_month: number
  per_source_breakdown: { source_name: string; total_gross: number; total_net: number; entry_count: number }[]
  status_counts: { pending: number; available: number; withdrawn: number; in_bank: number }
  pending_net: number
  available_net: number
  withdrawn_net: number
  in_bank_net: number
  avg_days_to_clear: number
  avg_days_per_source: { source_name: string; avg_days: number }[]
  currency_warning: boolean
  base_currency: string
  available_overdue_amount: number
  available_overdue_days: number
  expiry_warnings: { date: string; net: number; currency: string; label: string }[]
}

export interface Settings {
  id: number
  base_currency: string
}

export const entriesApi = {
  list: (params?: Record<string, string>) => api.get<Entry[]>('/entries', { params }),
  get: (id: number) => api.get<Entry>(`/entries/${id}`),
  create: (data: EntryPayload) => api.post<Entry>('/entries', data),
  update: (id: number, data: Partial<EntryPayload>) => api.put<Entry>(`/entries/${id}`, data),
  delete: (id: number) => api.delete(`/entries/${id}`),
}

export const sourcesApi = {
  list: () => api.get<Source[]>('/sources'),
  create: (name: string) => api.post<Source>('/sources', { name }),
  delete: (id: number) => api.delete(`/sources/${id}`),
}

export const banksApi = {
  list: () => api.get<BankAccount[]>('/bank-accounts'),
  create: (name: string) => api.post<BankAccount>('/bank-accounts', { name }),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`),
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  update: (base_currency: string) => api.put<Settings>('/settings', { base_currency }),
}
