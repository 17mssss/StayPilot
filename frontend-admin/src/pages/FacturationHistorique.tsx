import React, { useEffect, useState } from 'react'
import { Download, Mail, Search, Receipt, Loader2, ChevronDown, ChevronUp, User, Calendar, Percent, Copy, Check, FileSpreadsheet } from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

interface InvoiceRow {
  voyageur?: string | null
  logement?: string | null
  checkin?: string | null
  checkout?: string | null
  montant?: number | null
  commissionRate?: number
  commissionHT?: number | null
  tvaAmount?: number | null
  totalTTC?: number | null
}

interface Invoice {
  id: string
  invoice_number?: string
  type?: string
  created_at?: string
  recipient_data?: string | { nom?: string; email?: string; adresse?: string }
  rows_data?: string | InvoiceRow[]
  total_ht?: number
  tva_amount?: number
  total_ttc?: number
  status?: string
  sent_to?: string
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    generated: { label: 'Générée', cls: 'bg-blue-100 text-blue-700' },
    sent:      { label: 'Envoyée', cls: 'bg-green-100 text-green-700' },
    paid:      { label: 'Payée',   cls: 'bg-primary-light text-primary' },
  }
  const { label, cls } = map[status ?? ''] ?? { label: status ?? 'Générée', cls: 'bg-border text-muted' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

function TypeBadge({ type }: { type?: string }) {
  if (type === 'releve_mensuel') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Relevé</span>
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Facture</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} title="Copier le nom"
      className="ml-1 p-1 rounded text-muted hover:text-primary hover:bg-primary-light transition-colors flex-shrink-0">
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
    </button>
  )
}

function parseJson<T>(val: string | T | undefined): T | null {
  if (!val) return null
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return val as T
}

