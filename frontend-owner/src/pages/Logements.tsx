import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Users, TrendingUp, MapPin, ChevronRight } from 'lucide-react'
import api from '../lib/api'

interface Property {
  id: string
  name: string
  address?: string
  type?: string
  max_guests?: number
  occupancy_rate?: number    // 0–100
  monthly_net?: number       // net after commission (already deducted by API)
}

export default function Logements() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Property[]>('/api/owner/properties')
      .then(r => setProperties(r.data))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-2">
        <Home size={32} className="text-gray-300" />
        <p className="text-sm text-muted">Aucun logement associé à votre compte</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {properties.map(p => {
        const occ = p.occupancy_rate ?? 0
        return (
          <div key={p.id} onClick={() => navigate(`/logements/${p.id}`)}
            className="bg-surface rounded-xl shadow-card p-5 flex flex-col gap-4 cursor-pointer hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start gap-3 justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                <Home size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-dark text-sm truncate">{p.name}</h3>
                {p.address && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={11} />
                    {p.address}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-muted flex-shrink-0 mt-1" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {p.max_guests != null && (
                <div className="bg-bg rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Capacité</p>
                  <p className="text-sm font-semibold text-dark flex items-center gap-1">
                    <Users size={13} className="text-muted" />
                    {p.max_guests} pers.
                  </p>
                </div>
              )}
              {p.type && (
                <div className="bg-bg rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Type</p>
                  <p className="text-sm font-semibold text-dark capitalize">{p.type}</p>
                </div>
              )}
            </div>

            {/* Occupancy bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">Taux d'occupation (30 j)</span>
                <span className="text-xs font-semibold text-dark">{Math.round(occ)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(occ, 100)}%`,
                    backgroundColor: occ >= 70 ? '#EA580C' : occ >= 40 ? '#FB923C' : '#FED7AA',
                  }}
                />
              </div>
            </div>

            {/* Monthly net */}
            {p.monthly_net != null && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-muted flex items-center gap-1">
                  <TrendingUp size={12} />
                  Revenu net (mois en cours)
                </span>
                <span className="text-sm font-bold text-primary">
                  {p.monthly_net.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
