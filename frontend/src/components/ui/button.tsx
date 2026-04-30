import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
          {
            'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-white/10': variant === 'default',
            'hover:bg-white/5 text-zinc-400 hover:text-zinc-200': variant === 'ghost',
            'border border-white/10 text-zinc-300 hover:bg-white/5 bg-transparent': variant === 'outline',
            'bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20': variant === 'destructive',
            'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20': variant === 'accent',
          },
          {
            'h-7 px-2.5 text-xs': size === 'sm',
            'h-9 px-3.5 text-sm': size === 'md',
            'h-10 px-5 text-sm': size === 'lg',
            'h-8 w-8 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
