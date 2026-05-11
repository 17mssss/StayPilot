import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option { label: string; value: string }

interface SelectProps {
  value: string
  onChange: (val: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export default function Select({ value, onChange, options, placeholder = 'Sélectionner…', className = '' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 min-w-[150px] px-3 py-2 text-sm rounded-xl border transition-all
          bg-surface text-dark border-border
          hover:border-primary/50 focus:outline-none
          ${open ? 'border-primary ring-2 ring-primary/10' : ''}
        `}
      >
        <span className={selected ? 'text-dark' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-full
            bg-surface border border-border rounded-2xl
            shadow-[0_12px_40px_rgba(0,0,0,0.15)]
            py-2 overflow-hidden"
          style={{
            transformOrigin: 'top center',
            animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div className="max-h-64 overflow-y-auto">
            {/* Placeholder */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded-lg mx-0 transition-colors
                ${!value ? 'text-primary font-semibold' : 'text-muted hover:bg-border-light hover:text-dark'}
              `}
            >
              {placeholder}
            </button>

            {/* Options */}
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors
                    ${isSelected ? 'text-primary font-semibold' : 'text-dark hover:bg-border-light'}
                  `}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  )
}
