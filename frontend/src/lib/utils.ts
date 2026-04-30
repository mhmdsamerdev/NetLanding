import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const CURRENCIES = ['USD', 'MYR', 'EUR', 'GBP', 'AUD', 'SGD', 'CAD']

export const STATUSES = ['Pending', 'Available', 'Withdrawn', 'In Bank'] as const
export type Status = typeof STATUSES[number]

export function statusColor(status: string): string {
  switch (status) {
    case 'Pending': return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
    case 'Available': return 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
    case 'Withdrawn': return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
    case 'In Bank': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
    default: return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/20'
  }
}
