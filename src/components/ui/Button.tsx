'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed select-none',
          {
            // Variants
            'bg-orange-500 hover:bg-orange-600 text-white keep-white focus:ring-orange-500 shadow-sm shadow-orange-900/30':
              variant === 'primary',
            'bg-surface-700 hover:bg-surface-600 text-gray-200 focus:ring-surface-500 border border-surface-600':
              variant === 'secondary',
            'bg-transparent hover:bg-surface-750 text-gray-300 hover:text-white focus:ring-surface-500':
              variant === 'ghost',
            'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 focus:ring-red-500':
              variant === 'danger',
            'bg-transparent border border-surface-600 hover:border-orange-500 text-gray-300 hover:text-white focus:ring-orange-500':
              variant === 'outline',
            'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 focus:ring-emerald-500':
              variant === 'success',
            // Sizes
            'text-xs px-2.5 py-1.5 h-7': size === 'sm',
            'text-sm px-4 py-2 h-9': size === 'md',
            'text-base px-6 py-2.5 h-11': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
