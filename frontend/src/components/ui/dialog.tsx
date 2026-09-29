import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 bg-surface border border-line rounded-card shadow-2xl max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-ink-2 transition-colors p-1 rounded"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete' }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="w-full max-w-sm">
      <div className="px-6 py-5">
        <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
        <p className="text-sm text-ink-2 mb-5">{description}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md text-xs text-ink-2 hover:text-ink hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="h-8 px-3 rounded-md text-xs bg-coral/15 text-salmon hover:bg-coral/25 border border-coral/25 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
