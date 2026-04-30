import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { sourcesApi, banksApi, settingsApi } from '@/lib/api'
import type { Source, BankAccount } from '@/lib/api'
import { CURRENCIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden">
      {children}
    </div>
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

  useEffect(() => {
    settingsApi.get().then(r => setCurrency(r.data.base_currency))
    sourcesApi.list().then(r => setSources(r.data))
    banksApi.list().then(r => setBanks(r.data))
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

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-base font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Configure your income tracker preferences</p>
      </div>

      {/* Base currency */}
      <section>
        <SectionHeader title="Base Display Currency" sub="All dashboard totals are shown in this currency." />
        <div className="flex gap-2 items-center">
          <Select value={currency} onChange={e => setCurrency(e.target.value)} className="w-36">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
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
            <p className="px-4 py-5 text-xs text-zinc-600">No sources yet.</p>
          )}
          {sources.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i !== sources.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <span className="text-sm text-zinc-300">{s.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="hover:text-red-400"
                onClick={() => setDeleteSource(s)}
              >
                <Trash2 size={13} />
              </Button>
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
            <p className="px-4 py-5 text-xs text-zinc-600">No bank accounts yet.</p>
          )}
          {banks.map((b, i) => (
            <div key={b.id} className={`flex items-center justify-between px-4 py-3 ${i !== banks.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <span className="text-sm text-zinc-300">{b.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="hover:text-red-400"
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
