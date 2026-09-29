import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Plus, CalendarDays, ChevronDown } from 'lucide-react'
import { entriesApi, sourcesApi, banksApi } from '@/lib/api'
import type { Entry, EntryPayload, Source, BankAccount } from '@/lib/api'
import { CURRENCIES, STATUSES, cn, formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { AmountInput } from '@/components/ui/amount-input'
import { Textarea } from '@/components/ui/textarea'
import { Popover } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { addDays, isoToDisplay, todayISO } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface EntryModalProps {
  open: boolean
  entry?: Entry | null
  initialSources?: Source[]
  onClose: () => void
  onSaved: (entry: Entry) => void
}

const MAX_CHIPS = 6
const RECENT_CHIPS = 5

const emptyPayload = (): EntryPayload => ({
  project_client_name: '',
  gross_amount: 0,
  gross_currency: 'USD',
  platform_fee: 0,
  withdrawal_fee: 0,
  source_id: null,
  bank_account_id: null,
  status: 'Pending',
  date_received: todayISO(),
  date_available: null,
  date_expiry: null,
  current_location: null,
  date_withdrawn: null,
  date_cleared: null,
  invoice_ref: null,
  notes: null,
})

const round2 = (n: number) => Math.round(n * 100) / 100

const currencySymbol = (code: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(p => p.type === 'currency')?.value ?? code
  } catch {
    return code
  }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-ink-2 mb-2">{children}</div>
}

function Chip({ selected, onClick, children, className }: { selected?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'h-9 px-4 rounded-full text-sm border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold',
        selected ? 'bg-gold/15 border-gold/60 text-gold' : 'bg-raised border-line text-ink-2 hover:text-ink hover:bg-[#352f43]',
        className
      )}
    >
      {children}
    </button>
  )
}

