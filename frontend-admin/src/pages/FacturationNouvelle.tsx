import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Upload, FileSpreadsheet, X, ChevronRight, Download, Mail, Loader2,
  Plus, Trash2, Mic, MicOff, FileText, CalendarRange, User, Building2,
  ChevronDown, Search
} from 'lucide-react'
import api from '../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  voyageur: string | null
  email: string | null
  telephone: string | null
  logement: string | null
  checkin: string | null
  checkout: string | null
  montant: number | null
  commissionRate: number
  commissionHT: number | null
  tvaAmount: number | null
  totalTTC: number | null
}

interface ParseSummary { lignes: number; totalHT: number; tvaAmount: number; totalTTC: number }

interface ManualRow {
  voyageur: string
  logement: string
  checkin: string
  checkout: string
  montant: string
  commissionRate: string
}

const emptyRow = (): ManualRow => ({
  voyageur: '', logement: '', checkin: '', checkout: '', montant: '', commissionRate: '20',
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n != null ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

function calcRow(row: ManualRow) {
  const montant = parseFloat(row.montant) || 0
  const rate    = parseFloat(row.commissionRate) || 20
  const ht      = parseFloat((montant * rate / 100).toFixed(2))
  const tva     = parseFloat((ht * 0.2).toFixed(2))
  const ttc     = parseFloat((ht + tva).toFixed(2))
  return { montant, commissionRate: rate, commissionHT: ht, tvaAmount: tva, totalTTC: ttc }
}

function nightsBetween(ci: string, co: string) {
  if (!ci || !co) return null
  const diff = new Date(co).getTime() - new Date(ci).getTime()
  const n = Math.round(diff / 86400000)
  return n > 0 ? n : null
}

// ── Composant dictée vocale ───────────────────────────────────────────────────

const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

function MicButton({ onResult, className = '' }: { onResult: (text: string) => void; className?: string }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  const toggle = useCallback(() => {
    if (!SR) { alert('Dictée vocale non supportée sur ce navigateur. Utilisez Chrome ou Edge.'); return }

    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }

    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }, [listening, onResult])

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Arrêter la dictée' : 'Dicter ce champ'}
      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        listening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-border-light text-muted hover:bg-primary-light hover:text-primary'
      } ${className}`}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  )
}

// ── Champ texte avec micro ───────────────────────────────────────────────────

function VoiceInput({
  label, value, onChange, placeholder, type = 'text', min, step
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; min?: string; step?: string
}) {
  return (
    <div className="min-w-0">
      <label className="block text-xs font-medium text-dark mb-1 truncate">{label}</label>
      <div className="flex gap-1.5 min-w-0">
        <input
          type={type} value={value} min={min} step={step}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
        />
        {SR && (
          <MicButton onResult={(t) => {
            if (type === 'number') {
              const num = t.replace(/[^\d.,]/g, '').replace(',', '.')
              if (num) onChange(num)
            } else {
              onChange(t)
            }
          }} />
        )}
      </div>
    </div>
  )
}

// ── Résultat PDF partagé ─────────────────────────────────────────────────────

function PdfResult({
  pdfBlobUrl, pdfBytes, invoiceNumber, fileName,
  onReset
}: {
  pdfBlobUrl: string; pdfBytes: Blob; invoiceNumber: string | null
  fileName?: string | null; onReset: () => void
}) {
  const [emailTo, setEmailTo]       = useState('')
  const [emailSubject, setSubject]  = useState('Votre relevé mensuel StayPilot')
  const [emailOpen, setEmailOpen]   = useState(false)
  const [sending, setSending]       = useState(false)
  const [emailSent, setEmailSent]   = useState(false)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = pdfBlobUrl
    a.download = (invoiceNumber ?? fileName?.replace(/\.[^.]+$/, '') ?? 'facture') + '.pdf'
    a.click()
  }

  const handleSend = async () => {
    if (!emailTo || !pdfBytes) return
    setSending(true)
    try {
      const ab  = await pdfBytes.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)))
      await api.post('/api/invoices/send-direct', {
        email: emailTo, subject: emailSubject,
        pdfBase64: b64, invoiceNumber: invoiceNumber ?? 'facture',
      })
      setEmailSent(true)
      setEmailOpen(false)
    } catch {}
    setSending(false)
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <p className="font-semibold text-dark">
          Facture générée ✓
          {invoiceNumber && <span className="ml-2 text-muted font-normal text-sm">({invoiceNumber})</span>}
        </p>
        <div className="flex gap-2">
          <button onClick={onReset}
            className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-2 hover:bg-bg transition-colors">
            <X size={14} /> Nouvelle
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm text-dark border border-border rounded-lg px-3 py-2 hover:bg-bg transition-colors">
            <Download size={14} /> Télécharger
          </button>
          <button onClick={() => setEmailOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm text-white bg-primary hover:bg-primary-dark rounded-lg px-3 py-2 transition-colors">
            <Mail size={14} /> Envoyer
          </button>
        </div>
      </div>
      <div className="p-5">
        <iframe src={pdfBlobUrl} title="Aperçu facture" className="w-full h-[500px] rounded-lg border border-border" />
      </div>
      {emailSent && (
        <div className="mx-5 mb-5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          ✓ Email envoyé avec succès
        </div>
      )}
      {emailOpen && (
        <div className="px-5 pb-5 space-y-3">
          <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
            placeholder="Destinataire (email@example.com)"
            className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted" />
          <input type="text" value={emailSubject} onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary" />
          <button onClick={handleSend} disabled={sending || !emailTo}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Onglet Import fichier ─────────────────────────────────────────────────────

function TabImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [parsedRows, setParsedRows]   = useState<ParsedRow[]>([])
  const [summary, setSummary]         = useState<ParseSummary | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName]       = useState<string | null>(null)
  const [generating, setGenerating]   = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl]   = useState<string | null>(null)
  const [pdfBytes, setPdfBytes]       = useState<Blob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
    if (!allowed.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setUploadError('Veuillez sélectionner un fichier Excel (.xlsx) ou CSV (.csv).')
      return
    }
    setUploadError(null); setFileName(file.name); setParsedRows([]); setSummary(null)
    setParseErrors([]); setPdfBlobUrl(null); setPdfBytes(null); setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/api/invoices/parse', formData)
      const parsed = res.data as any
      setParsedRows(Array.isArray(parsed.rows) ? parsed.rows : [])
      setSummary(parsed.summary ?? null)
      setParseErrors(Array.isArray(parsed.errors) ? parsed.errors : [])
    } catch (e: any) {
      const err = e?.response?.data?.error
      setUploadError(Array.isArray(err) ? err.map((x: any) => x.message || x).join(', ') : (err ?? 'Erreur lors de l\'analyse du fichier.'))
    }
    setUploading(false)
  }

  const handleGeneratePDF = async () => {
    if (parsedRows.length === 0) return
    setGenerating(true); setPdfBlobUrl(null); setPdfBytes(null)
    try {
      const res = await api.post('/api/invoices/generate', { rows: parsedRows, type: 'commission', recipient: {} }, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      setPdfBytes(blob); setPdfBlobUrl(URL.createObjectURL(blob))
      const headers = (res as any).headers
      setInvoiceNumber(headers?.['x-invoice-number'] ?? null)
    } catch (e: any) {
      let errMsg = 'Erreur lors de la génération du PDF.'
      try {
        const text = await (e?.response?.data as Blob)?.text()
        const json = JSON.parse(text || '{}')
        const raw = json?.error
        errMsg = Array.isArray(raw) ? raw.map((x: any) => x.message || x).join(', ') : (raw ?? errMsg)
      } catch {}
      setUploadError(errMsg)
    }
    setGenerating(false)
  }

  const reset = () => {
    setParsedRows([]); setSummary(null); setParseErrors([]); setFileName(null)
    setPdfBlobUrl(null); setPdfBytes(null); setUploadError(null); setInvoiceNumber(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (pdfBlobUrl && pdfBytes) {
    return <PdfResult pdfBlobUrl={pdfBlobUrl} pdfBytes={pdfBytes} invoiceNumber={invoiceNumber} fileName={fileName} onReset={reset} />
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary-light' : 'border-border hover:border-primary hover:bg-primary-light/30'}`}>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center">
            <FileSpreadsheet size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-dark">Glisser un fichier Excel ou CSV ici</p>
            <p className="text-sm text-muted mt-1">ou cliquer pour sélectionner</p>
          </div>
          <p className="text-xs text-muted">Formats acceptés : .xlsx, .xls, .csv</p>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <X size={14} className="flex-shrink-0" /><span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)}><X size={14} /></button>
        </div>
      )}
      {parseErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          <p className="font-medium mb-1">{parseErrors.length} avertissement{parseErrors.length > 1 ? 's' : ''} :</p>
          <ul className="list-disc list-inside space-y-0.5">{parseErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {uploading && (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-5">
          <Loader2 size={20} className="text-primary animate-spin" />
          <p className="text-sm text-dark">Analyse du fichier en cours…</p>
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="font-semibold text-dark">{fileName}</p>
              <p className="text-xs text-muted mt-0.5">
                {parsedRows.length} ligne{parsedRows.length !== 1 ? 's' : ''}
                {summary && ` · HT : ${fmt(summary.totalHT)} · TTC : ${fmt(summary.totalTTC)}`}
              </p>
            </div>
            <button onClick={reset} className="text-muted hover:text-dark"><X size={16} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  {['Voyageur', 'Logement', 'Check-in', 'Check-out', 'Montant', 'Comm. HT'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.map((row, i) => (
                  <tr key={i} className="hover:bg-bg">
                    <td className="px-4 py-3 font-medium text-dark">{row.voyageur ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{row.logement ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(row.checkin)}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(row.checkout)}</td>
                    <td className="px-4 py-3 text-muted">{fmt(row.montant)}</td>
                    <td className="px-4 py-3 font-medium text-dark">{fmt(row.commissionHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-border">
            <button onClick={handleGeneratePDF} disabled={generating}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {generating ? 'Génération…' : 'Générer la facture PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Saisie manuelle ────────────────────────────────────────────────────

function TabFormulaire() {
  const [rows, setRows]         = useState<ManualRow[]>([emptyRow()])
  const [recipient, setRecip]   = useState({ nom: '', email: '', adresse: '' })
  const [generating, setGen]    = useState(false)
  const [pdfBlobUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Blob | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [invoiceNumber, setInvNum] = useState<string | null>(null)

  const setRow = (i: number, field: keyof ManualRow, val: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const addRow = () => setRows((prev) => [...prev, emptyRow()])

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const totalHT  = rows.reduce((s, r) => s + calcRow(r).commissionHT, 0)
  const totalTVA = parseFloat((totalHT * 0.2).toFixed(2))
  const totalTTC = parseFloat((totalHT + totalTVA).toFixed(2))

  const handleGenerate = async () => {
    const validRows = rows.filter((r) => r.montant && r.checkin && r.checkout)
    if (validRows.length === 0) { setError('Remplissez au moins une ligne avec check-in, check-out et montant.'); return }
    setError(null); setGen(true)
    try {
      const apiRows = validRows.map((r) => ({
        voyageur: r.voyageur || null,
        logement: r.logement || null,
        checkin:  r.checkin,
        checkout: r.checkout,
        ...calcRow(r),
      }))
      const res = await api.post(
        '/api/invoices/generate',
        { rows: apiRows, type: 'commission', recipient },
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      setPdfBytes(blob); setPdfUrl(URL.createObjectURL(blob))
      setInvNum((res as any).headers?.['x-invoice-number'] ?? null)
    } catch (e: any) {
      let msg = 'Erreur lors de la génération.'
      try {
        const text = await (e?.response?.data as Blob)?.text()
        const json = JSON.parse(text || '{}')
        msg = json?.error ?? msg
      } catch {}
      setError(msg)
    }
    setGen(false)
  }

  const reset = () => {
    setRows([emptyRow()]); setRecip({ nom: '', email: '', adresse: '' })
    setPdfUrl(null); setPdfBytes(null); setError(null); setInvNum(null)
  }

  if (pdfBlobUrl && pdfBytes) {
    return <PdfResult pdfBlobUrl={pdfBlobUrl} pdfBytes={pdfBytes} invoiceNumber={invoiceNumber} onReset={reset} />
  }

  return (
    <div className="space-y-5">
      {/* Info dictée */}
      {SR && (
        <div className="flex items-center gap-2 bg-primary-light border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary">
          <Mic size={15} className="flex-shrink-0" />
          Dictée vocale disponible — cliquez sur <Mic size={13} className="inline mx-1" /> à côté de chaque champ pour dicter
        </div>
      )}

      {/* Destinataire */}
      <div className="bg-surface rounded-xl border border-border p-5 overflow-hidden">
        <h3 className="text-sm font-semibold text-dark mb-4">Destinataire</h3>
        <div className="grid grid-cols-1 gap-3">
          <VoiceInput label="Nom / Société" value={recipient.nom}
            onChange={(v) => setRecip((r) => ({ ...r, nom: v }))} placeholder="Nom du propriétaire" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <VoiceInput label="Email" value={recipient.email}
              onChange={(v) => setRecip((r) => ({ ...r, email: v }))} placeholder="email@exemple.com" />
            <VoiceInput label="Adresse" value={recipient.adresse}
              onChange={(v) => setRecip((r) => ({ ...r, adresse: v }))} placeholder="12 rue de la Paix, Paris" />
          </div>
        </div>
      </div>

      {/* Lignes */}
      <div className="space-y-3">
        {rows.map((row, i) => {
          const calc   = calcRow(row)
          const nights = nightsBetween(row.checkin, row.checkout)
          return (
            <div key={i} className="bg-surface rounded-xl border border-border p-4 overflow-hidden">
              {/* En-tête ligne */}
              <div className="flex items-center justify-between mb-4 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-dark truncate">
                    {row.voyageur || `Séjour ${i + 1}`}
                  </span>
                  {nights != null && (
                    <span className="text-xs text-muted font-normal flex-shrink-0">· {nights} nuit{nights > 1 ? 's' : ''}</span>
                  )}
                </div>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="flex-shrink-0 ml-2 text-muted hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Voyageur + Logement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <VoiceInput label="Nom du voyageur" value={row.voyageur}
                  onChange={(v) => setRow(i, 'voyageur', v)} placeholder="Sophie Martin" />
                <VoiceInput label="Logement" value={row.logement}
                  onChange={(v) => setRow(i, 'logement', v)} placeholder="Appartement Montmartre" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <VoiceInput label="Check-in" value={row.checkin}
                  onChange={(v) => setRow(i, 'checkin', v)} type="date" />
                <VoiceInput label="Check-out" value={row.checkout}
                  onChange={(v) => setRow(i, 'checkout', v)} type="date" />
              </div>

              {/* Montant + Taux */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <VoiceInput label="Montant séjour (€)" value={row.montant}
                  onChange={(v) => setRow(i, 'montant', v)} type="number" min="0" step="0.01" placeholder="1200" />
                <VoiceInput label="Taux commission (%)" value={row.commissionRate}
                  onChange={(v) => setRow(i, 'commissionRate', v)} type="number" min="0" step="1" placeholder="20" />
              </div>

              {/* Récap calculé */}
              {calc.montant > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-border">
                  {[
                    { label: 'Comm. HT', value: fmt(calc.commissionHT) },
                    { label: 'TVA 20%',  value: fmt(calc.tvaAmount) },
                    { label: 'TTC',      value: fmt(calc.totalTTC), accent: true },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className={`rounded-lg px-3 py-2 text-center text-xs ${accent ? 'bg-primary text-white font-semibold' : 'bg-bg text-muted'}`}>
                      <div className="mb-0.5">{label}</div>
                      <div className={`font-semibold ${accent ? 'text-white' : 'text-dark'} text-sm`}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <button onClick={addRow}
          className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30 text-muted hover:text-primary rounded-xl py-3 text-sm font-medium transition-colors">
          <Plus size={16} /> Ajouter un séjour
        </button>
      </div>

      {/* Totaux */}
      {totalHT > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-bg">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Récapitulatif global</p>
          </div>
          <div className="p-5 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted">Total commissions HT</span>
              <span className="font-medium text-dark">{fmt(totalHT)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted">TVA (20%)</span>
              <span className="font-medium text-dark">{fmt(totalTVA)}</span>
            </div>
            <div className="flex justify-between items-center text-base border-t border-border pt-3 mt-1">
              <span className="font-bold text-dark">Total TTC</span>
              <span className="text-xl font-bold text-primary">{fmt(totalTTC)}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <X size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={generating}
        className="flex items-center gap-2 w-full justify-center bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60">
        {generating ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
        {generating ? 'Génération en cours…' : 'Générer la facture PDF'}
      </button>
    </div>
  )
}

// ── Onglet Relevé mensuel propriétaire ───────────────────────────────────────

interface Proprietaire { id: string; nom: string; email?: string; adresse?: string; logement_ids?: string[] }
interface ReservationReleve {
  id: string
  voyageur?: string | null
  logement?: string | null
  checkin?: string | null
  checkout?: string | null
  montant?: number | null
  commission_rate?: number
  commission_ht?: number | null
  tva_amount?: number | null
  total_ttc?: number | null
  net_proprietaire?: number | null
}
interface LogementOption { id: string; name: string }

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

// ── Formulaire création propriétaire ─────────────────────────────────────────
function FormulaireNouveauProp({
  logements, onCreated, onCancel,
}: {
  logements: LogementOption[]
  onCreated: (p: Proprietaire) => void
  onCancel: () => void
}) {
  const [nom,      setNom]      = useState('')
  const [email,    setEmail]    = useState('')
  const [adresse,  setAdresse]  = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!nom.trim()) { setErr('Le nom est requis.'); return }
    setSaving(true); setErr(null)
    try {
      const res = await api.post('/api/proprietaires', {
        nom: nom.trim(), email: email.trim() || undefined,
        adresse: adresse.trim() || undefined, logement_ids: selected,
      })
      onCreated(res.data as Proprietaire)
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Erreur lors de la création.')
    }
    setSaving(false)
  }

  return (
    <div className="border border-primary/30 bg-primary-light/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wide">Nouveau propriétaire</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-dark mb-1">Nom *</label>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Jean Dupont"
            className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@exemple.com" type="email"
            className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-dark mb-1">Adresse</label>
        <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue de la Paix, Paris"
          className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted" />
      </div>

      {/* Logements associés */}
      {logements.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-dark mb-2">Logements associés</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {logements.map(l => (
              <button key={l.id} type="button" onClick={() => toggle(l.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selected.includes(l.id)
                    ? 'bg-primary text-white'
                    : 'bg-bg border border-border text-dark hover:border-primary'
                }`}>
                <Building2 size={13} className="flex-shrink-0" />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <X size={12} />{err}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {saving ? 'Création…' : 'Créer le propriétaire'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors">
          Annuler
        </button>
      </div>
    </div>
  )
}

function TabReleveMensuel() {
  const now = new Date()
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([])
  const [loadingProps, setLoadingProps]   = useState(true)
  const [logements, setLogements]         = useState<LogementOption[]>([])
  const [selectedProp, setSelectedProp]   = useState<Proprietaire | null>(null)
  const [propOpen, setPropOpen]           = useState(false)
  const [propSearch, setPropSearch]       = useState('')
  const [showNewForm, setShowNewForm]     = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [syncDone, setSyncDone]           = useState(false)
  const propRef                           = useRef<HTMLDivElement>(null)
  const [mois, setMois]                   = useState(now.getMonth())
  const [annee, setAnnee]                 = useState(now.getFullYear())
  const [reservations, setReservations]   = useState<ReservationReleve[]>([])
  const [loadingRes, setLoadingRes]       = useState(false)
  const [errRes, setErrRes]               = useState<string | null>(null)
  const [generating, setGenerating]       = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl]       = useState<string | null>(null)
  const [pdfBytes, setPdfBytes]           = useState<Blob | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)

  // Fermer dropdown au clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (propRef.current && !propRef.current.contains(e.target as Node)) {
        setPropOpen(false)
        if (!selectedProp) setPropSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedProp])

  // Charger propriétaires + logements + noms depuis factures
  useEffect(() => {
    api.get('/api/proprietaires')
      .then((r) => setProprietaires(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProprietaires([]))
      .finally(() => setLoadingProps(false))
    api.get('/api/logements')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : []
        setLogements(list.map((l: any) => ({ id: l.id, name: l.name ?? l.nom ?? l.id })))
      })
      .catch(() => setLogements([]))
  }, [])

  // Charger les réservations quand propriétaire ou période change
  useEffect(() => {
    if (!selectedProp) { setReservations([]); return }
    setLoadingRes(true); setErrRes(null); setPdfBlobUrl(null); setPdfBytes(null)
    api.get('/api/invoices/releve', {
      params: { proprietaire_id: selectedProp.id, mois: mois + 1, annee }
    })
      .then((r) => setReservations(Array.isArray(r.data?.reservations) ? r.data.reservations : []))
      .catch(() => { setReservations([]); setErrRes('Impossible de charger les réservations.') })
      .finally(() => setLoadingRes(false))
  }, [selectedProp, mois, annee])

  const totalBrut = reservations.reduce((s, r) => s + (r.montant ?? 0), 0)
  const totalComm = reservations.reduce((s, r) => s + (r.commission_ht ?? 0), 0)
  const totalNet  = reservations.reduce((s, r) => s + (r.net_proprietaire ?? (r.montant ?? 0) - (r.commission_ht ?? 0)), 0)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/api/invoices/sync-proprietaires')
      const { created, updated } = res.data as any
      // Recharger la liste
      const r = await api.get('/api/proprietaires')
      setProprietaires(Array.isArray(r.data) ? r.data : [])
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 4000)
      console.log(`Sync: ${created} créés, ${updated} mis à jour`)
    } catch {}
    setSyncing(false)
  }

  const handlePropCreated = (p: Proprietaire) => {
    setProprietaires(prev => [...prev, p])
    setSelectedProp(p)
    setShowNewForm(false)
    setPropOpen(false)
  }

  const handleGenerate = async () => {
    if (!selectedProp || reservations.length === 0) return
    setGenerating(true)
    try {
      const res = await api.post('/api/invoices/generate-releve', {
        proprietaire: selectedProp,
        mois: mois + 1,
        annee,
        reservations,
      }, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      setPdfBytes(blob)
      setPdfBlobUrl(URL.createObjectURL(blob))
      setInvoiceNumber((res as any).headers?.['x-invoice-number'] ?? null)
    } catch {
      setErrRes('Erreur lors de la génération du PDF.')
    }
    setGenerating(false)
  }

  const reset = () => { setPdfBlobUrl(null); setPdfBytes(null); setInvoiceNumber(null) }

  if (pdfBlobUrl && pdfBytes) {
    return (
      <PdfResult
        pdfBlobUrl={pdfBlobUrl}
        pdfBytes={pdfBytes}
        invoiceNumber={invoiceNumber}
        fileName={`releve-${selectedProp?.nom}-${MOIS[mois]}-${annee}`}
        onReset={reset}
      />
    )
  }

  return (
    <div className="space-y-5">

      {/* Sélection propriétaire + période */}
      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-dark flex items-center gap-2">
          <User size={15} className="text-primary" /> Propriétaire &amp; période
        </h3>

        {/* Dropdown propriétaire */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-dark">Propriétaire</label>
            <div className="flex items-center gap-3">
              <button onClick={handleSync} disabled={syncing}
                title="Importer les destinataires depuis l'historique des factures"
                className="flex items-center gap-1 text-xs text-muted hover:text-dark font-medium transition-colors disabled:opacity-50">
                {syncing
                  ? <><Loader2 size={11} className="animate-spin" /> Sync…</>
                  : syncDone
                    ? <span className="text-green-600">✓ Synchronisé</span>
                    : '↻ Sync historique'}
              </button>
              <button onClick={() => { setShowNewForm(v => !v); setPropOpen(false) }}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                <Plus size={12} /> {showNewForm ? 'Annuler' : 'Nouveau'}
              </button>
            </div>
          </div>

          {showNewForm ? (
            <FormulaireNouveauProp
              logements={logements}
              onCreated={handlePropCreated}
              onCancel={() => setShowNewForm(false)}
            />
          ) : (
            <div className="relative" ref={propRef}>
              {/* Champ de recherche / sélection */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={selectedProp && !propOpen ? selectedProp.nom : propSearch}
                  onChange={e => { setPropSearch(e.target.value); setPropOpen(true); if (selectedProp) setSelectedProp(null) }}
                  onFocus={() => { setPropOpen(true); if (selectedProp) setPropSearch(selectedProp.nom) }}
                  placeholder={loadingProps ? 'Chargement…' : 'Rechercher un propriétaire…'}
                  className="w-full pl-8 pr-8 border border-border bg-bg text-dark rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
                />
                {selectedProp && !propOpen && (
                  <button onClick={() => { setSelectedProp(null); setPropSearch(''); setPropOpen(true) }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                    <X size={14} />
                  </button>
                )}
                {!selectedProp && (
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                )}
              </div>

              {/* Propriétaire sélectionné — badge */}
              {selectedProp && !propOpen && (
                <div className="mt-2 flex items-center gap-2 bg-primary-light/30 border border-primary/20 rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {selectedProp.nom[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark truncate">{selectedProp.nom}</p>
                    {selectedProp.email && <p className="text-xs text-muted truncate">{selectedProp.email}</p>}
                  </div>
                </div>
              )}

              {/* Dropdown */}
              {propOpen && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
                  {(() => {
                    const q = propSearch.toLowerCase()
                    const filtered = proprietaires.filter(p =>
                      !q || p.nom.toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
                    )
                    return (
                      <>
                        {filtered.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto divide-y divide-border">
                            {filtered.map((p) => (
                              <button key={p.id}
                                onClick={() => { setSelectedProp(p); setPropOpen(false); setPropSearch('') }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-light/40 transition-colors flex items-center gap-2.5 ${selectedProp?.id === p.id ? 'bg-primary-light/30 text-primary font-medium' : 'text-dark'}`}>
                                <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                  {p.nom[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="leading-tight truncate">{p.nom}</p>
                                  {p.email && <p className="text-xs text-muted truncate">{p.email}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-center">
                            <p className="text-sm text-muted mb-1">
                              {propSearch ? `Aucun résultat pour "${propSearch}"` : 'Aucun propriétaire enregistré'}
                            </p>
                          </div>
                        )}
                        <div className="border-t border-border px-4 py-2.5">
                          <button
                            onClick={() => { setShowNewForm(true); setPropOpen(false) }}
                            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary-dark transition-colors">
                            <Plus size={12} />
                            {propSearch ? `Créer "${propSearch}"` : 'Nouveau propriétaire'}
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mois + Année */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Mois</label>
            <select value={mois} onChange={(e) => setMois(Number(e.target.value))}
              className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary">
              {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark mb-1">Année</label>
            <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}
              className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary">
              {[annee - 1, annee, annee + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {selectedProp && (
        <>
          {loadingRes ? (
            <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-5">
              <Loader2 size={18} className="text-primary animate-spin" />
              <p className="text-sm text-dark">Chargement des réservations…</p>
            </div>
          ) : errRes ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <X size={14} />{errRes}
            </div>
          ) : reservations.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border flex flex-col items-center justify-center py-12 gap-3">
              <Building2 size={32} className="text-muted opacity-40" />
              <p className="text-sm text-muted">Aucune réservation pour {selectedProp.nom} en {MOIS[mois]} {annee}</p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">

              {/* En-tête */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-dark flex items-center gap-2">
                    <CalendarRange size={15} className="text-primary" />
                    Relevé de {MOIS[mois]} {annee} — {selectedProp.nom}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Tableau des réservations */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      {['Logement','Voyageur','Check-in','Check-out','Montant brut','Commission','Net propriétaire'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reservations.map((r, i) => {
                      const net = r.net_proprietaire ?? (r.montant ?? 0) - (r.commission_ht ?? 0)
                      return (
                        <tr key={i} className="hover:bg-bg transition-colors">
                          <td className="px-4 py-3 font-medium text-dark">{r.logement ?? '—'}</td>
                          <td className="px-4 py-3 text-muted">{r.voyageur ?? '—'}</td>
                          <td className="px-4 py-3 text-muted">{fmtDate(r.checkin)}</td>
                          <td className="px-4 py-3 text-muted">{fmtDate(r.checkout)}</td>
                          <td className="px-4 py-3 text-muted">{fmt(r.montant)}</td>
                          <td className="px-4 py-3 text-muted">{fmt(r.commission_ht)}</td>
                          <td className="px-4 py-3 font-semibold text-primary">{fmt(net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totaux */}
              <div className="px-5 py-4 border-t border-border bg-bg">
                <div className="flex justify-end">
                  <div className="space-y-2 min-w-64">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Total revenus bruts</span>
                      <span className="font-medium text-dark">{fmt(totalBrut)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Commissions conciergerie</span>
                      <span className="font-medium text-dark">- {fmt(totalComm)}</span>
                    </div>
                    <div className="flex justify-between text-base border-t border-border pt-2 mt-1">
                      <span className="font-bold text-dark">Net à reverser</span>
                      <span className="text-xl font-bold text-primary">{fmt(totalNet)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton générer */}
              <div className="px-5 py-4 border-t border-border">
                <button onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {generating ? 'Génération…' : `Générer le relevé PDF — ${MOIS[mois]} ${annee}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FacturationNouvelle() {
  const [tab, setTab] = useState<'formulaire' | 'import' | 'releve'>('formulaire')

  return (
    <div className="max-w-3xl mx-auto">
      {/* Onglets */}
      <div className="flex gap-1 bg-bg border border-border rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('formulaire')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'formulaire' ? 'bg-surface shadow-sm text-dark' : 'text-muted hover:text-dark'
          }`}>
          <FileText size={15} /> Saisie manuelle
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'import' ? 'bg-surface shadow-sm text-dark' : 'text-muted hover:text-dark'
          }`}>
          <Upload size={15} /> Importer un fichier
        </button>
        <button
          onClick={() => setTab('releve')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'releve' ? 'bg-surface shadow-sm text-dark' : 'text-muted hover:text-dark'
          }`}>
          <CalendarRange size={15} />
          <span>Relevé mensuel</span>
          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">NEW</span>
        </button>
      </div>

      {tab === 'formulaire' && <TabFormulaire />}
      {tab === 'import'     && <TabImport />}
      {tab === 'releve'     && <TabReleveMensuel />}
    </div>
  )
}
