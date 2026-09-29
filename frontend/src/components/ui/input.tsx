import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-9 rounded-md bg-raised border border-line px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold/50 transition-colors disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'
