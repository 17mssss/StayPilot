import React, { useEffect, useState } from 'react'
import { FileText, Download, AlertCircle, Receipt } from 'lucide-react'
import api from '../lib/api'

interface Invoice {
  id: string
  invoice_number: string
  type: string
  status: string              // 'generated' | 'sent' | 'paid'
  total_ht: number
  tva_amount: number
  total_ttc: number
  recipient_data?: string     // JSON stringifié
  sent_to?: string
  sent_at?: string
  created_at: string
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getMonthLabel(created_at: string) {
  const d = new Date(created_at)
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function isCurrentMonth(created_at: string) {
  const now = new Date()
  const d   = new Date(created_at)
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    generated: { label: 'Générée',    cls: 'bg-blue-100 text-blue-700' },
    sent:      { label: 'Envoyée',    cls: 'bg-yellow-100 text-yellow-700' },
    paid:      { label: 'Payée',      cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

export default function Factures() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [totalNet, setTotalNet] = useState(0)

  useEffect(() => {
    api.get<Invoice[]>('/api/invoices')
      .then(r => {
        const data = r.data
        setInvoices(data)
        const net = data.reduce((s, inv) => s + (inv.total_ht ?? 0), 0)
        setTotalNet(net)
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (invoice: Invoice) => {
    try {
      const res = await api.get(`/api/invoices/${invoice.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${invoice.invoice_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Impossible de télécharger la facture.')
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI rapide */}
      {!loading && invoices.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-primary text-white rounded-xl p-5 shadow-card">
            <p className="text-xs text-orange-100 mb-1">Total net (HT)</p>
            <p className="text-2xl font-bold">{totalNet.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
          </div>
          <div className="bg-surface rounded-xl p-5 shadow-card">
            <p className="text-xs text-muted mb-1">Factures émises</p>
            <p className="text-2xl font-bold text-dark">{invoices.length}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 shadow-card">
            <p className="text-xs text-muted mb-1">Dernière facture</p>
            <p className="text-sm font-semibold text-dark">{invoices[0] ? getMonthLabel(invoices[0].created_at) : '—'}</p>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Receipt size={32} className="text-gray-300" />
            <p className="text-sm text-muted">Aucune facture disponible</p>
            <p className="text-xs text-muted text-center max-w-xs">
              Vos factures apparaîtront ici dès qu'elles seront générées par votre gestionnaire.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-100 bg-bg">
                  {['Référence', 'Période', 'Montant HT', 'TVA', 'Total TTC', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-bg transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-muted flex-shrink-0" />
                        <span className="font-mono text-xs text-dark">{inv.invoice_number}</span>
                        {isCurrentMonth(inv.created_at) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">
                            Nouveau
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{fmt(inv.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-dark">
                      {(inv.total_ht ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {(inv.tva_amount ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {(inv.total_ttc ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDownload(inv)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                      >
                        <Download size={13} />
                        PDF
                      </button>
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
