import React, { useEffect, useRef, useState } from 'react'
import { Upload, Download, Mail, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import api from '../lib/api'

interface ParsedRow {
  voyageur_nom: string
  montant: number
  date_checkin: string
  date_checkout: string
  logement?: string
  platform?: string
}

interface Invoice {
  id: string
  numero: string
  date: string
  voyageur_nom: string
  montant: number
  pdf_url?: string
}

export default function Factures() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Blob | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Invoice[]>('/api/invoices')
      .then((r) => setInvoices(r.data))
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false))
  }, [])

  const handleFile = async (file: File) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!allowed.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setUploadError('Veuillez sélectionner un fichier Excel (.xlsx) ou CSV (.csv).')
      return
    }
    setUploadError(null)
    setFileName(file.name)
    setParsedRows([])
    setPdfBlobUrl(null)
    setPdfBytes(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post<{ rows: ParsedRow[] }>('/api/invoices/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setParsedRows(res.data.rows)
    } catch {
      setUploadError('Impossible de traiter le fichier. Vérifiez le format.')
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleGenerate = async () => {
    if (parsedRows.length === 0) return
    setGenerating(true)
    setPdfBlobUrl(null)
    setPdfBytes(null)
    try {
      const res = await api.post('/api/invoices/generate', { rows: parsedRows }, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfBlobUrl(url)
      setPdfBytes(blob)
      await api.get<Invoice[]>('/api/invoices')
        .then((r) => setInvoices(r.data))
        .catch(() => {})
    } catch {
      // silently
    }
    setGenerating(false)
  }

  const handleDownloadPdf = () => {
    if (!pdfBytes) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(pdfBytes)
    a.download = `facture_${Date.now()}.pdf`
    a.click()
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank')
    }
  }

  const handleSendEmail = async (invoice: Invoice) => {
    setSendingEmail(invoice.id)
    try {
      await api.post(`/api/invoices/${invoice.id}/send-email`)
    } catch {
      // silently
    }
    setSendingEmail(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">
          Factures
        </h1>
        <p className="text-muted text-sm mt-1">Import, génération et gestion des factures</p>
      </div>

      {/* Section 1: Upload */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-dark">Importer un fichier</h2>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragging ? 'border-primary bg-primary-light' : 'border-border hover:border-primary hover:bg-primary-light/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={handleFileInput}
          />
          <Upload size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-sm font-medium text-dark">
            Glissez-déposez un fichier Excel ou CSV ici
          </p>
          <p className="text-xs text-muted mt-1">ou cliquez pour sélectionner</p>
          <p className="text-xs text-muted mt-2">Formats acceptés : .xlsx, .csv</p>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted">
            <Loader2 size={16} className="animate-spin text-primary" />
            Analyse du fichier en cours...
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-red-500 mt-3">{uploadError}</p>
        )}

        {fileName && !uploading && parsedRows.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-dark">
                {fileName} — <span className="text-muted">{parsedRows.length} ligne(s) importée(s)</span>
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Voyageur</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Logement</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Check-in</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Check-out</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className="border-b border-border hover:bg-bg">
                      <td className="py-2.5 px-4 font-medium text-dark">{row.voyageur_nom}</td>
                      <td className="py-2.5 px-4 text-muted">{row.logement ?? '—'}</td>
                      <td className="py-2.5 px-4 text-muted">
                        {row.date_checkin ? new Date(row.date_checkin).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-muted">
                        {row.date_checkout ? new Date(row.date_checkout).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-dark">
                        {row.montant?.toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60"
                style={{ backgroundColor: '#e8611a' }}
              >
                {generating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText size={15} />
                    Générer la facture PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: PDF Preview */}
      {pdfBlobUrl && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-dark">Prévisualisation PDF</h2>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download size={15} />
              Télécharger
            </button>
          </div>
          <iframe
            src={pdfBlobUrl}
            className="w-full h-[500px] rounded-lg border border-border"
            title="Prévisualisation facture PDF"
          />
        </div>
      )}

      {/* Section 3: History */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-dark">Historique des factures</h2>
        </div>

        {loadingInvoices ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            Aucune facture générée pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">N° Facture</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Voyageur</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Montant</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-bg">
                    <td className="py-3 px-4 font-mono text-xs text-dark">{inv.numero}</td>
                    <td className="py-3 px-4 text-muted">
                      {new Date(inv.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 font-medium text-dark">{inv.voyageur_nom}</td>
                    <td className="py-3 px-4 font-semibold text-dark">
                      {inv.montant.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        className="text-muted hover:text-dark mr-3"
                        title="Télécharger"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => handleSendEmail(inv)}
                        disabled={sendingEmail === inv.id}
                        className="text-muted hover:text-dark disabled:opacity-40"
                        title="Envoyer par email"
                      >
                        {sendingEmail === inv.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Mail size={15} />
                        )}
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
