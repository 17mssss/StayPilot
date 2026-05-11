import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Home, User } from 'lucide-react'
import api from '../lib/api'

interface Reservation {
  id: string
  guest_name: string
  property_name?: string
  logement_name?: string
  check_in: string
  check_out: string
  status: string
  platform?: string
  total_price?: number
}

const DAYS_FR  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PLATFORM_COLORS: Record<string, string> = {
  airbnb:  '#FF385C',
  booking: '#003580',
  abritel: '#00A699',
  manual:  '#6B7280',
  other:   '#EA580C',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:  { bg: 'bg-green-100',  text: 'text-green-800' },
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  cancelled:  { bg: 'bg-red-100',   text: 'text-red-600' },
  checked_in: { bg: 'bg-blue-100',  text: 'text-blue-800' },
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function nights(ci: string, co: string) {
  return Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000))
}

interface TooltipProps {
  res: Reservation
  onClose: () => void
}
function ReservationTooltip({ res, onClose }: TooltipProps) {
  const sc = STATUS_COLORS[res.status] ?? { bg: 'bg-bg', text: 'text-dark' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative z-10 bg-surface rounded-2xl shadow-xl w-80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: PLATFORM_COLORS[res.platform ?? 'other'] ?? '#EA580C' }}
          />
          <p className="font-semibold text-dark flex-1 truncate">{res.guest_name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
            {res.status === 'confirmed' ? 'Confirmée'
              : res.status === 'pending' ? 'En attente'
              : res.status === 'cancelled' ? 'Annulée'
              : res.status === 'checked_in' ? 'En cours'
              : res.status}
          </span>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Home size={13} className="text-muted flex-shrink-0" />
            <span className="text-dark">{res.property_name ?? res.logement_name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={13} className="text-muted flex-shrink-0" />
            <span className="text-dark">
              {fmtShort(res.check_in)} → {fmtShort(res.check_out)}
              <span className="text-muted ml-1">({nights(res.check_in, res.check_out)} nuits)</span>
            </span>
          </div>
          {res.platform && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: PLATFORM_COLORS[res.platform] ?? '#A3A3A3' }} />
              <span className="text-dark capitalize">{res.platform}</span>
            </div>
          )}
          {res.total_price != null && (
            <div className="text-sm">
              <span className="text-muted">Montant : </span>
              <span className="font-semibold text-dark">{res.total_price.toLocaleString('fr-FR')} €</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Calendrier() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Reservation | null>(null)

  // Current month/year
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based

  useEffect(() => {
    api.get<Reservation[]>('/api/reservations')
      .then((r) => setReservations(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false))
  }, [])

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  // Calendar grid (Monday-based)
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon…6=Sun
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)

  // Filter reservations visible in this month
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd   = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  const monthRes = reservations.filter(
    (r) => r.check_out >= monthStart && r.check_in <= monthEnd && r.status !== 'cancelled'
  )

  // Get reservations that touch a specific date
  const resForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthRes.filter((r) => r.check_in <= dateStr && r.check_out > dateStr)
  }

  const todayStr = now.toISOString().split('T')[0]

  // Stats for this month
  const checkInsThisMonth  = monthRes.filter((r) => r.check_in >= monthStart && r.check_in <= monthEnd).length
  const checkOutsThisMonth = monthRes.filter((r) => r.check_out >= monthStart && r.check_out <= monthEnd).length
  const revenueThisMonth   = monthRes.reduce((s, r) => s + (r.total_price ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Réservations actives', value: monthRes.length },
          { label: 'Check-ins ce mois', value: checkInsThisMonth },
          { label: `Revenus estimés`, value: `${revenueThisMonth.toLocaleString('fr-FR')} €` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface rounded-xl shadow-card px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-lg font-bold text-dark">{value}</p>
          </div>
        ))}
      </div>

      {/* Calendar card */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {/* Header navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm sm:text-base font-bold text-dark text-center min-w-[130px] sm:w-44">
              {MONTHS_FR[month]} {year}
            </h2>
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={goToday}
            className="text-xs font-medium text-primary hover:text-primary-dark border border-primary/30 hover:border-primary rounded-lg px-3 py-1.5 transition-colors">
            Aujourd'hui
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_FR.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[96px] border-b border-r border-border bg-bg/40" />
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const dayRes  = resForDay(day)
              const isLastCol = (idx + 1) % 7 === 0

              return (
                <div
                  key={day}
                  className={`min-h-[60px] sm:min-h-[96px] p-1 sm:p-1.5 border-b border-border ${isLastCol ? '' : 'border-r'} ${
                    isToday ? 'bg-primary-light/30' : 'hover:bg-bg/60'
                  } transition-colors`}
                >
                  {/* Day number */}
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${
                    isToday ? 'bg-primary text-white' : 'text-dark'
                  }`}>
                    {day}
                  </div>

                  {/* Reservation chips */}
                  <div className="space-y-0.5">
                    {dayRes.slice(0, 2).map((r) => {
                      const isStart = r.check_in === dateStr
                      const color = PLATFORM_COLORS[r.platform ?? 'other'] ?? '#EA580C'
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelected(r)}
                          title={r.guest_name}
                          className="w-full text-left text-[9px] sm:text-[10px] font-medium leading-tight px-1 sm:px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80"
                          style={{ backgroundColor: color + '25', color }}
                        >
                          {isStart ? `↗ ${r.guest_name}` : r.guest_name}
                        </button>
                      )
                    })}
                    {dayRes.length > 2 && (
                      <p className="text-[8px] sm:text-[10px] text-muted pl-1">+{dayRes.length - 2}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <p className="text-xs font-medium text-muted">Plateformes :</p>
        {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-muted capitalize">{key}</span>
          </div>
        ))}
      </div>

      {/* Reservation list below calendar */}
      {monthRes.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold text-dark">
              Réservations de {MONTHS_FR[month]} {year}
              <span className="ml-2 text-muted font-normal">({monthRes.length})</span>
            </p>
          </div>
          <div className="divide-y divide-border">
            {monthRes
              .sort((a, b) => a.check_in.localeCompare(b.check_in))
              .map((r) => {
                const sc = STATUS_COLORS[r.status] ?? { bg: 'bg-bg', text: 'text-dark' }
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-bg text-left transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PLATFORM_COLORS[r.platform ?? 'other'] ?? '#EA580C' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark truncate">{r.guest_name}</p>
                      <p className="text-xs text-muted truncate">{r.property_name ?? r.logement_name ?? '—'}</p>
                    </div>
                    <div className="text-xs text-muted text-right flex-shrink-0">
                      <p>{fmtShort(r.check_in)} → {fmtShort(r.check_out)}</p>
                      <p>{nights(r.check_in, r.check_out)} nuits</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${sc.bg} ${sc.text}`}>
                      {r.status === 'confirmed' ? 'Confirmée'
                        : r.status === 'pending' ? 'En attente'
                        : r.status === 'checked_in' ? 'En cours'
                        : r.status}
                    </span>
                    {r.total_price != null && (
                      <span className="text-xs font-semibold text-dark flex-shrink-0">
                        {r.total_price.toLocaleString('fr-FR')} €
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
