'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronDown } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYMD = (d: Date) => format(d, 'yyyy-MM-dd')
const today = () => toYMD(new Date())
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d) }

const PRESETS = [
  { label: 'Hoje',          start: () => today(),                      end: () => today()                        },
  { label: 'Ontem',         start: () => daysAgo(1),                   end: () => daysAgo(1)                     },
  { label: '7 dias',        start: () => daysAgo(6),                   end: () => today()                        },
  { label: '14 dias',       start: () => daysAgo(13),                  end: () => today()                        },
  { label: '30 dias',       start: () => daysAgo(29),                  end: () => today()                        },
  { label: 'Este mês',      start: () => toYMD(startOfMonth(new Date())), end: () => today()                     },
  { label: 'Mês passado',   start: () => toYMD(startOfMonth(subMonths(new Date(), 1))),
                             end: () => toYMD(endOfMonth(subMonths(new Date(), 1)))                               },
  { label: '3 meses',       start: () => daysAgo(89),                  end: () => today()                        },
  { label: '6 meses',       start: () => daysAgo(179),                 end: () => today()                        },
]

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  startDate:   string   // YYYY-MM-DD
  endDate:     string   // YYYY-MM-DD
  activePreset?: string
  onChange: (start: string, end: string, preset?: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DateRangePicker({ startDate, endDate, activePreset, onChange }: Props) {
  const [open,  setOpen]  = useState(false)
  const [range, setRange] = useState<DateRange>({
    from: parseISO(startDate),
    to:   parseISO(endDate),
  })
  const ref = useRef<HTMLDivElement>(null)

  // Sync external changes into local state
  useEffect(() => {
    setRange({ from: parseISO(startDate), to: parseISO(endDate) })
  }, [startDate, endDate])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (r: DateRange | undefined) => {
    if (!r) return
    setRange(r)
    // Auto-apply and close once both dates are chosen
    if (r.from && r.to) {
      onChange(toYMD(r.from), toYMD(r.to))
      setOpen(false)
    }
  }

  const applyPreset = (p: typeof PRESETS[0]) => {
    const start = p.start()
    const end   = p.end()
    setRange({ from: parseISO(start), to: parseISO(end) })
    onChange(start, end, p.label)
    setOpen(false)
  }

  // ── Formatted label ────────────────────────────────────────────────────────
  const label = (() => {
    try {
      const from = parseISO(startDate)
      const to   = parseISO(endDate)
      if (startDate === endDate) return format(from, "d 'de' MMM yyyy", { locale: ptBR })
      const sameYear = from.getFullYear() === to.getFullYear()
      return sameYear
        ? `${format(from, 'd MMM', { locale: ptBR })} → ${format(to, 'd MMM yyyy', { locale: ptBR })}`
        : `${format(from, 'd MMM yyyy', { locale: ptBR })} → ${format(to, 'd MMM yyyy', { locale: ptBR })}`
    } catch { return `${startDate} → ${endDate}` }
  })()

  // ── react-day-picker classNames (dark theme) ───────────────────────────────
  const rdpClasses = {
    root:              '',
    months:            'flex gap-6',
    month:             '',
    month_caption:     'flex items-center justify-between px-1 mb-2',
    caption_label:     'text-sm font-semibold text-gray-100 capitalize',
    nav:               'flex items-center gap-1',
    button_next:       'w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-surface-700 hover:text-gray-100 transition-colors',
    button_previous:   'w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-surface-700 hover:text-gray-100 transition-colors',
    chevron:           'fill-current',
    month_grid:        'w-full border-collapse',
    weekdays:          '',
    weekday:           'w-9 h-7 text-center text-xs font-medium text-gray-600',
    weeks:             '',
    week:              '',
    day:               'w-9 h-9 text-center p-0 relative',
    day_button:        'w-9 h-9 text-sm text-gray-300 rounded-full hover:bg-surface-700 hover:text-gray-100 transition-colors outline-none',
    today:             'nohau-today',
    outside:           'opacity-30',
    disabled:          'opacity-20 pointer-events-none',
    range_start:       'nohau-range-start',
    range_end:         'nohau-range-end',
    range_middle:      'nohau-range-middle',
    selected:          'nohau-selected',
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors
          ${open
            ? 'bg-surface-750 border-indigo-500/50 text-gray-100'
            : 'bg-surface-800 border-surface-700 text-gray-300 hover:border-surface-600 hover:text-gray-100'
          }`}
      >
        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-medium">{label}</span>
        {activePreset && (
          <span className="text-xs text-gray-500">· {activePreset}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 flex bg-surface-800 border border-surface-700
          rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          {/* Presets sidebar */}
          <div className="flex flex-col gap-0.5 p-2 border-r border-surface-700 min-w-[120px]">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 pb-1 pt-0.5">
              Período
            </p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${activePreset === p.label
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ptBR}
              classNames={rdpClasses}
              disabled={{ after: new Date() }}
            />
            {/* Instruction hint */}
            {range.from && !range.to && (
              <p className="text-xs text-center text-gray-600 mt-2">
                Selecione a data final
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
