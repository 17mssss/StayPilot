import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { Calendar, LogIn, LogOut, Euro, Star, MessageSquare, Sparkles, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface Reservation {
  id: string; guest_name: string; property_name?: string; logement_name?: string
  check_in: string; check_out: string; status: string; total_price?: number; platform?: string
}
interface ConvMessage { id: string; is_read?: boolean; last_message?: string; guest_name?: string }
interface MenageTask {
  reservation_id: string; guest_name: string; property: string
  checkout: string; checkin_next: string | null; status: 'pending' | 'in_progress' | 'done'; notes: string | null
}

function KPICard({ title, value, icon, to }: {
  title: string; value: string | number; icon: React.ReactNode; to?: string
}) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={() => to && navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
        boxShadow: hov ? '0 8px 24px rgba(234,88,12,0.22)' : '0 1px 4px rgba(0,0,0,0.06)',
        backgroundColor: hov ? '#EA580C' : 'var(--color-surface)',
      }}
      className="rounded-xl select-none cursor-pointer"
    >
      {/* Mobile : layout horizontal compact */}
      <div className="flex sm:hidden items-center gap-3 px-3 py-3">
        <div
          style={{ backgroundColor: hov ? 'rgba(255,255,255,0.2)' : undefined }}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-light"
        >
          <span style={{ color: hov ? '#fff' : undefined }} className="text-primary">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: hov ? 'rgba(255,237,213,0.9)' : undefined }} className="text-[10px] text-muted leading-tight truncate">{title}</p>
          <p style={{ color: hov ? '#fff' : undefined }} className="text-lg font-bold text-dark leading-tight">{value}</p>
        </div>
      </div>
      {/* Desktop : layout vertical */}
      <div className="hidden sm:flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p style={{ color: hov ? 'rgba(255,237,213,0.9)' : undefined }} className="text-xs font-normal text-muted">{title}</p>
            <p style={{ color: hov ? '#fff' : undefined }} className="text-2xl font-bold mt-0.5 text-dark">{value}</p>
          </div>
          <div
            style={{ backgroundColor: hov ? 'rgba(255,255,255,0.2)' : undefined }}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-light"
          >
            <span style={{ color: hov ? '#fff' : undefined }} className="text-primary">{icon}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, valueFormatter }: {
  active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string; valueFormatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-dark font-semibold">
          {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
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
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-bg text-muted' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const PLATFORM_COLORS: Record<string, string> = {
  airbnb: '#FF385C', booking: '#003580', abritel: '#00A699', manual: '#A3A3A3', other: '#EA580C',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  if (h >= 18 && h < 22) return 'Bonsoir'
  return 'Bonne nuit'
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [messages, setMessages] = useState<ConvMessage[]>([])
  const [menageTasks, setMenageTasks] = useState<MenageTask[]>([])
  const [revenueMonthly, setRevenueMonthly] = useState<Array<{ month: string; gross: number; net: number; commission: number; reservations: number }>>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const firstName = (() => {
    const meta = user?.user_metadata
    if (meta?.first_name) return meta.first_name
    return user?.email?.split('@')[0] ?? ''
  })()

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all([
      api.get<Reservation[]>('/api/reservations').then((r) => r.data).catch(() => []),
      api.get<ConvMessage[]>('/api/messages').then((r) => r.data).catch(() => []),
      api.get<MenageTask[]>('/api/menage?filter=week').then((r) => r.data).catch(() => []),
      api.get<Array<{ month: string; gross: number; net: number; reservations: number }>>(`/api/revenues/monthly?year=${year}`).then((r) => r.data).catch(() => []),
    ]).then(([res, msgs, menage, revMonthly]) => {
      setReservations(Array.isArray(res) ? res : [])
      setMessages(Array.isArray(msgs) ? msgs : [])
      setMenageTasks(Array.isArray(menage) ? menage : [])
      // Ajoute commission = gross - net
      const enriched = (Array.isArray(revMonthly) ? revMonthly : []).map((m) => ({
        ...m,
        commission: Math.round((m.gross - m.net) * 100) / 100,
      }))
      setRevenueMonthly(enriched)
      setLoading(false)
    })
  }, [])

  const updateMenageStatus = async (reservationId: string, newStatus: MenageTask['status']) => {
    try {
      await api.patch(`/api/menage/${reservationId}/status`, { status: newStatus })
      setMenageTasks((prev) => prev.map((t) =>
        t.reservation_id === reservationId ? { ...t, status: newStatus } : t
      ))
    } catch { /* silencieux */ }
  }

  const activeRes = reservations.filter((r) => r.status === 'confirmed').length
  const checkInsToday = reservations.filter((r) => r.check_in === today).length
  const checkOutsToday = reservations.filter((r) => r.check_out === today).length
  const now = new Date()

  // Revenus commission du mois courant depuis l'API revenues (YYYY-MM)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthData = revenueMonthly.find((m) => m.month === currentMonthKey)
  const revenueThisMonth = currentMonthData?.commission ?? 0

  // Graphique 6 derniers mois — commission uniquement
  const revenueChart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const found = revenueMonthly.find((m) => m.month === key)
    return { month: MONTHS[d.getMonth()], revenus: found?.commission ?? 0 }
  })

  const resChart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const count = reservations.filter((r) => { const rd = new Date(r.check_in); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() }).length
    return { month: MONTHS[d.getMonth()], reservations: count }
  })

  const platformCounts: Record<string, number> = {}
  for (const r of reservations) { const p = r.platform || 'other'; platformCounts[p] = (platformCounts[p] ?? 0) + 1 }
  const platformData = Object.entries(platformCounts).map(([name, value]) => ({ name, value }))

  const recentRes = [...reservations]
    .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())
    .slice(0, 8)

  const unreadMsgs = messages.filter((m: any) => !m.is_read).slice(0, 4)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="grid gap-5 xl:grid-cols-7">
      {/* Greeting */}
      <div className="xl:col-span-7 flex flex-wrap items-end justify-between gap-2 mb-1">
        <div>
          <h2 className="text-2xl font-bold text-dark">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-sm text-muted mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}Voici un résumé de votre activité
          </p>
        </div>
      </div>

      {/* Left 5/7 */}
      <div className="flex flex-col gap-5 xl:col-span-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <KPICard title="Réservations actives" value={activeRes} icon={<Calendar size={18} />} to="/reservations" />
          <KPICard title="Check-ins aujourd'hui" value={checkInsToday} icon={<LogIn size={18} />} to="/reservations" />
          <KPICard title="Check-outs aujourd'hui" value={checkOutsToday} icon={<LogOut size={18} />} to="/reservations" />
          <KPICard title="Ménages à faire" value={menageTasks.filter((t) => t.status !== 'done').length} icon={<Sparkles size={18} />} to="/menage" />
          <KPICard title="Revenus du mois" value={`${revenueThisMonth.toLocaleString('fr-FR')} €`} icon={<Euro size={18} />} to="/facturation/historique" />
        </div>

        <LayoutCard title="Revenus — 6 derniers mois">
          <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 200}>
            <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v.toLocaleString('fr-FR')} €`} />} />
              <Area type="monotone" dataKey="revenus" stroke="#EA580C" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#EA580C' }} />
            </AreaChart>
          </ResponsiveContainer>
        </LayoutCard>

        <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-5">
          <LayoutCard title="Réservations par mois">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={resChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="reservations" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </LayoutCard>

          <LayoutCard title="Répartition par plateforme">
            {platformData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={platformData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" strokeWidth={0}>
                      {platformData.map((entry, i) => (
                        <Cell key={i} fill={PLATFORM_COLORS[entry.name] ?? '#A3A3A3'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1">
                  {platformData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[entry.name] ?? '#A3A3A3' }} />
                        <span className="text-xs text-dark capitalize">{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-dark">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">Aucune réservation</p>
            )}
          </LayoutCard>
        </div>

        <LayoutCard title="Dernières réservations">
          {recentRes.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune réservation</p>
          ) : (
            <>
              {/* Vue carte mobile */}
              <div className="md:hidden -mx-5 divide-y divide-border-light">
                {recentRes.map((r) => (
                  <button key={r.id} onClick={() => navigate('/reservations')}
                    className="w-full text-left px-5 py-3 hover:bg-bg transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {r.guest_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{r.guest_name}</p>
                        <p className="text-xs text-muted truncate">{r.property_name ?? r.logement_name ?? '—'}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex justify-between ml-11 text-xs text-muted">
                      <span>{fmt(r.check_in)} → {fmt(r.check_out)}</span>
                      {r.total_price && <span className="font-semibold text-dark">{r.total_price.toLocaleString('fr-FR')} €</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Vue tableau desktop */}
              <div className="hidden md:block overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[580px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Voyageur', 'Logement', 'Check-in', 'Check-out', 'Montant', 'Statut'].map((h) => (
                      <th key={h} className={`pb-3 text-xs font-medium text-muted ${h === 'Montant' || h === 'Statut' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {recentRes.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate('/reservations')}
                      className="hover:bg-bg transition-colors cursor-pointer group"
                    >
                      <td className="py-3 font-medium text-dark group-hover:text-primary transition-colors">{r.guest_name}</td>
                      <td className="py-3 text-muted">{r.property_name ?? r.logement_name ?? '—'}</td>
                      <td className="py-3 text-muted">{fmt(r.check_in)}</td>
                      <td className="py-3 text-muted">{fmt(r.check_out)}</td>
                      <td className="py-3 text-right font-medium text-dark">
                        {r.total_price ? `${r.total_price.toLocaleString('fr-FR')} €` : '—'}
                      </td>
                      <td className="py-3 text-right"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </LayoutCard>
      </div>

      {/* Right panel 2/7 — en bas sur mobile, à droite sur xl */}
      <div className="xl:col-span-2 flex flex-col gap-4">
        <div
          className="bg-surface rounded-xl shadow-card p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          onClick={() => navigate('/avis')}
        >
          <p className="text-sm font-semibold text-dark mb-3">Score moyen avis</p>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-extrabold text-dark">4.8</div>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className={s <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <p className="text-xs text-muted mt-0.5">sur 5 étoiles</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-card p-5">
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer group"
            onClick={() => navigate('/menage')}
          >
            <Sparkles size={14} className="text-primary" />
            <p className="text-sm font-semibold text-dark flex-1 group-hover:text-primary transition-colors">Ménages — 7 jours</p>
            {menageTasks.length > 0 && (
              <span className="text-xs font-semibold bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">
                {menageTasks.filter((t) => t.status !== 'done').length} à faire
              </span>
            )}
          </div>
          {menageTasks.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Aucun ménage prévu cette semaine</p>
          ) : (
            <div className="space-y-2">
              {menageTasks.slice(0, 6).map((t) => {
                const isToday = t.checkout === today
                const statusIcon =
                  t.status === 'done'        ? <CheckCircle2 size={14} className="text-green-500" /> :
                  t.status === 'in_progress' ? <Loader2 size={14} className="text-blue-500 animate-spin" /> :
                                               <Clock size={14} className="text-yellow-500" />
                const nextAction: MenageTask['status'] =
                  t.status === 'pending'     ? 'in_progress' :
                  t.status === 'in_progress' ? 'done' : 'pending'
                return (
                  <div
                    key={t.reservation_id}
                    className={`flex items-start gap-2 py-1.5 border-b border-border-light last:border-0 ${t.status === 'done' ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => updateMenageStatus(t.reservation_id, nextAction)}
                      className="mt-0.5 flex-shrink-0 hover:opacity-70 transition-opacity"
                      title={t.status === 'done' ? 'Marquer en attente' : t.status === 'in_progress' ? 'Terminer' : 'Commencer'}
                    >
                      {statusIcon}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${t.status === 'done' ? 'line-through text-muted' : 'text-dark'}`}>
                        {t.property}
                      </p>
                      <p className="text-[10px] text-muted">
                        Départ {isToday ? <span className="text-orange-500 font-semibold">auj.</span> : new Date(t.checkout).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {t.checkin_next && (
                          <> · Arrivée {new Date(t.checkin_next).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
              {menageTasks.length > 6 && (
                <p className="text-[10px] text-muted text-center pt-1">+{menageTasks.length - 6} autres</p>
              )}
            </div>
          )}
        </div>

        <div
          className="bg-surface rounded-xl shadow-card p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          onClick={() => navigate('/messages')}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={14} className="text-primary" />
            <p className="text-sm font-semibold text-dark">Messages non lus</p>
            {unreadMsgs.length > 0 && (
              <span className="ml-auto text-xs bg-primary text-white rounded-full px-1.5 py-0.5 font-semibold">{unreadMsgs.length}</span>
            )}
          </div>
          {unreadMsgs.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Aucun message non lu</p>
          ) : (
            <div className="space-y-2">
              {unreadMsgs.map((m: any) => (
                <div key={m.id} className="flex gap-2 py-1.5 border-b border-border-light last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {(m.guest_name ?? 'V')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-dark truncate">{m.guest_name ?? 'Voyageur'}</p>
                    <p className="text-xs text-muted truncate">{m.last_message ?? m.content ?? '…'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
