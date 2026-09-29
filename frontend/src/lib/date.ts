const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Local-time today as YYYY-MM-DD (avoids the UTC off-by-one of toISOString). */
export function todayISO(): string {
  const n = new Date()
  return toISO(n.getFullYear(), n.getMonth(), n.getDate())
}

export function isValidYMD(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2999 || m < 0 || m > 11 || d < 1) return false
  return d <= new Date(y, m + 1, 0).getDate()
}

/** Parse YYYY-MM-DD into {y, m (0-based), d}; null if invalid. */
export function parseISO(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  const y = +match[1], m = +match[2] - 1, d = +match[3]
  return isValidYMD(y, m, d) ? { y, m, d } : null
}

/** YYYY-MM-DD -> DD/MM/YYYY ('' if invalid) */
export function isoToDisplay(iso: string | null | undefined): string {
  const p = parseISO(iso)
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : ''
}

/** Insert slashes while typing: accepts digits (and separators), returns DD/MM/YYYY-shaped text. */
export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** DD/MM/YYYY -> ISO; null if incomplete or invalid. */
export function displayToISO(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!match) return null
  const d = +match[1], m = +match[2] - 1, y = +match[3]
  return isValidYMD(y, m, d) ? toISO(y, m, d) : null
}

export function addDays(iso: string, delta: number): string {
  const p = parseISO(iso) ?? parseISO(todayISO())!
  const dt = new Date(p.y, p.m, p.d + delta)
  return toISO(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export function addMonths(iso: string, delta: number): string {
  const p = parseISO(iso) ?? parseISO(todayISO())!
  const first = new Date(p.y, p.m + delta, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return toISO(first.getFullYear(), first.getMonth(), Math.min(p.d, last))
}

/** 6x7 grid of ISO dates for the month, Monday-first. */
export function monthMatrix(y: number, m: number): string[] {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(y, m, 1 - offset + i)
    return toISO(dt.getFullYear(), dt.getMonth(), dt.getDate())
  })
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
