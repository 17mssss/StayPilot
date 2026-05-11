import React, { useEffect, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Home, Wifi, Mail, MessageCircle,
  ToggleLeft, ToggleRight, Zap, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import api from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type Provider = 'smoobu' | 'hostaway' | 'lodgify' | 'superhote' | ''

interface Logement {
  id: string
  name: string
  autopilote?: boolean
  autopilot?: boolean
  canaux?: string[]
  api_key?: string
  property_key?: string
  channel_manager?: Provider
  cm_api_key?: string
  cm_account_id?: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CANAUX_OPTIONS = ['SMS', 'Email', 'WhatsApp']
const CANAL_COLORS: Record<string, { cls: string; icon: React.ReactNode }> = {
  SMS:      { cls: 'bg-blue-100 text-blue-700',   icon: <MessageCircle size={10} /> },
  Email:    { cls: 'bg-purple-100 text-purple-700', icon: <Mail size={10} /> },
  WhatsApp: { cls: 'bg-green-100 text-green-700',  icon: <Wifi size={10} /> },
}

const PROVIDERS: { value: Provider; label: string; color: string; dot: string }[] = [
  { value: '',         label: 'Aucun',    color: 'bg-bg text-muted',             dot: 'bg-muted' },
  { value: 'smoobu',   label: 'Smoobu',   color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  { value: 'hostaway', label: 'Hostaway', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { value: 'lodgify',  label: 'Lodgify',  color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-500' },
  { value: 'superhote', label: 'Superhote (legacy)', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
]

const providerMeta = (p?: Provider | null) =>
  PROVIDERS.find((x) => x.value === (p ?? '')) ?? PROVIDERS[0]

const defaultForm = {
  name: '',
  autopilot: false,
  canaux: [] as string[],
  channel_manager: '' as Provider,
  cm_api_key: '',
  cm_account_id: '',
  // Superhote legacy
  api_key: '',
  property_key: '',
}

// ─── Modal formulaire ─────────────────────────────────────────────────────────
function Modal({ logement, onClose, onSave }: {
  logement: Logement | null
  onClose: () => void
  onSave: (data: typeof defaultForm, id?: string) => Promise<void>
}) {
  const [form, setForm] = useState<typeof defaultForm>(
    logement ? {
      name:            logement.name,
      autopilot:       logement.autopilote ?? logement.autopilot ?? false,
      canaux:          logement.canaux ?? [],
      channel_manager: (logement.channel_manager ?? '') as Provider,
      cm_api_key:      logement.cm_api_key ?? '',
      cm_account_id:   logement.cm_account_id ?? '',
      api_key:         logement.api_key ?? '',
      property_key:    logement.property_key ?? '',
    } : defaultForm
  )
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const set = (patch: Partial<typeof defaultForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setTestResult(null)
  }

  const toggleCanal = (c: string) =>
    set({ canaux: form.canaux.includes(c) ? form.canaux.filter((x) => x !== c) : [...form.canaux, c] })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form, logement?.id)
    setSaving(false)
  }

  const handleTest = async () => {
    if (!form.channel_manager || form.channel_manager === 'superhote') return
    if (!form.cm_api_key) { setTestResult({ ok: false, msg: 'Clé API requise' }); return }
    if (form.channel_manager === 'hostaway' && !form.cm_account_id) {
      setTestResult({ ok: false, msg: 'Account ID requis pour Hostaway' }); return
    }
    setTesting(true)
    setTestResult(null)
    try {
      await api.post('/api/sync/test-connection', {
        provider:   form.channel_manager,
        api_key:    form.cm_api_key,
        account_id: form.cm_account_id || undefined,
      })
      setTestResult({ ok: true, msg: 'Connexion réussie ✓' })
    } catch {
      setTestResult({ ok: false, msg: 'Connexion échouée — vérifiez vos identifiants' })
    } finally {
      setTesting(false)
    }
  }

  const showCm      = form.channel_manager && form.channel_manager !== 'superhote'
  const showLegacy  = form.channel_manager === 'superhote'
  const needAccount = form.channel_manager === 'hostaway'

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-dark">
            {logement ? 'Modifier le logement' : 'Nouveau logement'}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-dark"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Nom du logement *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Ex: Studio Marais"
              className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* ── Section Channel Manager ──────────────────────────────────── */}
          <div className="border border-border rounded-xl p-4 space-y-3 bg-bg/50">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Zap size={12} className="text-primary" /> Channel Manager
            </p>

            {/* Sélecteur provider */}
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set({ channel_manager: p.value as Provider })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.channel_manager === p.value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border text-muted hover:border-primary/50 bg-bg'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${p.dot} flex-shrink-0`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Champs Smoobu / Hostaway / Lodgify */}
            {showCm && (
              <>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Clé API</label>
                  <input
                    value={form.cm_api_key}
                    onChange={(e) => set({ cm_api_key: e.target.value })}
                    placeholder="Coller la clé API..."
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm font-mono focus:outline-none focus:border-primary bg-bg text-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">
                    {needAccount ? 'Account ID *' : 'Property ID (optionnel)'}
                  </label>
                  <input
                    value={form.cm_account_id}
                    onChange={(e) => set({ cm_account_id: e.target.value })}
                    placeholder={needAccount ? 'Ex: 123456' : 'Laisser vide = tous les logements'}
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm font-mono focus:outline-none focus:border-primary bg-bg text-dark"
                  />
                </div>

                {/* Bouton tester + résultat */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !form.cm_api_key}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
                  >
                    {testing
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Zap size={12} />}
                    Tester la connexion
                  </button>
                  {testResult && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {testResult.ok
                        ? <CheckCircle2 size={13} />
                        : <AlertCircle size={13} />}
                      {testResult.msg}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Champs Superhote (legacy) */}
            {showLegacy && (
              <>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Clé API Superhote</label>
                  <input
                    value={form.api_key}
                    onChange={(e) => set({ api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm font-mono focus:outline-none focus:border-primary bg-bg text-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Property Key</label>
                  <input
                    value={form.property_key}
                    onChange={(e) => set({ property_key: e.target.value })}
                    placeholder="ID propriété"
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm font-mono focus:outline-none focus:border-primary bg-bg text-dark"
                  />
                </div>
              </>
            )}
          </div>

          {/* Canaux de communication */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">Canaux de communication</label>
            <div className="flex gap-2">
              {CANAUX_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCanal(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.canaux.includes(c)
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Autopilote */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm font-medium text-dark">Autopilote</p>
              <p className="text-xs text-muted">Messages automatiques 24/7</p>
            </div>
            <button
              type="button"
              onClick={() => set({ autopilot: !form.autopilot })}
              className={`transition-colors ${form.autopilot ? 'text-primary' : 'text-gray-300'}`}
            >
              {form.autopilot ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-dark hover:bg-bg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : logement ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Logements() {
  const [logements, setLogements] = useState<Logement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<'create' | Logement | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)

  const load = () => {
    api.get<Logement[]>('/api/logements')
      .then((r) => setLogements(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLogements([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSave = async (data: typeof defaultForm, id?: string) => {
    if (id) await api.put(`/api/logements/${id}`, data).catch(() => {})
    else    await api.post('/api/logements', data).catch(() => {})
    setModal(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce logement ?')) return
    setDeleting(id)
    await api.delete(`/api/logements/${id}`).catch(() => {})
    setDeleting(null)
    load()
  }

  const handleToggleAutopilot = async (logement: Logement) => {
    setToggling(logement.id)
    const current = logement.autopilote ?? logement.autopilot ?? false
    await api.put(`/api/logements/${logement.id}`, { autopilot: !current }).catch(() => {})
    setToggling(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted">
          {logements.length} logement{logements.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nouveau logement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logements.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Home size={36} className="text-gray-300" />
          <p className="text-sm text-muted">Aucun logement configuré</p>
          <button onClick={() => setModal('create')} className="text-sm text-primary hover:underline">
            + Ajouter un logement
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {logements.map((l) => {
            const autopilot = l.autopilote ?? l.autopilot ?? false
            const meta      = providerMeta(l.channel_manager)

            return (
              <div key={l.id} className="bg-surface rounded-xl shadow-card p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                      <Home size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">{l.name}</p>
                      {l.property_key && (
                        <p className="text-xs text-muted font-mono mt-0.5">{l.property_key}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setModal(l)}
                      className="w-7 h-7 rounded-lg bg-bg hover:bg-border flex items-center justify-center text-muted hover:text-dark transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting === l.id}
                      className="w-7 h-7 rounded-lg bg-bg hover:bg-red-50 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Badge channel manager */}
                {l.channel_manager ? (
                  <div className="flex items-center gap-1.5">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {l.cm_account_id && (
                      <span className="text-xs text-muted font-mono">#{l.cm_account_id}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted">Aucun channel manager</span>
                )}

                {/* Canaux */}
                <div className="flex flex-wrap gap-1.5">
                  {(l.canaux ?? []).map((c) => (
                    <span
                      key={c}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CANAL_COLORS[c]?.cls ?? 'bg-bg text-muted'}`}
                    >
                      {CANAL_COLORS[c]?.icon}
                      {c}
                    </span>
                  ))}
                  {(l.canaux ?? []).length === 0 && (
                    <span className="text-xs text-muted">Aucun canal configuré</span>
                  )}
                </div>

                {/* Autopilote toggle */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-dark">Autopilote</p>
                    <p className="text-xs text-muted">{autopilot ? 'Actif — IA répond 24/7' : 'Désactivé'}</p>
                  </div>
                  <button
                    onClick={() => handleToggleAutopilot(l)}
                    disabled={toggling === l.id}
                    className={`transition-colors ${autopilot ? 'text-primary' : 'text-gray-300'} disabled:opacity-50`}
                  >
                    {toggling === l.id
                      ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : autopilot ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal !== null && (
        <Modal
          logement={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
