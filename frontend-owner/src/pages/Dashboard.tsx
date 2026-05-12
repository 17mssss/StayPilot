import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { Euro, Calendar, TrendingUp, Download, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'

interface Reservation {
  id: string; guest_name: string; property_name?: string; logement_name?: string
  check_in: string; check_out: string; status: string; total_price?: number
}
interface Invoice {
  id: string; invoice_number?: string; numero?: string
  created_at?: string; total_ttc?: number; montant?: number; status?: string
}
interface Avis {
  id: string; rating: number; guest_name: string; date_avis?: string
}

function KPICard({ title, value, icon, accent, sub }: {
  title: string; value: string | number; icon: React.ReactNode; accent?: boolean; sub?: string
}) {
  return (
    <div className={`rounded-xl p-5 flex flex-col gap-3 ${accent ? 'bg-primary text-white' : 'bg-surface shadow-card'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-normal ${accent ? 'text-orange-100' : 'text-muted'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-0.5 ${accent ? 'text-white' : 'text-dark'}`}>{value}</p>
          {sub && <p className={`text-xs mt-1 ${accent ? 'text-orange-200' : 'text-muted'}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? 'bg-white/20' : 'bg-primary-light'}`}>
          <span className={accent ? 'text-white' : 'text-primary'}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

function LayoutCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl shadow-card p-5">
      <p className="text-sm font-semibold text-dark mb-4">{title}</p>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed:  { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
    pending:    { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
    cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700' },
    checked_in: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const COMMISSION = 0.20

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)
}

// Mini calendar
function MiniCalendar({ reservations }: { reservations: Reservation[] }) {
  const [offset, setOffset] = useState(0)
  const base = new Date()
  const year = new Date(base.getFullYear(), base.getMonth() + offset, 1).getFullYear()
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1).getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday-based offset
  const startDow = (firstDay.getDay() + 6) % 7
  const days: (number | null)[] = [...Array(startDow).fill(null)]
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)

  const isBooked = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return reservations.some((r) => r.status !== 'cancelled' && dateStr >= r.check_in && dateStr < r.check_out)
  }
  const isCheckIn = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return reservations.some((r) => r.check_in === dateStr)
  }
  const isCheckOut = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '00')}`
    return reservations.some((r) => r.check_out === dateStr)
  }

  const today = new Date()
  const isToday = (day: number) => year === today.getFullYear() && month === today.getMonth() && day === today.getDate()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setOffset((o) => o - 1)} className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center text-muted hover:text-dark">
          <ChevronLeft size={14} />
        </button>
        <p className="text-sm font-semibold text-dark capitalize">
          {new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => setOffset((o) => o + 1)} className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center text-muted hover:text-dark">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted pb-1.5">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center text-xs rounded-md transition-colors ${
            day === null ? '' :
            isToday(day) ? 'bg-primary text-white font-bold' :
            isCheckIn(day) ? 'bg-green-500 text-white font-medium' :
            isCheckOut(day) ? 'bg-orange-300 text-white font-medium' :
            isBooked(day) ? 'bg-primary-light text-primary font-medium' :
            'text-dark hover:bg-bg'
          }`}>
            {day}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
        {[
          { cls: 'bg-green-500', label: 'Arrivée' },
          { cls: 'bg-primary-light border border-primary/20', label: 'Séjour' },
          { cls: 'bg-orange-300', label: 'Départ' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded ${cls}`} />
            <span className="text-[10px] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [avisList, setAvisList] = useState<Avis[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      api.get<Reservation[]>('/api/reservations').then((r) => r.data).catch(() => []),
      api.get<Invoice[]>('/api/invoices').then((r) => r.data).catch(() => []),
      api.get<Avis[]>('/api/avis?limit=200').then((r) => r.data).catch(() => []),
    ]).then(([res, inv, avis]) => {
      setReservations(res)
      setInvoices(inv)
      setAvisList(Array.isArray(avis) ? avis : [])
      setLoading(false)
    })
  }, [])

  // KPIs
  const revenueThisMonth = reservations
    .filter((r) => { const d = new Date(r.check_in); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status !== 'cancelled' })
    .reduce((s, r) => s + (r.total_price ?? 0) * (1 - COMMISSION), 0)

  const activeRes = reservations.filter((r) => r.status === 'confirmed').length
  const totalDays = reservations.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + nights(r.check_in, r.check_out), 0)
  const daysInYear = 365
  const occupancy = Math.min(100, Math.round((totalDays / daysInYear) * 100))

  // Revenue chart last 6 months
  const revenueChart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const rev = reservations
      .filter((r) => { const rd = new Date(r.check_in); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() && r.status !== 'cancelled' })
      .reduce((s, r) => s + (r.total_price ?? 0) * (1 - COMMISSION), 0)
    return { month: MONTHS[d.getMonth()], net: Math.round(rev) }
  })

  // Upcoming stays
  const upcomingRes = reservations
    .filter((r) => r.check_in >= today && r.status !== 'cancelled')
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 6)

  // Last invoice
  const lastInvoice = [...invoices].sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  )[0]

  // Average rating from real reviews
  const avgRating = avisList.length > 0
    ? avisList.reduce((s, a) => s + (a.rating ?? 0), 0) / avisList.length
    : null

  // Estimated next payout (revenue of current month)
  const nextPayout = revenueThisMonth

  const handleDownloadInvoice = async (id: string) => {
    try {
      const res = await api.get(`/api/invoices/${id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `facture-${id}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="grid gap-5 xl:grid-cols-7">
      {/* Left 5/7 */}
      <div className="flex flex-col gap-5 xl:col-span-5">
        {/* KPIs */}
        <div className="grid sm:grid-cols-3 gap-4">
          <KPICard title="Revenus nets ce mois" value={`${revenueThisMonth.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} icon={<Euro size={18} />} accent sub="Après commission" />
          <KPICard title="Réservations actives" value={activeRes} icon={<Calendar size={18} />} />
          <KPICard title="Taux d'occupation" value={`${occupancy} %`} icon={<TrendingUp size={18} />} sub="Sur l'année en cours" />
        </div>

        {/* Revenue chart */}
        <LayoutCard title="Vos revenus nets — 6 derniers mois">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ownerRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: number) => [`${v.toLocaleString('fr-FR')} €`, 'Net propriétaire']} />
              <Area type="monotone" dataKey="net" stroke="#EA580C" strokeWidth={2} fill="url(#ownerRevGrad)" dot={false} activeDot={{ r: 4, fill: '#EA580C' }} />
            </AreaChart>
          </ResponsiveContainer>
        </LayoutCard>

        {/* Mini calendar */}
        <LayoutCard title="Calendrier des séjours">
          <MiniCalendar reservations={reservations} />
        </LayoutCard>

        {/* Upcoming stays */}
        <LayoutCard title="Prochains séjours">
          {upcomingRes.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Aucun séjour à venir</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Voyageur', 'Logement', 'Check-in', 'Check-out', 'Nuits', 'Net'].map((h) => (
                      <th key={h} className="pb-3 text-left text-xs font-medium text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {upcomingRes.map((r) => (
                    <tr key={r.id} className="hover:bg-bg transition-colors">
                      <td className="py-3 font-medium text-dark">{r.guest_name}</td>
                      <td className="py-3 text-muted">{r.property_name ?? r.logement_name ?? '—'}</td>
                      <td className="py-3 text-muted">{fmt(r.check_in)}</td>
                      <td className="py-3 text-muted">{fmt(r.check_out)}</td>
                      <td className="py-3 text-center font-medium text-dark">{nights(r.check_in, r.check_out)}</td>
                      <td className="py-3 font-semibold text-primary">
                        {r.total_price ? `${((r.total_price) * (1 - COMMISSION)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LayoutCard>
      </div>

      {/* Right panel 2/7 */}
      <div className="xl:col-span-2 flex flex-col gap-4">
        {/* Next payout */}
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-3">Prochain versement estimé</p>
          <div className="text-center py-3">
            <div className="text-3xl font-extrabold text-primary">
              {nextPayout.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </div>
            <p className="text-xs text-muted mt-1">
              Fin {new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex justify-between text-xs text-muted mt-3 pt-3 border-t border-gray-50">
            <span>Commission ({(COMMISSION * 100).toFixed(0)}%)</span>
            <span className="font-medium text-dark">déduite</span>
          </div>
        </div>

        {/* Last invoice */}
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-3">Dernière facture</p>
          {lastInvoice ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-mono">{lastInvoice.invoice_number ?? lastInvoice.numero ?? '—'}</span>
                <span className="text-xs font-bold text-dark">
                  {(lastInvoice.total_ttc ?? lastInvoice.montant ?? 0).toLocaleString('fr-FR')} €
                </span>
              </div>
              {lastInvoice.created_at && (
                <p className="text-xs text-muted">
                  {new Date(lastInvoice.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
              <button onClick={() => handleDownloadInvoice(lastInvoice.id)}
                className="flex items-center gap-1.5 w-full justify-center text-xs font-medium text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary-light transition-colors mt-2">
                <Download size={13} /> Télécharger PDF
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-4">Aucune facture disponible</p>
          )}
        </div>

        {/* Recent reviews */}
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-3">Avis récents</p>
          {avgRating !== null ? (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="text-3xl font-extrabold text-dark">{avgRating.toFixed(1)}</div>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={13} className={s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-0.5">Moyenne générale</p>
                </div>
              </div>
              <p className="text-xs text-muted mt-2">
                Basé sur {avisList.length} avis
              </p>
            </>
          ) : (
            <p className="text-xs text-muted text-center py-4">Aucun avis disponible</p>
          )}
        </div>
      </div>
    </div>
  )
}
