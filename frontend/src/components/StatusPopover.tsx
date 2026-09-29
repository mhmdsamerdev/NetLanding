import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { entriesApi, banksApi } from '@/lib/api'
import type { Entry, BankAccount } from '@/lib/api'
import { STATUSES, cn, formatCurrency } from '@/lib/utils'
import { isoToDisplay, todayISO } from '@/lib/date'
import { AmountInput } from '@/components/ui/amount-input'
import { Calendar } from '@/components/ui/calendar'
import { Popover } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface StatusPopoverProps {
  entry: Entry
  anchor: HTMLElement
  onClose: () => void
  onSaved: (entry: Entry) => void
}

type DateKey = 'available' | 'withdrawn' | 'cleared'

const recency = (e: Entry) => `${e.date_withdrawn ?? ''}|${e.created_at}`
const byRecent = (a: Entry, b: Entry) => (recency(a) < recency(b) ? 1 : -1)

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'h-8 px-3.5 rounded-full text-xs border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold',
        selected ? 'bg-gold/15 border-gold/60 text-gold' : 'bg-raised border-line text-ink-2 hover:text-ink hover:bg-[#352f43]'
      )}
    >
      {children}
    </button>
  )
}

const dateText = (iso: string) => (iso === todayISO() ? 'today' : isoToDisplay(iso))

