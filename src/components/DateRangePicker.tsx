'use client'

import { useState, useRef, useEffect } from 'react'
import {
  format, parseISO, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth,
  isToday, isAfter, isBefore, isWithinInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYMD  = (d: Date) => format(d, 'yyyy-MM-dd')
const todayS = ()        => toYMD(new Date())
const ago    = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d) }

const PRESETS = [
  { label: 'Hoje',          s: () => todayS(),                               e: () => todayS()        },
  { label: 'Ontem',         s: () => ago(1),                                 e: () => ago(1)          },
  { label: '7 dias',        s: () => ago(6),                                 e: () => todayS()        },
  { label: '14 dias',       s: () => ago(13),                                e: () => todayS()        },
  { label: '30 dias',       s: () => ago(29),                                e: () => todayS()        },
  { label: 'Este mês',      s: () => toYMD(startOfMonth(new Date())),        e: () => todayS()        },
  { label: 'Mês passado',   s: () => toYMD(startOfMonth(subMonths(new Date(), 1))),
                             e: () => toYMD(endOfMonth(subMonths(new Date(), 1)))                      },
  { label: '3 meses',       s: () => ago(89),                                e: () => todayS()        },
  { label: '6 meses',       s: () => ago(179),                               e: () => todayS()        },
]

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Build 6-week grid for a given month
function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const days  = eachDayOfInterval({
    start: startOfWeek(first, { weekStartsOn: 0 }),
    end:   endOfWeek(last,   { weekStartsOn: 0 }),
  })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  startDate:    string
  endDate:      string
  activePreset?: string
  onChange: (start: string, end: string, preset?: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DateRangePicker({ startDate, endDate, activePreset, onChange }: Props) {
  const [open,    setOpen]    = useState(false)
  const [anchor,  setAnchor]  = useState<Date | null>(null)  // first click
  const [hovered, setHovered] = useState<Date | null>(null)
  const [viewDate, setView]   = useState(() => startOfMonth(parseISO(startDate)))
  const ref = useRef<HTMLDivElement>(null)

  const from = parseISO(startDate)
  const to   = parseISO(endDate)

  useEffect(() => { setView(startOfMonth(parseISO(startDate))) }, [startDate])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setAnchor(null); setHovered(null)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Interaction ────────────────────────────────────────────────────────────
  const clickDay = (day: Date) => {
    if (isAfter(day, new Date())) return
    if (!anchor) {
      setAnchor(day); setHovered(null)
    } else {
      const [s, e] = isBefore(day, anchor) ? [day, anchor] : [anchor, day]
      onChange(toYMD(s), toYMD(e))
      setAnchor(null); setHovered(null); setOpen(false)
    }
  }

  const hoverDay = (day: Date) => { if (anchor) setHovered(day) }

  // Visual range: during selection shows anchor→hover; otherwise shows from→to
  const [visFrom, visTo] = (() => {
    if (anchor) {
      const end = hovered ?? anchor
      return isBefore(anchor, end) ? [anchor, end] : [end, anchor]
    }
    return [from, to]
  })()

  const applyPreset = (p: typeof PRESETS[0]) => {
    onChange(p.s(), p.e(), p.label)
    setAnchor(null); setOpen(false)
  }

  // ── Trigger label ──────────────────────────────────────────────────────────
  const label = (() => {
    try {
      if (startDate === endDate) return format(from, "d 'de' MMM yyyy", { locale: ptBR })
      const sameYear = from.getFullYear() === to.getFullYear()
      return sameYear
        ? `${format(from, 'd MMM', { locale: ptBR })} → ${format(to, 'd MMM yyyy', { locale: ptBR })}`
        : `${format(from, 'd MMM yyyy', { locale: ptBR })} → ${format(to, 'd MMM yyyy', { locale: ptBR })}`
    } catch { return `${startDate} → ${endDate}` }
  })()

  // ── Day cell ───────────────────────────────────────────────────────────────
  const renderDay = (day: Date) => {
    const outside  = !isSameMonth(day, viewDate)
    const future   = isAfter(day, new Date())
    const todayDay = isToday(day)
    const isStart  = isSameDay(day, visFrom)
    const isEnd    = isSameDay(day, visTo)
    const single   = isSameDay(visFrom, visTo)
    const inRange  = !single && isWithinInterval(day, { start: visFrom, end: visTo })
    const disabled = outside || future

    // Coloured strip behind the button (for the range background)
    let cellBg = ''
    if (inRange)            cellBg = 'bg-indigo-500/15'
    if (isStart && !single) cellBg = 'bg-gradient-to-r from-transparent to-indigo-500/15'
    if (isEnd   && !single) cellBg = 'bg-gradient-to-l from-transparent to-indigo-500/15'

    // Button styles
    let btnBg   = ''
    let btnText = disabled
      ? 'text-gray-600'
      : todayDay ? 'text-indigo-400 font-bold' : 'text-gray-200'

    if (isStart || isEnd) {
      btnBg   = 'bg-indigo-600'
      btnText = 'text-white font-semibold'
    }

    return (
      <td key={day.toISOString()} className={`p-0 ${cellBg}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => clickDay(day)}
          onMouseEnter={() => hoverDay(day)}
          className={`w-9 h-9 text-sm rounded-full outline-none transition-all
            ${btnBg} ${btnText}
            ${disabled ? 'cursor-default opacity-30' : 'cursor-pointer hover:ring-2 hover:ring-indigo-500/50 hover:bg-indigo-500/20'}`}
        >
          {format(day, 'd')}
        </button>
      </td>
    )
  }

  const weeks = buildWeeks(viewDate.getFullYear(), viewDate.getMonth())

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative">

      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); if (open) { setAnchor(null); setHovered(null) } }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors
          ${open
            ? 'bg-surface-750 border-indigo-500/50 text-gray-100'
            : 'bg-surface-800 border-surface-700 text-gray-300 hover:border-surface-600 hover:text-gray-100'
          }`}
      >
        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-medium">{label}</span>
        {activePreset && <span className="text-xs text-gray-500">· {activePreset}</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 flex bg-surface-800 border border-surface-700
          rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          {/* Presets */}
          <div className="flex flex-col gap-0.5 p-2 border-r border-surface-700 min-w-[126px]">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 pb-1 pt-0.5">
              Período
            </p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${activePreset === p.label && !anchor
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4 select-none" onMouseLeave={() => setHovered(null)}>

            {/* State bar */}
            <div className="flex items-center justify-between mb-3 min-h-[26px]">
              {anchor ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-200 rounded-md font-semibold">
                    {format(anchor, 'd MMM', { locale: ptBR })}
                  </span>
                  <span className="text-gray-600">→</span>
                  {hovered
                    ? <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md">
                        {format(hovered, 'd MMM', { locale: ptBR })}
                      </span>
                    : <span className="text-gray-500 italic">selecione o fim</span>
                  }
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-surface-700 rounded-md text-gray-300">
                    {format(from, 'd MMM yyyy', { locale: ptBR })}
                  </span>
                  <span className="text-gray-600">→</span>
                  <span className="px-2 py-0.5 bg-surface-700 rounded-md text-gray-300">
                    {format(to, 'd MMM yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}
              {anchor && (
                <button
                  onClick={() => { setAnchor(null); setHovered(null) }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded-lg hover:bg-surface-700 ml-2"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setView(v => subMonths(v, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500
                  hover:bg-surface-700 hover:text-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-200 capitalize">
                {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button
                onClick={() => setView(v => addMonths(v, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500
                  hover:bg-surface-700 hover:text-gray-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day grid */}
            <table className="border-collapse">
              <thead>
                <tr>
                  {DAYS.map(d => (
                    <th key={d} className="w-9 h-7 text-center text-[11px] font-medium text-gray-600">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, i) => (
                  <tr key={i}>{week.map(day => renderDay(day))}</tr>
                ))}
              </tbody>
            </table>

            {/* Hint */}
            <p className="text-[11px] text-center text-gray-600 mt-2.5">
              {anchor ? '↑ Agora clique na data final' : 'Clique numa data para começar'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