export default function EntryModal({ open, entry, initialSources, onClose, onSaved }: EntryModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<EntryPayload>(emptyPayload())
  const [sources, setSources] = useState<Source[]>([])
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [recentSourceIds, setRecentSourceIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [feeOverride, setFeeOverride] = useState<number | null>(null)
  const [feeOpen, setFeeOpen] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [datesDirty, setDatesDirty] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [amountKey, setAmountKey] = useState(0)
  const amountRef = useRef<HTMLDivElement>(null)
  const dateBtnRef = useRef<HTMLButtonElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const currencyTouched = useRef(false)
  // Parent refreshes its source list after each save; must not reset the form mid-session.
  const initialSourcesRef = useRef(initialSources)
  useEffect(() => { initialSourcesRef.current = initialSources })

  const focusAmount = useCallback(() => {
    const focus = () => amountRef.current?.querySelector('input')?.focus()
    focus()
    requestAnimationFrame(focus)
  }, [])

  useEffect(() => {
    if (!open) return
    currencyTouched.current = false
    setDateOpen(false)
    setMoreOpen(false)
    setAddingSource(false)
    setNewSourceName('')
    setDatesDirty(false)
    if (initialSourcesRef.current && initialSourcesRef.current.length > 0) {
      setSources(initialSourcesRef.current)
    } else {
      sourcesApi.list().then(r => setSources(r.data))
    }
    banksApi.list().then(r => setBanks(r.data))
    entriesApi.list().then(r => {
      const seen: number[] = []
      for (const e of r.data) if (e.source_id != null && !seen.includes(e.source_id)) seen.push(e.source_id)
      setRecentSourceIds(seen)
      // Newest entry first (API sorts by created_at desc): its currency is the default.
      if (!entry && r.data[0] && !currencyTouched.current) {
        setForm(prev => ({ ...prev, gross_currency: r.data[0].gross_currency }))
      }
    }).catch(() => {})

    if (entry) {
      const pct = entry.source?.default_fee_percent
      const computed = pct != null ? round2(entry.gross_amount * pct / 100) : 0
      const overridden = entry.platform_fee !== computed
      setFeeOverride(overridden ? entry.platform_fee : null)
      setFeeOpen(overridden)
      setExtrasOpen(!!(entry.invoice_ref || entry.date_expiry || entry.notes))
      setForm({
        project_client_name: entry.project_client_name,
        gross_amount: entry.gross_amount,
        gross_currency: entry.gross_currency,
        platform_fee: entry.platform_fee,
        withdrawal_fee: entry.withdrawal_fee,
        source_id: entry.source_id,
        bank_account_id: entry.bank_account_id,
        status: entry.status,
        date_received: entry.date_received,
        date_available: entry.date_available,
        date_expiry: entry.date_expiry,
        current_location: entry.current_location,
        date_withdrawn: entry.date_withdrawn,
        date_cleared: entry.date_cleared,
        invoice_ref: entry.invoice_ref,
        notes: entry.notes,
      })
    } else {
      setFeeOverride(null)
      setFeeOpen(false)
      setExtrasOpen(false)
      setForm(emptyPayload())
    }
    focusAmount()
  }, [open, entry, focusAmount])

  const set = <K extends keyof EntryPayload>(k: K, v: EntryPayload[K]) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'status') {
        const today = todayISO()
        if (v === 'Withdrawn' && !next.date_withdrawn) next.date_withdrawn = today
        if (v === 'In Bank' && !next.date_cleared) next.date_cleared = today
      }
      return next
    })
  }

  const source = useMemo(() => sources.find(s => s.id === form.source_id) ?? null, [sources, form.source_id])
  const sourcePct = source?.default_fee_percent ?? null
  const computedFee = sourcePct != null ? round2((form.gross_amount || 0) * sourcePct / 100) : 0
  const fee = feeOverride ?? computedFee
  const net = (form.gross_amount || 0) - fee - (form.withdrawal_fee || 0)
  const pctShown = feeOverride == null
    ? sourcePct
    : form.gross_amount > 0 ? round2(feeOverride / form.gross_amount * 100) : null

  // Received + clearing days, unless editing and the user hasn't touched source/received date.
  const clearing = source?.clearing_days ?? null
  const availableAuto = !(entry && !datesDirty) && clearing != null && form.date_received
    ? addDays(form.date_received, clearing)
    : form.date_available

  const visibleSources = useMemo(() => {
    const rank = (id: number) => { const i = recentSourceIds.indexOf(id); return i < 0 ? Infinity : i }
    const ordered = [...sources].sort((a, b) => rank(a.id) - rank(b.id))
    if (ordered.length <= MAX_CHIPS) return { chips: ordered, more: [] as Source[] }
    let chips = ordered.slice(0, RECENT_CHIPS)
    const selected = ordered.find(s => s.id === form.source_id)
    if (selected && !chips.includes(selected)) chips = [...chips, selected]
    return { chips, more: ordered.filter(s => !chips.includes(s)) }
  }, [sources, recentSourceIds, form.source_id])

  const pickSource = (id: number | null) => {
    setForm(prev => ({ ...prev, source_id: id }))
    setFeeOverride(null)
    setDatesDirty(true)
  }

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    try {
      const r = await sourcesApi.create(newSourceName.trim())
      setSources(prev => [...prev, r.data])
      pickSource(r.data.id)
      setNewSourceName('')
      setAddingSource(false)
      toast('Source added')
    } catch {
      toast('Source already exists or error occurred', 'error')
    }
  }

  const showBank = form.status === 'Withdrawn' || form.status === 'In Bank'

  const handleSave = async (another: boolean) => {
    if (saving) return
    if (!form.gross_amount || form.gross_amount <= 0) { toast('Amount must be > 0', 'error'); focusAmount(); return }
    const received = form.date_received || todayISO()
    const payload: EntryPayload = {
      ...form,
      project_client_name: form.project_client_name.trim() || `${source?.name ?? 'Income'} — ${received}`,
      platform_fee: fee,
      date_available: availableAuto ?? null,
    }
    setSaving(true)
    try {
      let result: { data: Entry }
      if (entry) {
        result = await entriesApi.update(entry.id, payload)
        toast('Entry updated')
      } else {
        result = await entriesApi.create(payload)
        toast('Entry created')
      }
      onSaved(result.data)
      if (another && !entry) {
        setRecentSourceIds(prev => payload.source_id == null ? prev : [payload.source_id, ...prev.filter(i => i !== payload.source_id)])
        setForm({
          ...emptyPayload(),
          source_id: payload.source_id,
          gross_currency: payload.gross_currency,
          status: payload.status,
          date_withdrawn: payload.status === 'Withdrawn' || payload.status === 'In Bank' ? todayISO() : null,
          date_cleared: payload.status === 'In Bank' ? todayISO() : null,
        })
        setFeeOverride(null)
        setFeeOpen(false)
        setExtrasOpen(false)
        setDatesDirty(false)
        setAmountKey(k => k + 1)
        focusAmount()
      } else {
        onClose()
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || 'Failed to save entry', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Latest handler for the document listener (avoids re-binding on every keystroke).
  const saveRef = useRef(handleSave)
  useEffect(() => { saveRef.current = handleSave })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Enter' || e.defaultPrevented) return
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey) { e.preventDefault(); saveRef.current(true); return }
      if (t.tagName === 'TEXTAREA' || t.closest('[data-datefield]')) return
      // Chips/status buttons: Enter saves instead of toggling the focused chip.
      if (t.tagName === 'BUTTON' && t.getAttribute('aria-pressed') == null) return
      e.preventDefault()
      saveRef.current(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const feeLine = fee > 0
    ? <>−{formatCurrency(fee, form.gross_currency)} {source?.name ?? 'Platform'} fee{pctShown != null ? ` (${pctShown}%)` : ''}</>
    : <>no fees</>

  const availableLine = availableAuto
    ? <> · available ~{isoToDisplay(availableAuto)}{source && clearing != null ? ` (${source.name} clears in ${clearing} days)` : ''}</>
    : null

  const receivedLabel = form.date_received === todayISO() ? 'Received today' : form.date_received ? `Received ${isoToDisplay(form.date_received)}` : 'Set received date'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-[560px] max-h-full bg-surface border border-line rounded-2xl flex flex-col shadow-2xl shadow-black/50">
        {/* Header + amount */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-line">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-ink-2">{entry ? 'Edit income' : 'New income'}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink-2 transition-colors p-1 rounded cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-5xl text-muted leading-none">{currencySymbol(form.gross_currency)}</span>
            <div ref={amountRef} className="flex-1 min-w-0">
              <AmountInput
                key={amountKey}
                value={form.gross_amount}
                onChange={v => set('gross_amount', v)}
                placeholder="0.00"
                className="h-auto border-0 bg-transparent px-0 py-1 font-display text-5xl font-semibold focus:ring-0 focus:border-0"
              />
            </div>
            <div className="w-[92px] shrink-0">
              <Select
                value={form.gross_currency}
                onChange={v => { currencyTouched.current = true; set('gross_currency', v) }}
                options={CURRENCIES.map(c => ({ value: c, label: c }))}
                className="h-8 rounded-full bg-raised text-xs px-3"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <div className="text-ink-2 min-w-0">
              <span className={cn('font-semibold tabular-nums', net < 0 ? 'text-salmon' : 'text-gold')}>
                You keep {formatCurrency(net, form.gross_currency)}
              </span>
              <span className="mx-1.5 text-muted">·</span>
              <span className="tabular-nums">{feeLine}</span>
            </div>
            <button type="button" onClick={() => setFeeOpen(o => !o)} className="text-gold hover:brightness-125 shrink-0 ml-3 cursor-pointer">
              Edit fees
            </button>
          </div>
          {feeOpen && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-ink-2 shrink-0">Platform fee</span>
              <div className="w-32">
                <AmountInput
                  value={fee}
                  onChange={v => setFeeOverride(v)}
                  suffix={form.gross_currency}
                  placeholder="0.00"
                />
              </div>
              {feeOverride != null && (
                <button type="button" onClick={() => setFeeOverride(null)} className="text-xs text-muted hover:text-ink-2 cursor-pointer">
                  Reset to {sourcePct != null ? `${sourcePct}%` : 'default'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <Label>What was it for?</Label>
            <Input
              value={form.project_client_name}
              onChange={e => set('project_client_name', e.target.value)}
              placeholder="e.g. Acme Corp — Logo design"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <Label>From</Label>
            <div className="flex flex-wrap gap-2">
              {visibleSources.chips.map(s => (
                <Chip key={s.id} selected={s.id === form.source_id} onClick={() => pickSource(s.id === form.source_id ? null : s.id)}>
                  {s.name}
                </Chip>
              ))}
              {visibleSources.more.length > 0 && (
                <>
                  <button
                    ref={moreBtnRef}
                    type="button"
                    onClick={() => setMoreOpen(o => !o)}
                    className="h-9 px-4 rounded-full text-sm border border-line bg-raised text-ink-2 hover:text-ink inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    More <ChevronDown size={13} />
                  </button>
                  <Popover open={moreOpen} anchorRef={moreBtnRef} onClose={() => setMoreOpen(false)} className="p-1">
                    {visibleSources.more.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { pickSource(s.id); setMoreOpen(false) }}
                        className="block w-full text-left px-2.5 py-1.5 rounded-md text-sm text-ink-2 hover:bg-white/[0.07] hover:text-ink cursor-pointer whitespace-nowrap"
                      >
                        {s.name}
                      </button>
                    ))}
                  </Popover>
                </>
              )}
              {addingSource ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)}
                    placeholder="New source"
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddSource() }
                      if (e.key === 'Escape') { e.stopPropagation(); setAddingSource(false) }
                    }}
                    className="h-9 w-36 rounded-full"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddSource}>Add</Button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Add new source"
                  title="Add new source"
                  onClick={() => setAddingSource(true)}
                  className="h-9 w-9 rounded-full border border-dashed border-white/25 text-muted hover:text-ink hover:border-white/40 inline-flex items-center justify-center cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>

          <div>
            <Label>Where is it now?</Label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-bg/60 border border-line">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  aria-pressed={form.status === s}
                  className={cn(
                    'h-9 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    form.status === s ? 'bg-gold text-bg' : 'text-ink-2 hover:bg-white/5 hover:text-ink'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {showBank && (
            <div className="space-y-4 rounded-xl border border-line p-4">
              <div>
                <Label>Bank account</Label>
                <div className="flex flex-wrap gap-2">
                  {banks.length === 0 && <span className="text-xs text-muted">No bank accounts yet — add one in Settings.</span>}
                  {banks.map(b => (
                    <Chip key={b.id} selected={b.id === form.bank_account_id} onClick={() => set('bank_account_id', b.id === form.bank_account_id ? null : b.id)}>
                      {b.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Withdrawal fee</Label>
                  <AmountInput value={form.withdrawal_fee} onChange={v => set('withdrawal_fee', v)} placeholder="0.00" />
                </div>
                <div data-datefield>
                  <Label>Date withdrawn</Label>
                  <DateInput value={form.date_withdrawn} onChange={v => set('date_withdrawn', v || null)} min={form.date_received || undefined} />
                </div>
                {form.status === 'In Bank' && (
                  <div data-datefield>
                    <Label>Date cleared</Label>
                    <DateInput value={form.date_cleared} onChange={v => set('date_cleared', v || null)} min={form.date_withdrawn || undefined} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-ink-2 flex-wrap">
            <CalendarDays size={14} className="text-muted shrink-0" />
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => setDateOpen(o => !o)}
              className="text-ink underline decoration-dotted underline-offset-4 hover:text-gold cursor-pointer"
            >
              {receivedLabel}
            </button>
            <span className="tabular-nums">{availableLine}</span>
            <Popover open={dateOpen} anchorRef={dateBtnRef} onClose={() => setDateOpen(false)} matchWidth={false} role="dialog">
              <Calendar
                selected={form.date_received ?? ''}
                cursor={form.date_received || todayISO()}
                onCursorChange={d => set('date_received', d)}
                onPick={d => { set('date_received', d); setDatesDirty(true); setDateOpen(false) }}
              />
            </Popover>
          </div>

          {extrasOpen ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Invoice / Ref</Label>
                  <Input value={form.invoice_ref ?? ''} onChange={e => set('invoice_ref', e.target.value || null)} placeholder="Optional" />
                </div>
                <div data-datefield>
                  <Label>Expiry date</Label>
                  <DateInput value={form.date_expiry} onChange={v => set('date_expiry', v || null)} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} rows={3} placeholder="Optional notes…" />
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setExtrasOpen(true)} className="flex items-center gap-2 text-xs text-ink-2 hover:text-ink cursor-pointer">
              <Plus size={14} className="text-muted" /> Invoice, note, expiry
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted hidden sm:block">{isMac ? '⌘' : 'Ctrl'}↵ save &amp; add another</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="accent" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Add income'} <span className="opacity-60 text-xs">↵</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
