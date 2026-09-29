import { useEffect, useRef, useState } from 'react'
import { Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { sourcesApi, banksApi, settingsApi, dataApi } from '@/lib/api'
import type { Source, BankAccount, BackupInfo } from '@/lib/api'
import { CURRENCIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { ImportDialog } from '@/components/ImportDialog'

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-card overflow-hidden">
      {children}
    </div>
  )
}

function SourceDefaultInput({ label, value, max, integer, onSave }: {
  label: string
  value: number | null
  max?: number
  integer?: boolean
  onSave: (v: number | null) => Promise<void>
}) {
  const shown = value === null ? '' : String(value)
  const [draft, setDraft] = useState<string | null>(null) // null = not being edited

  const commit = async () => {
    const t = (draft ?? shown).trim()
    setDraft(null)
    if (t === shown) return
    const n = t === '' ? null : Number(t)
    const ok = n === null || (Number.isFinite(n) && n >= 0 && (max === undefined || n <= max) && (!integer || Number.isInteger(n)))
    await onSave(ok ? n : NaN)
  }

  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      {label}
      <Input
        value={draft ?? shown}
        inputMode={integer ? 'numeric' : 'decimal'}
        placeholder="—"
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-28"
      />
    </label>
  )
}

export default function Settings() {
  const { toast } = useToast()
  const [currency, setCurrency] = useState('USD')
  const [sources, setSources] = useState<Source[]>([])
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [newSource, setNewSource] = useState('')
  const [newBank, setNewBank] = useState('')
  const [deleteSource, setDeleteSource] = useState<Source | null>(null)
  const [deleteBank, setDeleteBank] = useState<BankAccount | null>(null)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [backupDir, setBackupDir] = useState('')
  const [backingUp, setBackingUp] = useState(false)
  const [importSource, setImportSource] = useState<{ file: File } | { snapshot: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const pickFile = (f?: File) => {
    if (f) setImportSource({ file: f })
    if (fileInput.current) fileInput.current.value = ''
  }

  const refreshAll = () => {
    sourcesApi.list().then(r => setSources(r.data))
    banksApi.list().then(r => setBanks(r.data))
    settingsApi.get().then(r => setCurrency(r.data.base_currency))
    loadBackups()
  }

  const loadBackups = () =>
    dataApi.backups().then(r => {
      setBackups(r.data.backups)
      setBackupDir(r.data.directory)
    })

  useEffect(() => {
    settingsApi.get().then(r => setCurrency(r.data.base_currency))
    sourcesApi.list().then(r => setSources(r.data))
    banksApi.list().then(r => setBanks(r.data))
    loadBackups()
  }, [])

  const handleSaveCurrency = async () => {
    setSavingCurrency(true)
    try {
      await settingsApi.update(currency)
      toast('Base currency updated')
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSavingCurrency(false)
    }
  }

  const handleAddSource = async () => {
    if (!newSource.trim()) return
    try {
      const r = await sourcesApi.create(newSource.trim())
      setSources(prev => [...prev, r.data])
      setNewSource('')
      toast('Source added')
    } catch {
      toast('Source already exists or error', 'error')
    }
  }

  const handleUpdateSource = async (
    s: Source,
    patch: { default_fee_percent?: number | null; clearing_days?: number | null },
  ) => {
    if (Object.values(patch).some(v => typeof v === 'number' && Number.isNaN(v))) {
      toast('Enter a fee from 0 to 100 and whole days of 0 or more', 'error')
      return
    }
    try {
      const r = await sourcesApi.update(s.id, patch)
      setSources(prev => prev.map(x => (x.id === s.id ? r.data : x)))
      toast('Source updated')
    } catch {
      toast('Failed to update source', 'error')
    }
  }

  const handleDeleteSource = async (s: Source) => {
    try {
      await sourcesApi.delete(s.id)
      setSources(prev => prev.filter(x => x.id !== s.id))
      toast('Source deleted')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || 'Cannot delete source', 'error')
    }
  }

  const handleAddBank = async () => {
    if (!newBank.trim()) return
    try {
      const r = await banksApi.create(newBank.trim())
      setBanks(prev => [...prev, r.data])
      setNewBank('')
      toast('Bank account added')
    } catch {
      toast('Bank account already exists or error', 'error')
    }
  }

  const handleDeleteBank = async (b: BankAccount) => {
    try {
      await banksApi.delete(b.id)
      setBanks(prev => prev.filter(x => x.id !== b.id))
      toast('Bank account deleted')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg || 'Cannot delete bank account', 'error')
    }
  }

  const handleBackupNow = async () => {
    setBackingUp(true)
    try {
      await dataApi.createBackup()
      await loadBackups()
      toast('Backup created')
    } catch {
      toast('Backup failed', 'error')
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="text-xs text-muted mt-0.5">Configure your income tracker preferences</p>
      </div>

      {/* Base currency */}
      <section>
        <SectionHeader title="Base Display Currency" sub="All dashboard totals are shown in this currency." />
        <div className="flex gap-2 items-center">
          <Select value={currency} onChange={setCurrency} className="w-36" options={CURRENCIES.map(c => ({ value: c, label: c }))} />
          <Button variant="accent" size="md" onClick={handleSaveCurrency} disabled={savingCurrency}>
            {savingCurrency ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </section>

      <div className="border-t border-white/[0.05]" />

      {/* Sources */}
      <section>
        <SectionHeader title="Income Sources" sub="Where your money comes from — platforms, clients, etc." />
        <ListCard>
          {sources.length === 0 && (
            <p className="px-4 py-5 text-xs text-muted">No sources yet.</p>
          )}
          {sources.map((s, i) => (
            <div key={s.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${i !== sources.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <span className="text-sm text-ink-2 min-w-[8rem]">{s.name}</span>
              <div className="flex items-end gap-3">
                <SourceDefaultInput
                  label="Usual fee (%)"
                  value={s.default_fee_percent}
                  max={100}
                  onSave={v => handleUpdateSource(s, { default_fee_percent: v })}
                />
                <SourceDefaultInput
                  label="Days to clear"
                  value={s.clearing_days}
                  integer
                  onSave={v => handleUpdateSource(s, { clearing_days: v })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-salmon"
                  onClick={() => setDeleteSource(s)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </ListCard>
        <div className="flex gap-2 mt-3">
          <Input
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
            placeholder="New source name…"
            onKeyDown={e => e.key === 'Enter' && handleAddSource()}
            className="flex-1"
          />
          <Button variant="default" onClick={handleAddSource} size="md">
            <Plus size={14} />
            Add
          </Button>
        </div>
      </section>

      <div className="border-t border-white/[0.05]" />

      {/* Bank accounts */}
      <section>
        <SectionHeader title="Bank Accounts" sub="Where money lands — banks, e-wallets, Wise, PayPal, etc." />
        <ListCard>
          {banks.length === 0 && (
            <p className="px-4 py-5 text-xs text-muted">No bank accounts yet.</p>
          )}
          {banks.map((b, i) => (
            <div key={b.id} className={`flex items-center justify-between px-4 py-3 ${i !== banks.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <span className="text-sm text-ink-2">{b.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="hover:text-salmon"
                onClick={() => setDeleteBank(b)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </ListCard>
        <div className="flex gap-2 mt-3">
          <Input
            value={newBank}
            onChange={e => setNewBank(e.target.value)}
            placeholder="New bank account name…"
            onKeyDown={e => e.key === 'Enter' && handleAddBank()}
            className="flex-1"
          />
          <Button variant="default" onClick={handleAddBank} size="md">
            <Plus size={14} />
            Add
          </Button>
        </div>
      </section>

      <div className="border-t border-white/[0.05]" />

      {/* Data & backups */}
      <section>
        <SectionHeader
          title="Data & Backups"
          sub={`A snapshot is taken automatically every day and on shutdown. Stored in ${backupDir || '…'}`}
        />
        <div className="flex flex-wrap gap-2 mb-3">
          <a href="/api/data/export.json" download><Button variant="default" size="md"><Download size={14} />Export JSON</Button></a>
          <a href="/api/data/export.csv" download><Button variant="default" size="md"><Download size={14} />Export CSV</Button></a>
          <Button variant="accent" size="md" onClick={handleBackupNow} disabled={backingUp}>
            {backingUp ? 'Backing up…' : 'Back up now'}
          </Button>
        </div>
        <div
          onClick={() => fileInput.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
          className={`mb-3 flex items-center justify-center gap-2 rounded-card border border-dashed px-4 py-5 text-xs cursor-pointer transition-colors ${dragging ? 'border-accent/60 bg-white/[0.04] text-ink' : 'border-white/[0.12] text-muted hover:text-ink-2 hover:bg-white/[0.02]'}`}
        >
          <Upload size={14} />
          Import — drop an export (.json) or backup (.db) here, or click to choose
          <input ref={fileInput} type="file" accept=".json,.db,application/json" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
        </div>
        <ListCard>
          {backups.length === 0 && <p className="px-4 py-5 text-xs text-muted">No backups yet.</p>}
          {backups.map((b, i) => (
            <div key={b.name} className={`flex items-center justify-between px-4 py-3 ${i !== backups.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <div>
                <span className="text-sm text-ink-2">{b.created_at.replace('T', ' ')}</span>
                <span className="text-xs text-muted ml-3">{Math.max(1, Math.round(b.size / 1024))} KiB</span>
              </div>
              <div className="flex items-center">
                <Button size="icon" variant="ghost" title="Restore this backup" onClick={() => setImportSource({ snapshot: b.name })}>
                  <RotateCcw size={13} />
                </Button>
                <a href={`/api/data/backups/${b.name}`} download title="Download">
                  <Button size="icon" variant="ghost"><Download size={13} /></Button>
                </a>
              </div>
            </div>
          ))}
        </ListCard>
      </section>

      <ImportDialog source={importSource} onClose={() => setImportSource(null)} onDone={refreshAll} />

      <ConfirmDialog
        open={!!deleteSource}
        onClose={() => setDeleteSource(null)}
        onConfirm={() => deleteSource && handleDeleteSource(deleteSource)}
        title="Delete source?"
        description={`Remove "${deleteSource?.name}"? This will fail if any entries still reference it.`}
      />
      <ConfirmDialog
        open={!!deleteBank}
        onClose={() => setDeleteBank(null)}
        onConfirm={() => deleteBank && handleDeleteBank(deleteBank)}
        title="Delete bank account?"
        description={`Remove "${deleteBank?.name}"? This will fail if any entries still reference it.`}
      />
    </div>
  )
}
