import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Building2, Download, AlertCircle, Loader2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogementPortail {
  id: string
  nom: string
  adresse?: string | null
  type?: string | null
  reservations_count: number
  gross: number
  net: number
  commission_pct: number
  taux_occupation: number
  occupied_nights: number
}

interface MonthlyData {
  month: string
  gross: number
  net: number
  reservations: number
}

interface Summary {
  net_month: number
  gross_month: number
  reservations_month: number
  occupancy_month: number
  ytd_gross: number
  ytd_net: number
  occupancy_ytd: number
}

interface PortailData {
  investisseur: { id: string; nom: string; email?: string | null }
  client: { company_name?: string; logo_url?: string } | null
  logements: LogementPortail[]
  monthly: MonthlyData[]
  summary: Summary
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const fmtMonth = (yyyyMm: string) => {
  const [year, month] = yyyyMm.split('-')
  const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${labels[parseInt(month, 10) - 1]} ${year.slice(2)}`
}

const currentMonthLabel = () => {
  const now = new Date()
  return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// ── Composants UI ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function PortailInvestisseur() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]       = useState<PortailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    if (!token) {
      setError('Lien invalide.')
      setLoading(false)
      return
    }
    fetch(`${apiUrl}/api/portail/${token}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error ?? 'Erreur')
        setData(json.data)
      })
      .catch((err: Error) => {
        setError(err.message === 'Portail introuvable ou lien expiré'
          ? 'Ce lien est invalide ou a expiré. Contactez votre conciergerie.'
          : 'Impossible de charger les données. Réessayez plus tard.')
      })
      .finally(() => setLoading(false))
  }, [token, apiUrl])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle size={40} className="mx-auto text-red-400" />
          <p className="text-base font-semibold text-gray-800">Accès impossible</p>
          <p className="text-sm text-gray-500">{error ?? 'Une erreur est survenue.'}</p>
        </div>
      </div>
    )
  }

  const { investisseur, client, logements, monthly, summary } = data
  const conciergerieName = client?.company_name ?? 'StayPilot'
  const month = currentMonthLabel()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {client?.logo_url ? (
              <img src={client.logo_url} alt={conciergerieName} className="h-7 w-auto" />
            ) : (
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm">
                <TrendingUp size={16} />
                {conciergerieName}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">Portail investisseur</span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-10">

        {/* Titre */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Tableau de bord — {investisseur.nom}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Performances du mois de {month}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            label="Revenus nets (mois)"
            value={fmtEur(summary.net_month)}
            sub={`Brut : ${fmtEur(summary.gross_month)}`}
          />
          <KpiCard
            label="Taux d'occupation"
            value={`${summary.occupancy_month} %`}
            sub="Mois en cours"
          />
          <KpiCard
            label="Réservations"
            value={String(summary.reservations_month)}
            sub="Ce mois-ci"
          />
          <KpiCard
            label="Revenus nets YTD"
            value={fmtEur(summary.ytd_net)}
            sub={`Occup. annuelle ${summary.occupancy_ytd} %`}
          />
        </div>

        {/* Tableau par logement */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Building2 size={15} className="text-blue-500" />
            Détail par logement — {month}
          </h2>

          {logements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun logement associé à ce portail.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logement</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Réservations</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Occupation</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenus bruts</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenus nets</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {logements.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{l.nom}</p>
                          {l.adresse && <p className="text-xs text-gray-400 truncate max-w-[180px]">{l.adresse}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{l.reservations_count}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            l.taux_occupation >= 70 ? 'bg-green-100 text-green-700'
                            : l.taux_occupation >= 40 ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-600'
                          }`}>
                            {l.taux_occupation} %
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtEur(l.gross)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{l.commission_pct} %</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtEur(l.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {logements.reduce((s, l) => s + l.reservations_count, 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{summary.occupancy_month} %</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtEur(summary.gross_month)}</td>
                      <td />
                      <td className="px-4 py-3 text-right text-gray-900">{fmtEur(summary.net_month)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {logements.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{l.nom}</p>
                        {l.adresse && <p className="text-xs text-gray-400 truncate">{l.adresse}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        l.taux_occupation >= 70 ? 'bg-green-100 text-green-700'
                        : l.taux_occupation >= 40 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-600'
                      }`}>
                        {l.taux_occupation} %
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Réservations</p>
                        <p className="text-sm font-semibold text-gray-800">{l.reservations_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Bruts</p>
                        <p className="text-sm font-semibold text-gray-800">{fmtEur(l.gross)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Nets</p>
                        <p className="text-sm font-bold text-gray-900">{fmtEur(l.net)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Évolution 6 mois */}
        {monthly.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Évolution sur 6 mois</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={fmtMonth}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v / 1000)}k€`}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      fmtEur(value),
                      name === 'net' ? 'Nets' : 'Bruts',
                    ]}
                    labelFormatter={fmtMonth}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="gross" name="gross" fill="#bfdbfe" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="net"   name="net"   fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-200" />
                  <span className="text-xs text-gray-500">Revenus bruts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-xs text-gray-500">Revenus nets</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bouton télécharger PDF */}
        <div className="flex justify-center">
          <a
            href={`${apiUrl}/api/reports/owner-statement?token=${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Download size={15} />
            Télécharger le relevé PDF
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-xs text-gray-400">
            Données fournies par <span className="font-medium text-gray-600">{conciergerieName}</span> via StayPilot
          </p>
        </div>
      </footer>
    </div>
  )
}
