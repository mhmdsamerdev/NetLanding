import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/** Like formatCurrency, but drops the cents when the amount is whole (for prose). */
export function formatMoney(amount: number, currency: string): string {
  if (Math.abs(amount - Math.round(amount)) > 0.004) return formatCurrency(amount, currency)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(amount)
  } catch {
    return formatCurrency(amount, currency)
  }
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
    case 'Pending': return 'bg-lilac/15 text-lilac border border-lilac/25'
    case 'Available': return 'bg-sky/15 text-sky border border-sky/25'
    case 'Withdrawn': return 'bg-white/10 text-ink-2 border border-white/15'
    case 'In Bank': return 'bg-gold/15 text-gold border border-gold/25'
    default: return 'bg-white/10 text-muted border border-white/10'
  }
}
