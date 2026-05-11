import React, { useEffect, useState } from 'react'
import { Search, X, Calendar, User, Home } from 'lucide-react'
import api from '../lib/api'
import Select from '../components/Select'

interface Reservation {
  id: string; guest_name: string; guest_email?: string
  property_name?: string; logement_name?: string
  check_in: string; check_out: string; status: string
  guests_count?: number; total_price?: number; platform?: string
}
interface ReservationMessage {
  id: string; content: string; direction: string; sent_at: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  confirmed:  { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
  pending:    { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700' },
  checked_in: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700' },
}

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-bg text-muted' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}
function fmt(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function nights(ci: string, co: string) { return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000) }

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [messages, setMessages] = useState<ReservationMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  useEffect(() => {
    api.get<Reservation[]>('/api/reservations')
      .then((r) => setReservations(r.data))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    api.get<ReservationMessage[]>(`/api/reservations/${selected.id}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false))
  }, [selected])

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.guest_name.toLowerCase().includes(q) || (r.property_name ?? r.logement_name ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchPlatform = !filterPlatform || r.platform === filterPlatform
    return matchSearch && matchStatus && matchPlatform
  })

  const platforms = [...new Set(reservations.map((r) => r.platform).filter(Boolean))] as string[]

  return (
    <div className="grid xl:grid-cols-[1fr_360px] gap-4 xl:gap-5">
      {/* Sur mobile, on masque la liste quand un détail est ouvert */}
      <div className={`bg-surface rounded-xl shadow-card ${selected ? 'hidden xl:block' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-border">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher voyageur, logement…"
              className="w-full pl-8 pr-3 py-2.5 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg" />
          </div>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Tous les statuts"
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          {platforms.length > 0 && (
            <Select
              value={filterPlatform}
              onChange={setFilterPlatform}
              placeholder="Toutes plateformes"
              options={platforms.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            />
          )}
          {(search || filterStatus || filterPlatform) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterPlatform('') }}
              className="text-xs text-muted hover:text-dark flex items-center gap-1"><X size={12} /> Reset</button>
          )}
          <span className="ml-auto text-xs text-muted">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Calendar size={32} className="text-gray-300" />
            <p className="text-sm text-muted">Aucune réservation</p>
          </div>
        ) : (
          <>
            {/* Vue carte — mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((r) => (
                <button key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  className={`w-full text-left px-4 py-4 transition-colors ${selected?.id === r.id ? 'bg-primary-light' : 'active:bg-bg'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {r.guest_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark truncate">{r.guest_name}</p>
                      <p className="text-xs text-muted truncate">{r.property_name ?? r.logement_name ?? '—'}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center justify-between ml-12 text-xs">
                    <span className="text-muted">{fmt(r.check_in)} → {fmt(r.check_out)} · <span className="font-medium text-dark">{nights(r.check_in, r.check_out)} nuits</span></span>
                    {r.total_price && <span className="font-bold text-dark">{r.total_price.toLocaleString('fr-FR')} €</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Vue tableau — desktop */}
            <div className="hidden md:block overflow-x-auto overflow-hidden rounded-b-xl">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    {['Voyageur', 'Logement', 'Check-in', 'Check-out', 'Nuits', 'Montant', 'Statut'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                      className={`cursor-pointer transition-colors ${selected?.id === r.id ? 'bg-primary-light' : 'hover:bg-bg'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {r.guest_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-dark">{r.guest_name}</p>
                            {r.guest_email && <p className="text-xs text-muted">{r.guest_email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.property_name ?? r.logement_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{fmt(r.check_in)}</td>
                      <td className="px-4 py-3 text-muted">{fmt(r.check_out)}</td>
                      <td className="px-4 py-3 text-center text-dark font-medium">{nights(r.check_in, r.check_out)}</td>
                      <td className="px-4 py-3 font-medium text-dark">
                        {r.total_price ? `${r.total_price.toLocaleString('fr-FR')} €` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selected ? (
        <div className="bg-surface rounded-xl shadow-card p-4 sm:p-5 flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-3">
            {/* Bouton retour mobile */}
            <button onClick={() => setSelected(null)} className="xl:hidden text-muted hover:text-dark flex-shrink-0">
              <User size={18} className="rotate-180" />
            </button>
            <h3 className="font-semibold text-dark flex-1">{selected.guest_name}</h3>
            <button onClick={() => setSelected(null)} className="hidden xl:block text-muted hover:text-dark"><X size={16} /></button>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Logement', value: selected.property_name ?? selected.logement_name ?? '—' },
              { label: 'Check-in', value: fmt(selected.check_in) },
              { label: 'Check-out', value: fmt(selected.check_out) },
              { label: 'Voyageurs', value: String(selected.guests_count ?? '—') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 py-1.5 border-b border-border-light">
                <span className="text-muted w-20 flex-shrink-0">{label}</span>
                <span className="font-medium text-dark">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 bg-primary-light rounded-lg px-3 mt-1">
              <span className="text-sm font-semibold text-primary">Total</span>
              <span className="text-sm font-bold text-primary">
                {selected.total_price ? `${selected.total_price.toLocaleString('fr-FR')} €` : '—'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Historique messages</p>
            {loadingMsgs ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">Aucun message</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      m.direction === 'outbound' ? 'bg-primary text-white' : 'bg-bg text-dark border border-border'}`}>
                      <p>{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.direction === 'outbound' ? 'text-orange-200' : 'text-muted'}`}>
                        {new Date(m.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <StatusBadge status={selected.status} />
            {selected.platform && (
              <span className="text-xs text-muted capitalize bg-bg px-2 py-1 rounded">{selected.platform}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden xl:flex bg-surface rounded-xl shadow-card items-center justify-center h-48">
          <p className="text-sm text-muted">Sélectionner une réservation</p>
        </div>
      )}
    </div>
  )
}
