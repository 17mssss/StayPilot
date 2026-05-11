import React, { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Trash2,
  RefreshCw,
  MessageSquare,
  Mail,
  Phone,
  Bot,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import api from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface IntegrationCheck {
  name: string
  ok: boolean
  detail: string
  optional?: boolean
}

interface StatusData {
  all_ok: boolean
  checks: IntegrationCheck[]
  summary: string
}

interface SimResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ ok, optional }: { ok: boolean; optional?: boolean }) {
  if (ok) return (
    <span className="flex items-center gap-1 text-green-700 text-xs font-semibold">
      <CheckCircle size={14} /> OK
    </span>
  )
  if (optional) return (
    <span className="flex items-center gap-1 text-muted text-xs font-medium">
      <AlertCircle size={14} /> Optionnel
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
      <XCircle size={14} /> Erreur
    </span>
  )
}

function ResultBox({ result }: { result: SimResult | null }) {
  if (!result) return null
  const isOk = result.success
  return (
    <div className={`mt-3 rounded-lg p-3 text-sm ${isOk ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {isOk ? (
        <div>
          {result.data?.message && <p className="font-medium mb-1">{result.data.message as string}</p>}
          {Object.entries(result.data || {})
            .filter(([k]) => k !== 'message')
            .map(([k, v]) => (
              <p key={k} className="text-xs mt-0.5">
                <span className="font-medium text-muted">{k}:</span>{' '}
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </p>
            ))}
        </div>
      ) : (
        <p>{typeof result.error === 'string' ? result.error : JSON.stringify(result.error) || 'Erreur inconnue — vérifie la console du backend'}</p>
      )}
    </div>
  )
}

interface SimCardProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  accentColor?: string
}

function SimCard({ icon, title, description, children, accentColor = '#e8611a' }: SimCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}18` }}>
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-dark">{title}</h3>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Simulation() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Form states
  const [resaForm, setResaForm] = useState({ voyageur_nom: 'Sophie Martin', voyageur_email: '', voyageur_telephone: '', checkin_in_days: 2, duration_nights: 3 })
  const [smsEntrantForm, setSmsEntrantForm] = useState({ reservation_id: '', message: 'Bonjour, est-ce que je peux arriver à 14h ?' })
  const [testSmsForm, setTestSmsForm] = useState({ to: '', message: 'Test SMS StayPilot ✅ — Intégration Twilio opérationnelle !' })
  const [testEmailForm, setTestEmailForm] = useState({ to: '', subject: 'Test Email StayPilot ✅', message: 'Ce message confirme que l\'intégration SendGrid est opérationnelle !' })
  const [testIaForm, setTestIaForm] = useState({ message: 'Bonjour, est-ce que je peux arriver avec un animal de compagnie ?' })

  // Loading states
  const [loadingResa, setLoadingResa] = useState(false)
  const [loadingSmsEntrant, setLoadingSmsEntrant] = useState(false)
  const [loadingTestSms, setLoadingTestSms] = useState(false)
  const [loadingTestEmail, setLoadingTestEmail] = useState(false)
  const [loadingTestIa, setLoadingTestIa] = useState(false)
  const [loadingScheduler, setLoadingScheduler] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)

  // Results
  const [resaResult, setResaResult] = useState<SimResult | null>(null)
  const [smsEntrantResult, setSmsEntrantResult] = useState<SimResult | null>(null)
  const [testSmsResult, setTestSmsResult] = useState<SimResult | null>(null)
  const [testEmailResult, setTestEmailResult] = useState<SimResult | null>(null)
  const [testIaResult, setTestIaResult] = useState<SimResult | null>(null)
  const [schedulerResult, setSchedulerResult] = useState<SimResult | null>(null)
  const [resetResult, setResetResult] = useState<SimResult | null>(null)

  const [showStatusDetail, setShowStatusDetail] = useState(false)

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await api.get<StatusData>('/api/simulation/status')
      setStatus(res.data as unknown as StatusData)
    } catch {
      setStatus(null)
    }
    setLoadingStatus(false)
  }

  useEffect(() => { fetchStatus() }, [])

  const run = async <T extends SimResult>(
    fn: () => Promise<{ data: T }>,
    setLoading: (v: boolean) => void,
    setResult: (v: T) => void
  ) => {
    setLoading(true)
    try {
      const res = await fn()
      // L'intercepteur axios désemballe { success, data } → res.data est déjà le contenu
      // On réenveloppe pour que ResultBox fonctionne
      const inner = res.data as Record<string, unknown>
      if (inner && typeof inner === 'object' && 'success' in inner) {
        setResult(inner as T)
      } else {
        setResult({ success: true, data: inner } as T)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: unknown; success?: boolean } }; message?: string }
      const rawError = axiosErr.response?.data?.error
      const errMsg = Array.isArray(rawError)
        ? rawError.map((e: unknown) => (e && typeof e === 'object' && 'message' in e ? (e as { message: string }).message : JSON.stringify(e))).join(' · ')
        : typeof rawError === 'string'
          ? rawError
          : axiosErr.message || 'Erreur inconnue — vérifie la console du backend'
      setResult({ success: false, error: errMsg } as T)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Simulation</h1>
        <p className="text-muted text-sm mt-1">Testez toutes les intégrations sans compte Superhote</p>
      </div>

      {/* ── Statut des intégrations ── */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-dark">Statut des intégrations</h2>
            {status && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.all_ok ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {status.summary}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStatusDetail((v) => !v)}
              className="text-xs text-muted hover:text-dark flex items-center gap-1"
            >
              {showStatusDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showStatusDetail ? 'Réduire' : 'Détails'}
            </button>
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="flex items-center gap-1 text-xs text-white px-3 py-1.5 rounded-lg transition disabled:opacity-60"
              style={{ backgroundColor: '#e8611a' }}
            >
              <RefreshCw size={12} className={loadingStatus ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {loadingStatus ? (
          <div className="flex items-center gap-2 text-sm text-muted py-4">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e8611a', borderTopColor: 'transparent' }} />
            Vérification en cours...
          </div>
        ) : status ? (
          <div className="space-y-2">
            {/* Compact: required integrations only */}
            {!showStatusDetail ? (
              <div className="flex flex-wrap gap-3">
                {status.checks.filter((c) => !c.optional).map((c) => (
                  <div key={c.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${c.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {c.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {c.name}
                  </div>
                ))}
                {status.checks.filter((c) => c.optional).map((c) => (
                  <div key={c.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${c.ok ? 'bg-blue-50 text-blue-600' : 'bg-border-light text-muted'}`}>
                    {c.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                    {c.name} <span className="opacity-60">(optionnel)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {status.checks.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-dark">{c.name}</span>
                        {c.optional && <span className="text-xs text-muted bg-border-light px-1.5 py-0.5 rounded">Optionnel</span>}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{c.detail}</p>
                    </div>
                    <StatusBadge ok={c.ok} optional={c.optional} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-500">Impossible de récupérer le statut. Backend en ligne ?</p>
        )}
      </div>

      {/* ── Grille de simulation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 1. Nouvelle réservation */}
        <SimCard
          icon={<Calendar size={18} />}
          title="Simuler une réservation"
          description="Crée une réservation fictive sans Superhote"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Voyageur</label>
                <input
                  type="text"
                  value={resaForm.voyageur_nom}
                  onChange={(e) => setResaForm((f) => ({ ...f, voyageur_nom: e.target.value }))}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Email voyageur</label>
                <input
                  type="email"
                  value={resaForm.voyageur_email}
                  onChange={(e) => setResaForm((f) => ({ ...f, voyageur_email: e.target.value }))}
                  placeholder="optionnel"
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Tél voyageur</label>
                <input
                  type="text"
                  value={resaForm.voyageur_telephone}
                  onChange={(e) => setResaForm((f) => ({ ...f, voyageur_telephone: e.target.value }))}
                  placeholder="+33600000000"
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Check-in dans (jours)</label>
                <input
                  type="number"
                  min={0}
                  value={resaForm.checkin_in_days}
                  onChange={(e) => setResaForm((f) => ({ ...f, checkin_in_days: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                />
              </div>
            </div>
            <button
              onClick={() => run(() => api.post('/api/simulation/reservation', resaForm), setLoadingResa, setResaResult)}
              disabled={loadingResa}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
              style={{ backgroundColor: '#e8611a' }}
            >
              {loadingResa ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Créer la réservation
            </button>
          </div>
          <ResultBox result={resaResult} />
        </SimCard>

        {/* 2. SMS entrant */}
        <SimCard
          icon={<MessageSquare size={18} />}
          title="Simuler un SMS entrant"
          description="Simule un message reçu d'un voyageur (déclenche l'IA si autopilote actif)"
          accentColor="#6366f1"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                ID réservation <span className="text-muted">(laisser vide = dernière résa)</span>
              </label>
              <input
                type="text"
                value={smsEntrantForm.reservation_id}
                onChange={(e) => setSmsEntrantForm((f) => ({ ...f, reservation_id: e.target.value }))}
                placeholder="uuid optionnel"
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Message du voyageur</label>
              <textarea
                rows={2}
                value={smsEntrantForm.message}
                onChange={(e) => setSmsEntrantForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <button
              onClick={() => run(() => api.post('/api/simulation/sms-entrant', smsEntrantForm), setLoadingSmsEntrant, setSmsEntrantResult)}
              disabled={loadingSmsEntrant}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-indigo-500 hover:bg-indigo-600"
            >
              {loadingSmsEntrant ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Simuler le SMS
            </button>
          </div>
          <ResultBox result={smsEntrantResult} />
        </SimCard>

        {/* 3. Test SMS réel Twilio */}
        <SimCard
          icon={<Phone size={18} />}
          title="Tester Twilio (vrai SMS)"
          description="Envoie un vrai SMS via votre compte Twilio"
          accentColor="#10b981"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Numéro destinataire</label>
              <input
                type="text"
                value={testSmsForm.to}
                onChange={(e) => setTestSmsForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="+33600000000"
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Message</label>
              <textarea
                rows={2}
                value={testSmsForm.message}
                onChange={(e) => setTestSmsForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <button
              onClick={() => run(() => api.post('/api/simulation/test-sms', testSmsForm), setLoadingTestSms, setTestSmsResult)}
              disabled={loadingTestSms || !testSmsForm.to}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-emerald-500 hover:bg-emerald-600"
            >
              {loadingTestSms ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Envoyer le SMS
            </button>
          </div>
          <ResultBox result={testSmsResult} />
        </SimCard>

        {/* 4. Test Email réel SendGrid */}
        <SimCard
          icon={<Mail size={18} />}
          title="Tester SendGrid (vrai email)"
          description="Envoie un vrai email via votre compte SendGrid"
          accentColor="#3b82f6"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Email destinataire</label>
              <input
                type="email"
                value={testEmailForm.to}
                onChange={(e) => setTestEmailForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="test@example.com"
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Sujet</label>
              <input
                type="text"
                value={testEmailForm.subject}
                onChange={(e) => setTestEmailForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <button
              onClick={() => run(() => api.post('/api/simulation/test-email', testEmailForm), setLoadingTestEmail, setTestEmailResult)}
              disabled={loadingTestEmail || !testEmailForm.to}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-blue-500 hover:bg-blue-600"
            >
              {loadingTestEmail ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Envoyer l'email
            </button>
          </div>
          <ResultBox result={testEmailResult} />
        </SimCard>

        {/* 5. Test IA (Claude) */}
        <SimCard
          icon={<Bot size={18} />}
          title="Tester l'IA (Claude)"
          description="Génère une réponse IA à un message de voyageur"
          accentColor="#8b5cf6"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Message du voyageur</label>
              <textarea
                rows={3}
                value={testIaForm.message}
                onChange={(e) => setTestIaForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
              />
            </div>
            <button
              onClick={() => run(() => api.post('/api/simulation/test-ia', testIaForm), setLoadingTestIa, setTestIaResult)}
              disabled={loadingTestIa}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-violet-500 hover:bg-violet-600"
            >
              {loadingTestIa ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Bot size={14} />}
              Générer la réponse IA
            </button>
          </div>
          <ResultBox result={testIaResult} />
        </SimCard>

        {/* 6. Scheduler + Reset */}
        <div className="space-y-4">
          <SimCard
            icon={<Clock size={18} />}
            title="Déclencher le scheduler"
            description="Force l'envoi des messages programmés (normalement toutes les heures)"
            accentColor="#f59e0b"
          >
            <button
              onClick={() => run(() => api.post('/api/simulation/test-scheduler', {}), setLoadingScheduler, setSchedulerResult)}
              disabled={loadingScheduler}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-amber-500 hover:bg-amber-600"
            >
              {loadingScheduler ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Exécuter le scheduler
            </button>
            <ResultBox result={schedulerResult} />
          </SimCard>

          <SimCard
            icon={<Trash2 size={18} />}
            title="Réinitialiser les données"
            description="Supprime toutes les réservations simulées (SIM-*) et leurs messages"
            accentColor="#ef4444"
          >
            <button
              onClick={() => {
                if (window.confirm('Supprimer toutes les réservations simulées (SIM-*) ?')) {
                  run(() => api.delete('/api/simulation/reset'), setLoadingReset, setResetResult)
                }
              }}
              disabled={loadingReset}
              className="flex items-center gap-2 w-full justify-center text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 bg-red-500 hover:bg-red-600"
            >
              {loadingReset ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
              Réinitialiser
            </button>
            <ResultBox result={resetResult} />
          </SimCard>
        </div>

      </div>
    </div>
  )
}
