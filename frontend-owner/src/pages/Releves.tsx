import React, { useEffect, useState, useCallback } from 'react'
import { FileText, Download, RefreshCw, BarChart2, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface ReportItem {
  month: string
  label: string
  generated: boolean
  sent_at: string | null
  id: string | null
}

interface Proprietaire {
  id: string
  nom: string
  email: string
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Releves() {
  const { user } = useAuth()

  const [proprietaire,     setProprietaire]     = useState<Proprietaire | null>(null)
  const [reports,          setReports]          = useState<ReportItem[]>([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState('')
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null)
  const [generatingMonth,  setGeneratingMonth]  = useState<string | null>(null)

  // Résolution du propriétaire via email (même pattern que Messages.tsx)
  const resolveProprietaire = useCallback(async () => {
    const res = await api.get<Proprietaire[]>('/api/proprietaires')
    const list = res.data ?? []
    return list.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase()) ?? null
  }, [user?.email])

  const loadReports = useCallback(async (propId: string) => {
    const res = await api.get<ReportItem[]>(`/api/reports/list/${propId}`)
    setReports(res.data ?? [])
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const prop = await resolveProprietaire()
        if (!mounted) return
        if (!prop) {
          setError('Votre compte propriétaire n\'est pas encore configuré. Contactez votre conciergerie.')
          setLoading(false)
          return
        }
        setProprietaire(prop)
        await loadReports(prop.id)
      } catch {
        setError('Impossible de charger les relevés.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [resolveProprietaire, loadReports])

  const handleDownload = async (report: ReportItem) => {
    if (!proprietaire || downloadingMonth) return
    setDownloadingMonth(report.month)
    try {
      const res = await api.get(
        `/api/reports/pdf/${proprietaire.id}/${report.month}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `releve-${report.month}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      // Le PDF a été généré côté serveur — marquer comme disponible localement
      setReports(prev => prev.map(r =>
        r.month === report.month ? { ...r, generated: true } : r
      ))
    } catch {
      alert('Impossible de télécharger le relevé.')
    } finally {
      setDownloadingMonth(null)
    }
  }

  const handleGenerate = async (report: ReportItem) => {
    if (!proprietaire || generatingMonth) return
    setGeneratingMonth(report.month)
    try {
      await api.post(`/api/reports/generate/${proprietaire.id}/${report.month}`)
      setReports(prev => prev.map(r =>
        r.month === report.month ? { ...r, generated: true } : r
      ))
    } catch {
      alert('Impossible de générer le relevé. Réessayez.')
    } finally {
      setGeneratingMonth(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !proprietaire) {
    return (
      <div className="max-w-lg mx-auto bg-surface rounded-xl shadow-card p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-gray-300 mb-4" />
        <p className="text-sm text-muted">{error}</p>
      </div>
    )
  }

  const generatedCount = reports.filter(r => r.generated).length

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-primary text-white rounded-xl p-5 shadow-card">
          <p className="text-xs text-orange-100 mb-1">Relevés disponibles</p>
          <p className="text-2xl font-bold">{generatedCount}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 shadow-card">
          <p className="text-xs text-muted mb-1">Propriétaire</p>
          <p className="text-base font-semibold text-dark truncate">{proprietaire?.nom ?? '—'}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 shadow-card">
          <p className="text-xs text-muted mb-1">Dernière période</p>
          <p className="text-base font-semibold text-dark">{reports[0]?.label ?? '—'}</p>
        </div>
      </div>

      {/* Liste des relevés */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-dark">Historique des relevés (12 derniers mois)</h2>
          <p className="text-xs text-muted mt-0.5">Générés automatiquement le 1er de chaque mois</p>
        </div>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BarChart2 size={32} className="text-gray-300" />
            <p className="text-sm text-muted">Aucun relevé disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead>
                <tr className="border-b border-gray-100 bg-bg">
                  {['Période', 'Statut', 'Envoyé le', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => (
                  <tr key={r.month} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-muted flex-shrink-0" />
                        <span className="font-medium text-dark">{r.label}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      {r.generated ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Disponible
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                          Non généré
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-xs text-muted">
                      {r.sent_at ? fmt(r.sent_at) : '—'}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end">
                        {r.generated ? (
                          <button
                            onClick={() => handleDownload(r)}
                            disabled={downloadingMonth === r.month}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                          >
                            {downloadingMonth === r.month ? (
                              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            Télécharger PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerate(r)}
                            disabled={generatingMonth === r.month}
                            className="flex items-center gap-1.5 text-xs text-muted hover:text-dark font-medium transition-colors disabled:opacity-50"
                          >
                            {generatingMonth === r.month ? (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                            Demander le relevé
                          </button>
                        )}
                      </div>
                    </td>
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
