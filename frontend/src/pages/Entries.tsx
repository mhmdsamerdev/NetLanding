import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { entriesApi, sourcesApi } from '@/lib/api'
import type { Entry, Source } from '@/lib/api'
import { formatCurrency, formatDate, statusColor, STATUSES } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/dialog'
import EntryModal from '@/components/EntryModal'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 20

export default function Entries() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<Entry[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '')
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source_id') ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (sourceFilter) params.source_id = sourceFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    const r = await entriesApi.list(params)
    setEntries(r.data)
    setPage(0)
    setLoading(false)
  }, [search, statusFilter, sourceFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => { sourcesApi.list().then(r => setSources(r.data)) }, [])

  useEffect(() => {
    const p: Record<string, string> = {}
    if (search) p.search = search
    if (statusFilter) p.status = statusFilter
    setSearchParams(p, { replace: true })
  }, [search, statusFilter, setSearchParams])

  const handleDelete = async (entry: Entry) => {
    try {
      await entriesApi.delete(entry.id)
      toast('Entry deleted')
      load()
    } catch {
      toast('Failed to delete entry', 'error')
    }
  }

  const paginated = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(entries.length / PAGE_SIZE)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Entries</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{entries.length} total</p>
        </div>
        <Button variant="accent" size="md" onClick={() => { setEditEntry(null); setModalOpen(true) }}>
          <Plus size={14} />
          New Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <Input
            className="pl-8"
            placeholder="Search project / client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="w-40">
          <option value="">All sources</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" title="Date from" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" title="Date to" />
      </div>

      {/* Table */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Project / Client', 'Source', 'Gross', 'Net', 'Status', 'Date Received', ''].map(h => (
                <th key={h} className="text-left text-[10px] uppercase tracking-widest text-zinc-600 px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-600 text-xs">Loading…</td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-600 text-xs">
                  {entries.length === 0 ? 'No entries yet. Create your first one!' : 'No results match your filters.'}
                </td>
              </tr>
            ) : paginated.map((e, i) => (
              <tr
                key={e.id}
                className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                onClick={() => { setEditEntry(e); setModalOpen(true) }}
              >
                <td className="px-4 py-3 text-zinc-200 max-w-[200px]">
                  <p className="truncate font-medium">{e.project_client_name}</p>
                  {e.invoice_ref && <p className="text-[10px] text-zinc-600 truncate">{e.invoice_ref}</p>}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{e.source?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-zinc-200">{formatCurrency(e.gross_amount, e.gross_currency)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-emerald-400">{formatCurrency(e.net_income, e.gross_currency)}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusColor(e.status)}>{e.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{formatDate(e.date_received)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end" onClick={ev => ev.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditEntry(e); setModalOpen(true) }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:text-red-400"
                      onClick={() => setDeleteTarget(e)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1.5">
            <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <EntryModal
        open={modalOpen}
        entry={editEntry}
        onClose={() => { setModalOpen(false); setEditEntry(null) }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete entry?"
        description={`This will permanently remove "${deleteTarget?.project_client_name}". This action cannot be undone.`}
      />
    </div>
  )
}
