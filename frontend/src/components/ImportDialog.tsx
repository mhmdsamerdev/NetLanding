import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react'
import { dataApi } from '@/lib/api'
import type { ImportPreview, ImportResult } from '@/lib/api'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Source = { file: File } | { snapshot: string }
type Mode = 'merge' | 'replace'

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Something went wrong.'

function Stat({ label, file, current }: { label: string; file: number; current: number }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-ink-2">
        <span className="text-ink font-medium">{file}</span>
        <span className="text-muted"> in file · {current} now</span>
      </span>
    </div>
  )
}

interface Props {
  source: Source | null
  onClose: () => void
  onDone: () => void
}

export function ImportDialog({ source, onClose, onDone }: Props) {
  // Dialog only mounts its children while open, so ImportBody starts fresh each time.
  return (
    <Dialog open={!!source} onClose={onClose} title="Import data" className="w-full max-w-md">
      {source && <ImportBody source={source} onClose={onClose} onDone={onDone} />}
    </Dialog>
  )
}

function ImportBody({ source, onClose, onDone }: Props & { source: Source }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<Mode>('merge')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [undone, setUndone] = useState(false)

  useEffect(() => {
    let live = true
    const req = 'file' in source ? dataApi.previewFile(source.file) : dataApi.previewSnapshot(source.snapshot)
    req
      .then(r => {
        if (!live) return
        setPreview(r.data)
        // Empty database or restoring a snapshot → replace is the natural choice.
        setMode(r.data.current.entries === 0 || 'snapshot' in source ? 'replace' : 'merge')
      })
      .catch(e => live && setError(errMsg(e)))
    return () => { live = false }
  }, [source])

  const run = async () => {
    if (!preview) return
    setBusy(true); setError('')
    try {
      const r = await dataApi.applyImport(preview.token, mode)
      setResult(r.data)
      onDone()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    if (!result?.safety_snapshot) return
    setBusy(true); setError('')
    try {
      const p = await dataApi.previewSnapshot(result.safety_snapshot)
      await dataApi.applyImport(p.data.token, 'replace')
      setUndone(true)
      onDone()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const range = preview?.file.first_date
    ? preview.file.first_date === preview.file.last_date
      ? preview.file.first_date
      : `${preview.file.first_date} → ${preview.file.last_date}`
    : null

  const option = (value: Mode, title: string, body: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={cn(
        'w-full text-left rounded-md border px-3 py-2.5 transition-colors',
        mode === value ? 'border-accent/60 bg-white/[0.04]' : 'border-line hover:bg-white/[0.02]'
      )}
    >
      <div className="text-sm text-ink">{title}</div>
      <div className="text-xs text-muted mt-0.5">{body}</div>
    </button>
  )

  return (
      <div className="px-6 py-5 space-y-4">
        {!preview && !error && <p className="text-sm text-muted">Reading file…</p>}

        {error && (
          <div className="flex gap-2 text-xs text-salmon bg-coral/10 border border-coral/25 rounded-md px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {preview && !result && (
          <>
            <div className="rounded-md border border-line px-3 py-2 divide-y divide-white/[0.05]">
              <Stat label="Entries" file={preview.file.entries} current={preview.current.entries} />
              <Stat label="Sources" file={preview.file.sources} current={preview.current.sources} />
              <Stat label="Bank accounts" file={preview.file.bank_accounts} current={preview.current.bank_accounts} />
              {(range || preview.exported_at) && (
                <div className="py-1.5 text-xs text-muted">
                  {range && <>Entries dated {range}. </>}
                  {preview.exported_at && <>Saved {preview.exported_at.replace('T', ' ').slice(0, 16)}.</>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {option(
                'merge',
                'Merge — add what’s missing',
                `${preview.merge.new} new ${preview.merge.new === 1 ? 'entry' : 'entries'} will be added, ${preview.merge.duplicates} already here will be skipped. Your current data stays.`
              )}
              {option(
                'replace',
                'Replace everything',
                `Your ${preview.current.entries} current ${preview.current.entries === 1 ? 'entry is' : 'entries are'} swapped for the file’s ${preview.file.entries}.`
              )}
            </div>

            <p className="text-xs text-muted">A snapshot of your current data is saved first, so you can undo.</p>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="h-8 px-3 rounded-md text-xs text-ink-2 hover:text-ink hover:bg-white/5">
                Cancel
              </button>
              <Button variant={mode === 'replace' ? 'default' : 'accent'} size="md" onClick={run} disabled={busy || (mode === 'merge' && preview.merge.new === 0)}>
                {busy ? 'Importing…' : mode === 'merge' ? `Add ${preview.merge.new}` : 'Replace data'}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex gap-2 items-start text-sm text-ink-2">
              <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
              <span>
                {undone
                  ? 'Import undone — your previous data is back.'
                  : mode === 'replace'
                    ? `Restored ${result.added} ${result.added === 1 ? 'entry' : 'entries'}.`
                    : `Added ${result.added} ${result.added === 1 ? 'entry' : 'entries'}, skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`}
              </span>
            </div>
            <div className="flex justify-between">
              {result.safety_snapshot && !undone ? (
                <Button variant="ghost" size="md" onClick={undo} disabled={busy}>
                  <Undo2 size={14} />
                  {busy ? 'Undoing…' : 'Undo'}
                </Button>
              ) : <span />}
              <Button variant="accent" size="md" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
  )
}
