import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { entriesApi, sourcesApi, banksApi } from '@/lib/api'
import type { Entry, EntryPayload, Source, BankAccount } from '@/lib/api'
import { CURRENCIES, STATUSES, cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { AmountInput } from '@/components/ui/amount-input'
import { Textarea } from '@/components/ui/textarea'
import { todayISO } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface EntryModalProps {
  open: boolean
  entry?: Entry | null
  initialSources?: Source[]
  onClose: () => void
  onSaved: (entry: Entry) => void
}

const emptyPayload = (): EntryPayload => ({
  project_client_name: '',
  gross_amount: 0,
  gross_currency: 'USD',
  platform_fee: 0,
  withdrawal_fee: 0,
  source_id: null,
  bank_account_id: null,
  status: 'Pending',
  date_received: null,
  date_available: null,
  date_expiry: null,
  current_location: null,
  date_withdrawn: null,
  date_cleared: null,
  invoice_ref: null,
  notes: null,
})

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-ink-2 mb-1.5 uppercase tracking-wider">
        {label}{required && <span className="text-salmon ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function EntryModal({ open, entry, initialSources, onClose, onSaved }: EntryModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<EntryPayload>(emptyPayload())
  const [sources, setSources] = useState<Source[]>([])
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [addingSource, setAddingSource] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initialSources && initialSources.length > 0) {
      setSources(initialSources)
    } else {
      sourcesApi.list().then(r => setSources(r.data))
    }
    banksApi.list().then(r => setBanks(r.data))
    if (entry) {
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
      setForm(emptyPayload())
    }
  }, [open, entry])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

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

  const netIncome = (form.gross_amount || 0) - (form.platform_fee || 0) - (form.withdrawal_fee || 0)

  const showBankField = form.status === 'Withdrawn' || form.status === 'In Bank'

  let daysToClear: number | null = null
  if (form.date_cleared && form.date_withdrawn) {
    const diff = new Date(form.date_cleared).getTime() - new Date(form.date_withdrawn).getTime()
    daysToClear = Math.round(diff / (1000 * 60 * 60 * 24))
  }

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    try {
      const r = await sourcesApi.create(newSourceName.trim())
      setSources(prev => [...prev, r.data])
      set('source_id', r.data.id)
      setNewSourceName('')
      setAddingSource(false)
      toast('Source added')
    } catch {
      toast('Source already exists or error occurred', 'error')
    }
  }

  const handleSave = async () => {
    if (!form.project_client_name.trim()) { toast('Project/Client name is required', 'error'); return }
    if (!form.gross_amount || form.gross_amount <= 0) { toast('Gross amount must be > 0', 'error'); return }
    setSaving(true)
    try {
      let result: { data: Entry }
      if (entry) {
        result = await entriesApi.update(entry.id, form)
        toast('Entry updated')
      } else {
        result = await entriesApi.create(form)
        toast('Entry created')
      }
      onSaved(result.data)
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || 'Failed to save entry', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto z-10 w-full max-w-xl bg-surface border-l border-white/[0.07] h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-semibold text-ink">{entry ? 'Edit Entry' : 'New Entry'}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink-2 transition-colors p-1 rounded">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <Field label="Project / Client Name" required>
            <Input
              value={form.project_client_name}
              onChange={e => set('project_client_name', e.target.value)}
              placeholder="e.g. Acme Corp — Logo Design"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gross Amount" required>
              <AmountInput value={form.gross_amount} onChange={v => set('gross_amount', v)} placeholder="0.00" />
            </Field>
            <Field label="Currency">
              <Select value={form.gross_currency} onChange={v => set('gross_currency', v)} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform Fee">
              <AmountInput value={form.platform_fee} onChange={v => set('platform_fee', v)} placeholder="0.00" />
            </Field>
            <Field label="Withdrawal Fee">
              <AmountInput value={form.withdrawal_fee} onChange={v => set('withdrawal_fee', v)} placeholder="0.00" />
            </Field>
          </div>

          {/* Net income live preview */}
          <div className="flex items-center justify-between bg-gold/10 border border-gold/15 rounded-lg px-4 py-3">
            <span className="text-[11px] uppercase tracking-wider text-gold/60">Net Income</span>
            <span className={cn('tabular-nums text-xl font-medium', netIncome < 0 ? 'text-salmon' : 'text-gold')}>
              {form.gross_currency} {netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Source */}
          <Field label="Source">
            {addingSource ? (
              <div className="flex gap-2">
                <Input
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Upwork"
                  onKeyDown={e => e.key === 'Enter' && handleAddSource()}
                  autoFocus
                />
                <Button size="sm" onClick={handleAddSource}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingSource(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={form.source_id != null ? String(form.source_id) : ''}
                    onChange={v => set('source_id', v ? Number(v) : null)}
                    options={[{ value: '', label: '— No source —' }, ...sources.map(s => ({ value: String(s.id), label: s.name }))]}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAddingSource(true)} title="Add new source">
                  <Plus size={13} />
                </Button>
              </div>
            )}
          </Field>

          {/* Status */}
          <Field label="Status">
            <div className="flex gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    form.status === s
                      ? s === 'Pending' ? 'bg-lilac/20 text-lilac border-lilac/30'
                        : s === 'Available' ? 'bg-sky/20 text-sky border-sky/30'
                        : s === 'Withdrawn' ? 'bg-white/10 text-ink-2 border-white/20'
                        : 'bg-gold/20 text-gold border-gold/30'
                      : 'bg-transparent text-muted border-white/[0.07] hover:bg-white/5'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Bank account — conditional */}
          {showBankField && (
            <Field label="Bank Account">
              <Select
                value={form.bank_account_id != null ? String(form.bank_account_id) : ''}
                onChange={v => set('bank_account_id', v ? Number(v) : null)}
                options={[{ value: '', label: '— Select bank account —' }, ...banks.map(b => ({ value: String(b.id), label: b.name }))]}
              />
            </Field>
          )}

          <div className="border-t border-white/[0.05] pt-4 grid grid-cols-2 gap-3">
            <Field label="Date Received">
              <DateInput value={form.date_received} onChange={v => set('date_received', v || null)} />
            </Field>
            <Field label="Date Available">
              <DateInput value={form.date_available} onChange={v => set('date_available', v || null)} min={form.date_received || undefined} />
            </Field>
            <Field label="Date Expiry">
              <DateInput value={form.date_expiry} onChange={v => set('date_expiry', v || null)} />
            </Field>
            {(form.status === 'Withdrawn' || form.status === 'In Bank') && (
              <Field label="Date Withdrawn">
                <DateInput value={form.date_withdrawn} onChange={v => set('date_withdrawn', v || null)} min={form.date_received || undefined} />
              </Field>
            )}
            {form.status === 'In Bank' && (
              <Field label="Date Cleared">
                <DateInput value={form.date_cleared} onChange={v => set('date_cleared', v || null)} min={form.date_withdrawn || undefined} />
              </Field>
            )}
          </div>

          {daysToClear !== null && daysToClear >= 0 && (
            <div className="text-xs text-muted flex items-center gap-1.5 -mt-1">
              <span className="text-muted">Days to clear:</span>
              <span className="tabular-nums text-ink-2">{daysToClear}d</span>
            </div>
          )}

          <Field label="Current Location">
            <Input
              value={form.current_location ?? ''}
              onChange={e => set('current_location', e.target.value || null)}
              placeholder="e.g. Upwork Wallet"
            />
          </Field>

          <Field label="Invoice / Ref">
            <Input
              value={form.invoice_ref ?? ''}
              onChange={e => set('invoice_ref', e.target.value || null)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value || null)}
              rows={3}
              placeholder="Optional notes…"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : entry ? 'Save Changes' : 'Create Entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}
