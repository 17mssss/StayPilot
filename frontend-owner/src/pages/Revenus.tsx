import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { ChevronLeft, ChevronRight, TrendingUp, Euro, Percent } from 'lucide-react'
import api from '../lib/api'

interface MonthlyRevenue {
  month: string        // 'YYYY-MM'
  gross: number
  net: number
  reservations: number
}

interface LogementRevenue {
  id: string
  name: string
  reservations: number
  occupied_nights: number
  total_nights: number
  gross: number
}

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 shadow-card ${accent ? 'bg-primary text-white' : 'bg-surface'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-orange-100' : 'text-muted'}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-dark'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-orange-200' : 'text-muted'}`}>{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface shadow-card-hover rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-dark mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }}>{p.name} : {p.value.toLocaleString('fr-FR')} €</p>
      ))}
    </div>
  )
}

export default function Revenus() {
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([])
  const [logements, setLogements] = useState<LogementRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<MonthlyRevenue[]>(`/api/revenues/monthly?year=${year}`).then(r => r.data).catch(() => []),
      api.get<LogementRevenue[]>(`/api/revenues/by-property?year=${year}`).then(r => r.data).catch(() => []),
    ]).then(([m, l]) => {
      setMonthly(m)
      setLogements(l)
    }).finally(() => setLoading(false))
  }, [year])

  // Build 12-month chart data — use API net values (server applies real commission rate)
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    const found = monthly.find(m => m.month === key)
    return { name: MONTHS_FR[i], brut: Math.round(found?.gross ?? 0), net: Math.round(found?.net ?? 0) }
  })

  const totalGross = monthly.reduce((s, m) => s + m.gross, 0)
  const totalNet = monthly.reduce((s, m) => s + m.net, 0)
  const totalCommission = totalGross - totalNet
  // Derive effective commission rate from API data (fallback to 20%)
  const effectiveRate = totalGross > 0 ? Math.round((totalCommission / totalGross) * 100) : 20

  return (
    <div className="space-y-5">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <button onClick={() => setYear(y => y - 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-surface shadow-card flex items-center justify-center text-muted hover:text-dark transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-dark w-10 text-center">{year}</span>
        <button onClick={() => setYear(y => y + 1)}
          disabled={year >= new Date().getFullYear()}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-surface shadow-card flex items-center justify-center text-muted hover:text-dark transition-colors disabled:opacity-40">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI accent label="Revenus nets" value={`${totalNet.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} sub={`Après commission ${effectiveRate}%`} />
        <KPI label="Revenus bruts" value={`${totalGross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} sub="Avant déduction" />
        <KPI label="Commission déduite" value={`${totalCommission.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} sub={`${effectiveRate}% frais de gestion`} />
      </div>

      {/* Bar chart */}
      <div className="bg-surface rounded-xl shadow-card p-5">
        <h2 className="text-sm font-semibold text-dark mb-4">Revenus mensuels {year}</h2>
        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-xs text-muted">{v === 'brut' ? 'Brut' : 'Net propriétaire'}</span>} />
              <Bar dataKey="brut" name="brut" fill="#FED7AA" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net" name="net" fill="#EA580C" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-logement table */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-dark">Détail par logement</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <TrendingUp size={28} className="text-gray-300" />
            <p className="text-sm text-muted">Aucune donnée pour cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-bg">
                  {['Logement', 'Réservations', "Taux d'occupation", 'Revenus bruts', `Commission (−${effectiveRate}%)`, 'Net propriétaire'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logements.map(l => {
                  const occ = l.total_nights > 0 ? (l.occupied_nights / l.total_nights) * 100 : 0
                  const commission = l.gross * (effectiveRate / 100)
                  const net = l.gross - commission
                  return (
                    <tr key={l.id} className="hover:bg-bg transition-colors">
                      <td className="px-4 py-3 font-medium text-dark">{l.name}</td>
                      <td className="px-4 py-3 text-center text-muted">{l.reservations}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(occ, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted w-8 text-right">{Math.round(occ)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{l.gross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                      <td className="px-4 py-3 text-red-500">−{commission.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                      <td className="px-4 py-3 font-semibold text-primary">{net.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                    </tr>
                  )
                })}
                {/* Total row */}
                <tr className="bg-bg border-t border-gray-200">
                  <td className="px-4 py-3 font-semibold text-dark">Total</td>
                  <td className="px-4 py-3 text-center font-medium text-dark">
                    {logements.reduce((s, l) => s + l.reservations, 0)}
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-medium text-dark">{totalGross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                  <td className="px-4 py-3 font-medium text-red-500">−{totalCommission.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                  <td className="px-4 py-3 font-bold text-primary">{totalNet.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
