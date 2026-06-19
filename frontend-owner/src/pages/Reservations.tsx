import React, { useEffect, useState } from 'react'
import { Search, X, Calendar } from 'lucide-react'
import api from '../lib/api'
import Select from '../components/Select'

interface Reservation {
  id: string; guest_name: string; guest_email?: string
  property_name?: string; logement_name?: string
  check_in: string; check_out: string; status: string
  guests_count?: number; total_price?: number; platform?: string
  commission?: number
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  confirmed:  { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
  pending:    { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700' },
  checked_in: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700' },
}

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
// Commission portée par chaque réservation (r.commission), défaut 20 %
const DEFAULT_COMMISSION = 0.20

function fmt(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function nights(ci: string, co: string) { return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000) }

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterLogement, setFilterLogement] = useState('')

  useEffect(() => {
    api.get<Reservation[]>('/api/reservations')
      .then((r) => setReservations(r.data))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`, value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  }).reverse()

  const logements = [...new Set(reservations.map((r) => r.property_name ?? r.logement_name).filter(Boolean))] as string[]

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.guest_name.toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchLogement = !filterLogement || (r.property_name ?? r.logement_name) === filterLogement
    const matchMonth = !filterMonth || r.check_in.startsWith(filterMonth)
    return matchSearch && matchStatus && matchLogement && matchMonth
  })

  const totalNet = filtered
    .filter((r) => r.status !== 'cancelled')
    .reduce((s, r) => s + (r.total_price ?? 0) * (1 - (r.commission ?? DEFAULT_COMMISSION)), 0)

  return (
    <div>
      {/* Filters */}
      <div className="bg-surface rounded-xl shadow-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un voyageur…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg" />
          </div>
          <Select
            value={filterMonth}
            onChange={setFilterMonth}
            placeholder="Tous les mois"
            options={monthOptions}
          />
          {logements.length > 1 && (
            <Select
              value={filterLogement}
              onChange={setFilterLogement}
              placeholder="Tous les logements"
              options={logements.map(l => ({ label: l, value: l }))}
            />
          )}
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Tous les statuts"
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))}
          />
          {(search || filterStatus || filterMonth || filterLogement) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterMonth(''); setFilterLogement('') }}
              className="text-xs text-muted hover:text-dark flex items-center gap-1"><X size={12} /> Reset</button>
          )}
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm text-muted">{filtered.length} réservation{filtered.length !== 1 ? 's' : ''}</p>
          <p className="text-sm font-semibold text-primary">
            Total net : {totalNet.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Calendar size={32} className="text-gray-300" />
            <p className="text-sm text-muted">Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-gray-100 bg-bg">
                  {['Voyageur', 'Logement', 'Check-in', 'Check-out', 'Nuits', 'Montant net', 'Statut'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-bg transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {r.guest_name[0]}
                        </div>
                        <span className="font-medium text-dark">{r.guest_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.property_name ?? r.logement_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{fmt(r.check_in)}</td>
                    <td className="px-4 py-3 text-muted">{fmt(r.check_out)}</td>
                    <td className="px-4 py-3 text-center font-medium text-dark">{nights(r.check_in, r.check_out)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {r.total_price && r.status !== 'cancelled'
                        ? `${(r.total_price * (1 - (r.commission ?? DEFAULT_COMMISSION))).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
