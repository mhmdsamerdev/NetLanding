import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
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

type SortKey = 'project_client_name' | 'source' | 'gross_amount' | 'net_income' | 'status' | 'date_received'
type SortDir = 'asc' | 'desc'

const SORT_COLS: { label: string; key: SortKey; defaultDir: SortDir }[] = [
  { label: 'Project / Client', key: 'project_client_name', defaultDir: 'asc' },
  { label: 'Source',           key: 'source',              defaultDir: 'asc' },
  { label: 'Gross',            key: 'gross_amount',        defaultDir: 'desc' },
  { label: 'Net',              key: 'net_income',          defaultDir: 'desc' },
  { label: 'Status',           key: 'status',              defaultDir: 'asc' },
  { label: 'Date Received',    key: 'date_received',       defaultDir: 'desc' },
]

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
  const [sortKey, setSortKey] = useState<SortKey>('date_received')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (col: typeof SORT_COLS[number]) => {
    if (sortKey === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(col.key)
      setSortDir(col.defaultDir)
    }
  }

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
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      toast('Entry deleted')
    } catch {
      toast('Failed to delete entry', 'error')
    }
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let av: string | number
      let bv: string | number
      switch (sortKey) {
        case 'project_client_name': av = a.project_client_name.toLowerCase(); bv = b.project_client_name.toLowerCase(); break
        case 'source':              av = (a.source?.name ?? '').toLowerCase(); bv = (b.source?.name ?? '').toLowerCase(); break
        case 'gross_amount':        av = a.gross_amount;  bv = b.gross_amount;  break
        case 'net_income':          av = a.net_income;    bv = b.net_income;    break
        case 'status':              av = a.status.toLowerCase(); bv = b.status.toLowerCase(); break
        case 'date_received':       av = a.date_received ?? ''; bv = b.date_received ?? ''; break
        default: return 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [entries, sortKey, sortDir])

  const paginated = sortedEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
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
              {SORT_COLS.map(col => (
                <th
                  key={col.key}
                  className="text-left text-[10px] uppercase tracking-widest px-4 py-3 font-normal cursor-pointer select-none"
                  onClick={() => handleSort(col)}
                >
                  <span className={`inline-flex items-center gap-1 transition-colors ${
                    sortKey === col.key ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
                  }`}>
                    {col.label}
                    {sortKey === col.key
                      ? (sortDir === 'asc'
                          ? <ChevronUp size={10} className="shrink-0" />
                          : <ChevronDown size={10} className="shrink-0" />)
                      : <ChevronDown size={10} className="shrink-0 opacity-25" />}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3" />
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
        initialSources={sources}
        onClose={() => { setModalOpen(false); setEditEntry(null) }}
        onSaved={(saved) => {
          setEntries(prev =>
            prev.some(e => e.id === saved.id)
              ? prev.map(e => e.id === saved.id ? saved : e)
              : [saved, ...prev]
          )
        }}
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
