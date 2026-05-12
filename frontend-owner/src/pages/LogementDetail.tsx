import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Home, MapPin, Users, Star, TrendingUp,
  Calendar, Euro, AlertCircle, Wifi, Lock, Key,
} from 'lucide-react'
import api from '../lib/api'

interface Logement {
  id: string
  nom: string
  adresse?: string
  type?: string
  capacite?: number
  description?: string
  surface?: number
  commission_rate?: number
  wifi_ssid?: string
  wifi_password?: string
  access_code?: string
  checkin_instructions?: string
  checkout_instructions?: string
  photos?: string[]
  amenities?: string[]
  platform_links?: Record<string, string>
}

interface Reservation {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  total_price?: number
  nb_guests?: number
}

interface Avis {
  id: string
  rating: number
  guest_name: string
  comment?: string
  date_avis?: string
  platform?: string
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)
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

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  )
}

export default function LogementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [logement, setLogement] = useState<Logement | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [avis, setAvis] = useState<Avis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get<Logement>(`/api/logements/${id}`).then(r => r.data).catch(() => null),
      api.get<Reservation[]>('/api/reservations', { params: { logement_id: id } }).then(r => r.data).catch(() => []),
      api.get<Avis[]>('/api/avis', { params: { logement_id: id, limit: 50 } }).then(r => r.data).catch(() => []),
    ]).then(([l, res, av]) => {
      if (!l) { setError(true); setLoading(false); return }
      setLogement(l)
      setReservations(Array.isArray(res) ? res : [])
      setAvis(Array.isArray(av) ? av : [])
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !logement) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-muted">Logement introuvable</p>
        <button onClick={() => navigate('/logements')} className="text-sm text-primary hover:underline">
          Retour à mes logements
        </button>
      </div>
    )
  }

  // Stats
  const totalRes = reservations.filter(r => r.status !== 'cancelled').length
  const totalNights = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((s, r) => s + nights(r.check_in, r.check_out), 0)
  const totalRevenu = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((s, r) => s + (r.total_price ?? 0), 0)
  const avgRating = avis.length > 0
    ? avis.reduce((s, a) => s + a.rating, 0) / avis.length
    : null

  const upcoming = [...reservations]
    .filter(r => r.check_in >= new Date().toISOString().split('T')[0] && r.status !== 'cancelled')
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 5)

  const past = [...reservations]
    .filter(r => r.check_out < new Date().toISOString().split('T')[0] && r.status !== 'cancelled')
    .sort((a, b) => b.check_out.localeCompare(a.check_out))
    .slice(0, 5)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <button onClick={() => navigate('/logements')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors">
        <ArrowLeft size={15} /> Retour à mes logements
      </button>

      {/* Header card */}
      <div className="bg-surface rounded-xl shadow-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
            <Home size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-dark">{logement.nom}</h2>
            {logement.adresse && (
              <p className="text-sm text-muted flex items-center gap-1 mt-1">
                <MapPin size={13} /> {logement.adresse}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {logement.type && (
                <span className="text-xs px-2 py-1 bg-bg rounded-lg text-muted capitalize">{logement.type}</span>
              )}
              {logement.capacite && (
                <span className="text-xs px-2 py-1 bg-bg rounded-lg text-muted flex items-center gap-1">
                  <Users size={11} /> {logement.capacite} pers.
                </span>
              )}
              {logement.surface && (
                <span className="text-xs px-2 py-1 bg-bg rounded-lg text-muted">{logement.surface} m²</span>
              )}
            </div>
          </div>
        </div>
        {logement.description && (
          <p className="text-sm text-muted mt-4 leading-relaxed border-t border-gray-100 pt-4">{logement.description}</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Réservations', value: totalRes, icon: <Calendar size={16} /> },
          { label: 'Nuits totales', value: totalNights, icon: <TrendingUp size={16} /> },
          { label: 'Revenus bruts', value: `${totalRevenu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`, icon: <Euro size={16} /> },
          { label: 'Note moyenne', value: avgRating !== null ? `${avgRating.toFixed(1)} ★` : '—', icon: <Star size={16} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-surface rounded-xl shadow-card p-4">
            <div className="flex items-center gap-2 text-muted mb-1.5">
              {icon}
              <span className="text-[11px] uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold text-dark">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Upcoming reservations */}
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-4">Prochaines réservations</p>
          {upcoming.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Aucune réservation à venir</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-dark">{r.guest_name}</p>
                    <p className="text-xs text-muted mt-0.5">{fmt(r.check_in)} → {fmt(r.check_out)} · {nights(r.check_in, r.check_out)} nuits</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past reservations */}
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-4">Derniers séjours</p>
          {past.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Aucun séjour passé</p>
          ) : (
            <div className="space-y-3">
              {past.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-dark">{r.guest_name}</p>
                    <p className="text-xs text-muted mt-0.5">{fmt(r.check_in)} → {fmt(r.check_out)}</p>
                  </div>
                  {r.total_price != null && (
                    <span className="text-sm font-bold text-primary">{r.total_price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {avis.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-dark">Avis voyageurs</p>
            {avgRating !== null && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-dark">{avgRating.toFixed(1)}</span>
                <StarRow rating={Math.round(avgRating)} />
                <span className="text-xs text-muted">({avis.length} avis)</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {avis.slice(0, 5).map(a => (
              <div key={a.id} className="p-3 bg-bg rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark">{a.guest_name}</span>
                    {a.platform && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-muted capitalize">{a.platform}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRow rating={a.rating} />
                    {a.date_avis && <span className="text-xs text-muted">{fmt(a.date_avis)}</span>}
                  </div>
                </div>
                {a.comment && <p className="text-xs text-muted leading-relaxed">{a.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practical info */}
      {(logement.wifi_ssid || logement.access_code || logement.checkin_instructions) && (
        <div className="bg-surface rounded-xl shadow-card p-5">
          <p className="text-sm font-semibold text-dark mb-4">Informations pratiques</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {logement.wifi_ssid && (
              <div className="flex items-start gap-3 p-3 bg-bg rounded-lg">
                <Wifi size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-dark">Wi-Fi</p>
                  <p className="text-xs text-muted mt-0.5">{logement.wifi_ssid}</p>
                  {logement.wifi_password && <p className="text-xs text-muted font-mono mt-0.5">{logement.wifi_password}</p>}
                </div>
              </div>
            )}
            {logement.access_code && (
              <div className="flex items-start gap-3 p-3 bg-bg rounded-lg">
                <Lock size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-dark">Code d'accès</p>
                  <p className="text-xs font-mono text-muted mt-0.5">{logement.access_code}</p>
                </div>
              </div>
            )}
            {logement.checkin_instructions && (
              <div className="flex items-start gap-3 p-3 bg-bg rounded-lg sm:col-span-2">
                <Key size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-dark">Instructions d'arrivée</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{logement.checkin_instructions}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