export default function StatusPopover({ entry, anchor, onClose, onSaved }: StatusPopoverProps) {
  const { toast } = useToast()
  const anchorRef = useMemo(() => ({ current: anchor }), [anchor])
  const panelRef = useRef<HTMLDivElement>(null)
  const currentIdx = STATUSES.indexOf(entry.status as typeof STATUSES[number])
  const [target, setTarget] = useState(currentIdx + 1)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [history, setHistory] = useState<Entry[]>([])
  const [bankPick, setBankPick] = useState<number | null | undefined>(undefined)
  const [feeTyped, setFeeTyped] = useState<number | null>(null)
  const [dates, setDates] = useState<Record<DateKey, string>>({ available: todayISO(), withdrawn: todayISO(), cleared: todayISO() })
  const [calOpen, setCalOpen] = useState<DateKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(entry.source_id == null)

  useEffect(() => {
    banksApi.list().then(r => setBanks(r.data)).catch(() => {})
    if (entry.source_id != null) {
      entriesApi.list({ source_id: String(entry.source_id) }).then(r => setHistory(r.data.filter(e => e.id !== entry.id))).catch(() => {}).finally(() => setLoaded(true))
    }
  }, [entry.id, entry.source_id])

  const steps = STATUSES.slice(currentIdx + 1, target + 1)
  const asksAvailable = steps.includes('Available')
  const asksWithdrawn = steps.includes('Withdrawn')
  const asksCleared = steps.includes('In Bank')
  const showBanks = asksWithdrawn || asksCleared
  const targetStatus = STATUSES[target]

  const sourceName = entry.source?.name

  // Last bank used for this source (only when this step actually asks for a bank).
  let defaultBank = entry.bank_account_id
  if (asksWithdrawn) {
    const last = history.filter(e => e.bank_account_id != null).sort(byRecent)[0]
    if (last) defaultBank = last.bank_account_id
  }
  const bankId = bankPick === undefined ? defaultBank : bankPick
  const bankName = banks.find(b => b.id === bankId)?.name

  // Last withdrawal fee for this source + bank.
  const lastMatch = bankId == null ? undefined
    : history.filter(e => e.bank_account_id === bankId && (e.status === 'Withdrawn' || e.status === 'In Bank')).sort(byRecent)[0]
  const ownFee = entry.withdrawal_fee || null
  const defaultFee = lastMatch ? lastMatch.withdrawal_fee : ownFee
  const fee = feeTyped ?? defaultFee ?? 0
  const feeNote = feeTyped != null ? null
    : lastMatch && sourceName && bankName ? `Pre-filled from your last ${sourceName} → ${bankName} withdrawal`
    : ownFee != null ? 'Kept from the fee already on this entry'
    : sourceName && bankName ? `No earlier ${sourceName} → ${bankName} withdrawal`
    : null

  const lands = entry.gross_amount - (entry.platform_fee || 0) - fee

  const dateKeys: DateKey[] = [asksAvailable && 'available', asksWithdrawn && 'withdrawn', asksCleared && 'cleared'].filter(Boolean) as DateKey[]
  const dateLabel: Record<DateKey, string> = { available: 'Available', withdrawn: 'Withdrawn', cleared: 'Cleared' }
  const setDate = (k: DateKey, v: string) => { setDates(prev => ({ ...prev, [k]: v })); setCalOpen(null) }

  useEffect(() => {
    // Popover reveals itself after positioning. Focus the fee field only once the
    // history has filled it in (AmountInput snapshots its value on focus).
    const focus = () => (loaded ? panelRef.current?.querySelector<HTMLInputElement>('input') ?? panelRef.current : panelRef.current)?.focus()
    const id = requestAnimationFrame(() => requestAnimationFrame(focus))
    return () => cancelAnimationFrame(id)
  }, [loaded])

  const confirm = async () => {
    if (saving) return
    const body: Partial<Record<string, unknown>> = { status: targetStatus }
    if (asksAvailable) body.date_available = dates.available
    if (asksWithdrawn) {
      body.bank_account_id = bankId ?? null
      body.withdrawal_fee = fee
      body.date_withdrawn = dates.withdrawn
    }
    if (asksCleared) {
      body.date_cleared = dates.cleared
      if (!asksWithdrawn && bankId !== entry.bank_account_id) body.bank_account_id = bankId ?? null
    }
    setSaving(true)
    try {
      const r = await entriesApi.update(entry.id, body)
      toast(`Moved to ${targetStatus}`)
      onSaved(r.data)
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || 'Failed to update entry', 'error')
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented) return
    const t = e.target as HTMLElement
    if (t.closest('[data-cal]')) return
    if (t.tagName === 'BUTTON' && t.getAttribute('aria-pressed') == null) return
    e.preventDefault()
    confirm()
  }

  const single = dateKeys.length === 1
  const dateLine = (k: DateKey) => (
    <button
      type="button"
      onClick={() => setCalOpen(c => (c === k ? null : k))}
      className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink cursor-pointer"
    >
      <CalendarDays size={13} className="text-muted" />
      <span className="underline decoration-dotted underline-offset-4">
        {single ? `Dated ${dateText(dates[k])}` : `${dateLabel[k]} ${dateText(dates[k])}`}
      </span>
    </button>
  )

  const bankChips = () => (
    <div>
      <div className="text-xs text-ink-2 mb-2">To which bank?</div>
      <div className="flex flex-wrap gap-2">
        {banks.length === 0 && <span className="text-xs text-muted">No bank accounts yet — add one in Settings.</span>}
        {banks.map(b => (
          <Chip key={b.id} selected={b.id === bankId} onClick={() => setBankPick(b.id === bankId ? null : b.id)}>{b.name}</Chip>
        ))}
      </div>
    </div>
  )

  return (
    <Popover open anchorRef={anchorRef} onClose={onClose} matchWidth={false} role="dialog" className="w-[380px] max-w-[calc(100vw-16px)]">
      <div ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown} className="outline-none" aria-label={`Move to ${targetStatus}`}>
        <div className="px-5 pt-5 pb-4 space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Move to {targetStatus}</h3>
            <p className="text-xs text-muted mt-0.5">
              {steps.length > 1 ? `Only what's new across ${steps.length} steps.` : "Only what's new at this step."}
            </p>
          </div>

          {asksAvailable && !single && (
            <div>{dateLine('available')}</div>
          )}

          {showBanks && bankChips()}

          {asksWithdrawn && (
            <>
              <div>
                <div className="text-xs text-ink-2 mb-2">Withdrawal fee</div>
                <AmountInput value={fee} onChange={v => setFeeTyped(v)} suffix={entry.gross_currency} placeholder="0.00" />
                {feeNote && <p className="text-[11px] text-muted mt-1.5">{feeNote}</p>}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-bg/60 px-4 py-3">
                <span className="text-xs text-ink-2">Lands as</span>
                <span className={cn('font-display text-xl font-semibold tabular-nums', lands < 0 ? 'text-salmon' : 'text-gold')}>
                  {formatCurrency(lands, entry.gross_currency)}
                </span>
              </div>
              {!single && <div>{dateLine('withdrawn')}</div>}
            </>
          )}

          {asksCleared && !single && <div>{dateLine('cleared')}</div>}

          {calOpen && (
            <div data-cal className="flex justify-center rounded-xl border border-line py-1">
              <Calendar
                selected={dates[calOpen]}
                cursor={dates[calOpen]}
                onCursorChange={d => setDates(prev => ({ ...prev, [calOpen]: d }))}
                onPick={d => setDate(calOpen, d)}
                min={calOpen === 'cleared' ? (asksWithdrawn ? dates.withdrawn : entry.date_withdrawn) || undefined : undefined}
              />
            </div>
          )}

          {currentIdx < STATUSES.length - 2 && (
            <div>
              <button type="button" onClick={() => setJumpOpen(o => !o)} className="text-xs text-muted hover:text-ink-2 cursor-pointer">
                Set status…
              </button>
              {jumpOpen && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUSES.slice(currentIdx + 1).map((s, i) => (
                    <Chip key={s} selected={currentIdx + 1 + i === target} onClick={() => { setTarget(currentIdx + 1 + i); setCalOpen(null) }}>{s}</Chip>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface px-5 py-3.5 border-t border-line flex items-center justify-between gap-2">
          <div>{single && dateLine(dateKeys[0])}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="accent" onClick={confirm} disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</Button>
          </div>
        </div>
      </div>
    </Popover>
  )
}