function nightsBetween(checkin?: string | null, checkout?: string | null): number | null {
  if (!checkin || !checkout) return null
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEur(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ── Détail déroulant ─────────────────────────────────────────────────────────
function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const rows   = parseJson<InvoiceRow[]>(invoice.rows_data) ?? []
  const recip  = parseJson<{ nom?: string; email?: string; adresse?: string }>(invoice.recipient_data)

  return (
    <div className="bg-bg border-t border-border px-5 py-4 space-y-4">

      {/* Bannière propriétaire */}
      {recip && (recip.nom || recip.email) && (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {recip.nom?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-dark truncate">{recip.nom ?? '—'}</p>
              {recip.nom && <CopyButton text={recip.nom} />}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {recip.email   && <p className="text-xs text-muted">{recip.email}</p>}
              {recip.adresse && <p className="text-xs text-muted">{recip.adresse}</p>}
            </div>
          </div>
          <span className="text-xs text-muted flex-shrink-0">Propriétaire</span>
        </div>
      )}

      {/* Tableau des lignes */}
      {rows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted">Voyageur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Logement</th>
                <th className="px-3 py-2 text-center font-medium text-muted">Check-in</th>
                <th className="px-3 py-2 text-center font-medium text-muted">Check-out</th>
                <th className="px-3 py-2 text-center font-medium text-muted">Nuits</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Séjour</th>
                <th className="px-3 py-2 text-center font-medium text-muted">Taux comm.</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Comm. HT</th>
                <th className="px-3 py-2 text-right font-medium text-muted">TVA 20%</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const nights = nightsBetween(row.checkin, row.checkout)
                return (
                  <tr key={i} className="hover:bg-surface transition-colors">
                    <td className="px-3 py-2.5 font-medium text-dark">{row.voyageur ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted">{row.logement ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center text-muted">{fmtDate(row.checkin)}</td>
                    <td className="px-3 py-2.5 text-center text-muted">{fmtDate(row.checkout)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {nights != null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-dark">
                          <Calendar size={11} className="text-primary" />
                          {nights}n
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted">{fmtEur(row.montant)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {row.commissionRate != null ? (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                          <Percent size={10} />
                          {row.commissionRate}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-dark">{fmtEur(row.commissionHT)}</td>
                    <td className="px-3 py-2.5 text-right text-muted">{fmtEur(row.tvaAmount)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary">{fmtEur(row.totalTTC)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totaux globaux */}
      <div className="flex justify-end">
        <div className="bg-surface border border-border rounded-xl px-5 py-3 space-y-1.5 min-w-52">
          <div className="flex justify-between text-xs">
            <span className="text-muted">Total HT</span>
            <span className="font-medium text-dark">{fmtEur(invoice.total_ht)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted">TVA (20%)</span>
            <span className="font-medium text-dark">{fmtEur(invoice.tva_amount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1.5">
            <span className="font-semibold text-dark">Total TTC</span>
            <span className="font-bold text-primary">{fmtEur(invoice.total_ttc)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function FacturationHistorique() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)

  const handleExportCsv = async () => {
    setExportingCsv(true)
    try {
      const res = await api.get('/api/revenues/export-csv', { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const a = document.createElement('a')
      a.href = url
      a.download = `export-comptable-${yyyyMM}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExportingCsv(false)
  }

  useEffect(() => {
    api.get<Invoice[]>('/api/invoices')
      .then((r) => setInvoices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (invoice: Invoice) => {
    setDownloading(invoice.id)
    try {
      const res = await api.get(`/api/invoices/${invoice.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number ?? invoice.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setDownloading(null)
  }

  const handleSendEmail = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation()
    const email = invoice.sent_to ?? prompt('Email du destinataire :')
    if (!email) return
    setSendingEmail(invoice.id)
    try {
      await api.post(`/api/invoices/${invoice.id}/send`, { email })
    } catch {}
    setSendingEmail(null)
  }

  const getRecipient = (inv: Invoice) => {
    const r = parseJson<{ nom?: string }>(inv.recipient_data)
    return r?.nom ?? '—'
  }

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      getRecipient(inv).toLowerCase().includes(q) ||
      (inv.invoice_number ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une facture…"
            className="w-full pl-8 pr-3 py-2.5 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted" />
        </div>
        <span className="text-xs text-muted">{filtered.length} facture{filtered.length !== 1 ? 's' : ''}</span>
        <FeatureGate feature="exportComptable">
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-2 border border-border bg-surface hover:bg-bg text-dark rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {exportingCsv
              ? <Loader2 size={14} className="animate-spin" />
              : <FileSpreadsheet size={14} />
            }
            Export CSV
          </button>
        </FeatureGate>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border flex flex-col items-center justify-center h-48 gap-3">
          <Receipt size={36} className="text-muted opacity-40" />
          <p className="text-sm text-muted">Aucune facture générée</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {/* En-têtes — desktop only */}
          <div className="hidden md:grid grid-cols-[1.8fr_2fr_1.2fr_1.3fr_auto_auto] gap-0 border-b border-border bg-bg px-5 py-3">
            {['N° Facture', 'Propriétaire', 'Date', 'Montant TTC', 'Statut', ''].map((h, i) => (
              <p key={i} className="text-xs font-medium text-muted">{h}</p>
            ))}
          </div>

          {/* Lignes */}
          <div className="divide-y divide-border">
            {filtered.map((inv) => {
              const isOpen = expanded === inv.id
              const rows = parseJson<InvoiceRow[]>(inv.rows_data) ?? []
              const totalNights = rows.reduce((s, r) => s + (nightsBetween(r.checkin, r.checkout) ?? 0), 0)

              return (
                <div key={inv.id}>
                  {/* Vue carte — mobile */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : inv.id)}
                    className="md:hidden px-4 py-4 cursor-pointer active:bg-bg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-dark">
                            {inv.invoice_number ?? inv.id.slice(0, 8)}
                          </span>
                          <TypeBadge type={inv.type} />
                        </div>
                        <p className="text-sm font-semibold text-dark truncate">{getRecipient(inv)}</p>
                        <p className="text-xs text-muted mt-0.5">{fmtDate(inv.created_at)} · {rows.length} séjour{rows.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className="text-sm font-bold text-dark">{fmtEur(inv.total_ttc)}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border-light" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(inv) }}
                        disabled={downloading === inv.id}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-dark border border-border rounded-lg px-3 py-1.5 transition-colors">
                        {downloading === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        PDF
                      </button>
                      <button onClick={(e) => handleSendEmail(inv, e)}
                        disabled={sendingEmail === inv.id}
                        className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-primary-light">
                        {sendingEmail === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Email
                      </button>
                      <span className="ml-auto text-muted">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                    </div>
                  </div>

                  {/* Vue ligne — desktop */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : inv.id)}
                    className="hidden md:grid grid-cols-[1.8fr_2fr_1.2fr_1.3fr_auto_auto] gap-0 items-center px-5 py-3.5 cursor-pointer hover:bg-bg transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isOpen ? 'bg-primary' : 'bg-border'}`} />
                        <span className="font-mono text-xs font-semibold text-dark truncate">
                          {inv.invoice_number ?? inv.id.slice(0, 8)}
                        </span>
                      </div>
                      <TypeBadge type={inv.type} />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {getRecipient(inv)[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark leading-tight truncate">{getRecipient(inv)}</p>
                        {rows.length > 0 && (
                          <p className="text-xs text-muted leading-tight">
                            {rows.length} séjour{rows.length > 1 ? 's' : ''}
                            {totalNights > 0 && ` · ${totalNights} nuit${totalNights > 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted">{fmtDate(inv.created_at)}</p>
                    <p className="text-sm font-bold text-dark">{fmtEur(inv.total_ttc)}</p>
                    <StatusBadge status={inv.status} />
                    <div className="flex items-center gap-1.5 justify-end pl-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(inv) }}
                        disabled={downloading === inv.id} title="Télécharger PDF"
                        className="w-7 h-7 rounded-lg hover:bg-border-light flex items-center justify-center text-muted hover:text-dark transition-colors">
                        {downloading === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      </button>
                      <button onClick={(e) => handleSendEmail(inv, e)}
                        disabled={sendingEmail === inv.id} title="Envoyer par email"
                        className="w-7 h-7 rounded-lg hover:bg-primary-light flex items-center justify-center text-muted hover:text-primary transition-colors">
                        {sendingEmail === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                      </button>
                      <span className="text-muted">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                    </div>
                  </div>

                  {isOpen && <InvoiceDetail invoice={inv} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
