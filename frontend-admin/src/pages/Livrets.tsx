import React, { useEffect, useRef, useState } from 'react'
import {
  Plus, X, Pencil, Trash2, BookOpen, Wifi, Key, Link2, QrCode,
  Copy, Check, Home, Mail, Send,
} from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Logement { id: string; nom?: string; name?: string }

interface Voyageur {
  id: string
  prenom?: string | null
  nom?: string | null
  email?: string | null
  telephone?: string | null
}

interface Livret {
  id: string
  logement_id?: string | null
  property_name?: string | null
  titre: string
  slug: string
  wifi_nom?: string | null
  wifi_mdp?: string | null
  code_acces?: string | null
  reglement?: string | null
  checkin_info?: string | null
  checkout_info?: string | null
  recommandations?: string | null
  contact_urgence?: string | null
  created_at: string
}

const EMPTY_FORM = {
  logement_id: '',
  titre: '',
  wifi_nom: '',
  wifi_mdp: '',
  code_acces: '',
  reglement: '',
  checkin_info: '',
  checkout_info: '',
  recommandations: '',
  contact_urgence: '',
}

// ─── Modal QR Code ────────────────────────────────────────────────────────────

function QRModal({ url, titre, onClose }: { url: string; titre: string; onClose: () => void }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-dark truncate">{titre}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 px-5 py-6">
          <img
            src={qrSrc}
            alt={`QR Code — ${titre}`}
            width={200}
            height={200}
            className="rounded-lg border border-border"
          />
          <p className="text-xs text-muted text-center break-all">{url}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Envoi Email ────────────────────────────────────────────────────────

function EmailModal({ livret, url, onClose }: { livret: Livret; url: string; onClose: () => void }) {
  const [email, setEmail]           = useState('')
  const [sent, setSent]             = useState(false)
  const [sending, setSending]       = useState(false)
  const [sendError, setSendError]   = useState<string | null>(null)
  const [voyageurs, setVoyageurs]   = useState<Voyageur[]>([])
  const [loadingV, setLoadingV]     = useState(true)
  const [voyageurId, setVoyageurId] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  // Charger les voyageurs depuis le CRM
  useEffect(() => {
    api.get<Voyageur[]>('/api/crm-voyageurs')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data.filter(v => v.email) : []
        setVoyageurs(list)
      })
      .catch(() => {})
      .finally(() => setLoadingV(false))
  }, [])

  const handleVoyageurChange = (id: string) => {
    setVoyageurId(id)
    const v = voyageurs.find(v => v.id === id)
    if (v?.email) {
      setEmail(v.email)
      // Focus sur le champ email pour que l'utilisateur puisse le modifier si besoin
      setTimeout(() => emailRef.current?.focus(), 50)
    }
  }

  const handleSend = async () => {
    if (!email.trim()) return
    setSending(true)
    setSendError(null)
    try {
      const guestName = voyageurs.find(v => v.id === voyageurId)?.prenom ?? undefined
      await api.post(`/api/livrets/${livret.id}/send-email`, { to: email, guestName })
      setSent(true)
      setTimeout(() => { setSent(false); onClose() }, 1800)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur lors de l\'envoi'
      setSendError(msg)
    } finally {
      setSending(false)
    }
  }

  const voyageurSelectionne = voyageurs.find(v => v.id === voyageurId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-dark">Envoyer par email</h2>
          <button onClick={onClose} className="text-muted hover:text-dark ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Aperçu livret */}
          <div className="bg-bg rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
              <BookOpen size={14} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark truncate">{livret.titre}</p>
              <p className="text-xs text-muted font-mono truncate">/livret/{livret.slug}</p>
            </div>
          </div>

          {/* Sélecteur de voyageur */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Voyageur
            </label>
            {loadingV ? (
              <div className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-muted bg-bg flex items-center gap-2">
                <span className="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin inline-block flex-shrink-0" />
                Chargement…
              </div>
            ) : voyageurs.length === 0 ? (
              <div className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-muted bg-bg">
                Aucun voyageur avec email dans le CRM
              </div>
            ) : (
              <select
                value={voyageurId}
                onChange={e => handleVoyageurChange(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg"
              >
                <option value="">— Sélectionner un voyageur —</option>
                {voyageurs.map(v => {
                  const name = [v.prenom, v.nom].filter(Boolean).join(' ') || 'Voyageur'
                  return (
                    <option key={v.id} value={v.id}>
                      {name} — {v.email}
                    </option>
                  )
                })}
              </select>
            )}
          </div>

          {/* Champ email — pré-rempli ou manuel */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Email
              {voyageurSelectionne && (
                <span className="ml-2 text-xs font-normal text-primary">pré-rempli · modifiable</span>
              )}
            </label>
            <input
              ref={emailRef}
              type="email"
              autoFocus={voyageurs.length === 0}
              value={email}
              onChange={e => { setEmail(e.target.value); setVoyageurId('') }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="locataire@example.com"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg transition-colors"
            />
          </div>

          {sendError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sendError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2.5 text-sm text-muted hover:text-dark transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={!email.trim() || sent || sending}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${
                sent
                  ? 'bg-green-500 text-white'
                  : 'bg-primary hover:bg-primary-dark text-white'
              }`}
            >
              {sent ? (
                <><Check size={14} /> Envoyé !</>
              ) : sending ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi…</>
              ) : (
                <><Send size={14} /> Envoyer par email</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Formulaire ─────────────────────────────────────────────────────────

function LivretModal({
  livret,
  logements,
  onClose,
  onSave,
  error,
}: {
  livret: Livret | null
  logements: Logement[]
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM, id?: string) => Promise<void>
  error?: string | null
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    livret ? {
      logement_id:    livret.logement_id ?? '',
      titre:          livret.titre,
      wifi_nom:       livret.wifi_nom ?? '',
      wifi_mdp:       livret.wifi_mdp ?? '',
      code_acces:     livret.code_acces ?? '',
      reglement:      livret.reglement ?? '',
      checkin_info:   livret.checkin_info ?? '',
      checkout_info:  livret.checkout_info ?? '',
      recommandations: livret.recommandations ?? '',
      contact_urgence: livret.contact_urgence ?? '',
    } : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titre.trim()) return
    setSaving(true)
    await onSave(form, livret?.id)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-dark">
            {livret ? 'Modifier le livret' : 'Créer un livret d\'accueil'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-dark"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Titre du livret *</label>
              <input
                required
                autoFocus
                value={form.titre}
                onChange={(e) => set({ titre: e.target.value })}
                placeholder="Bienvenue chez nous !"
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
              />
            </div>

            {/* Logement */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Logement</label>
              <select
                value={form.logement_id}
                onChange={(e) => set({ logement_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
              >
                <option value="">Aucun logement associé</option>
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>{l.nom ?? l.name}</option>
                ))}
              </select>
            </div>

            {/* WiFi */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-bg/50">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                <Wifi size={12} className="text-primary" /> WiFi
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Nom du réseau</label>
                  <input
                    value={form.wifi_nom}
                    onChange={(e) => set({ wifi_nom: e.target.value })}
                    placeholder="MonWiFi"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Mot de passe</label>
                  <input
                    value={form.wifi_mdp}
                    onChange={(e) => set({ wifi_mdp: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg"
                  />
                </div>
              </div>
            </div>

            {/* Code d'accès */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1 flex items-center gap-1.5">
                <Key size={13} className="text-muted" /> Code d'accès
              </label>
              <input
                value={form.code_acces}
                onChange={(e) => set({ code_acces: e.target.value })}
                placeholder="Ex: 1234 ou A7#9"
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
              />
            </div>

            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Infos Check-in</label>
                <textarea
                  value={form.checkin_info}
                  onChange={(e) => set({ checkin_info: e.target.value })}
                  rows={3}
                  placeholder="Horaires, instructions d'arrivée…"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Infos Check-out</label>
                <textarea
                  value={form.checkout_info}
                  onChange={(e) => set({ checkout_info: e.target.value })}
                  rows={3}
                  placeholder="Horaires, instructions de départ…"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg resize-none"
                />
              </div>
            </div>

            {/* Règlement */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Règlement intérieur</label>
              <textarea
                value={form.reglement}
                onChange={(e) => set({ reglement: e.target.value })}
                rows={3}
                placeholder="Pas de fêtes, animaux interdits…"
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg resize-none"
              />
            </div>

            {/* Recommandations */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Recommandations</label>
              <textarea
                value={form.recommandations}
                onChange={(e) => set({ recommandations: e.target.value })}
                rows={3}
                placeholder="Restaurants, activités, transports…"
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg resize-none"
              />
            </div>

            {/* Contact urgence */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Contact d'urgence</label>
              <input
                value={form.contact_urgence}
                onChange={(e) => set({ contact_urgence: e.target.value })}
                placeholder="Téléphone ou email"
                className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
              />
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
              ⚠ {error}
            </div>
          )}
          <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2.5 text-sm text-muted hover:text-dark transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !form.titre.trim()}
              className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement…' : livret ? 'Enregistrer' : 'Créer le livret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Livrets() {
  const [livrets, setLivrets]   = useState<Livret[]>([])
  const [logements, setLogements] = useState<Logement[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'create' | Livret | null>(null)
  const [qrModal, setQrModal]   = useState<Livret | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<Livret | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get<Livret[]>('/api/livrets')
      .then((r) => setLivrets(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLivrets([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<Logement[]>('/api/logements')
      .then((r) => setLogements(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  const getLivretUrl = (slug: string) =>
    `${window.location.origin}/livret/${slug}`

  const handleCopy = async (livret: Livret) => {
    const url = getLivretUrl(livret.slug)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(livret.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      /* swallow */
    }
  }

  const handleSave = async (data: typeof EMPTY_FORM, id?: string) => {
    setSaveError(null)
    const payload = {
      ...data,
      logement_id:    data.logement_id || null,
      wifi_nom:       data.wifi_nom || null,
      wifi_mdp:       data.wifi_mdp || null,
      code_acces:     data.code_acces || null,
      reglement:      data.reglement || null,
      checkin_info:   data.checkin_info || null,
      checkout_info:  data.checkout_info || null,
      recommandations: data.recommandations || null,
      contact_urgence: data.contact_urgence || null,
    }
    try {
      if (id) await api.patch(`/api/livrets/${id}`, payload)
      else    await api.post('/api/livrets', payload)
      setModal(null)
      load()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur lors de la sauvegarde'
      setSaveError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce livret d\'accueil ?')) return
    try {
      await api.delete(`/api/livrets/${id}`)
      setLivrets((prev) => prev.filter((l) => l.id !== id))
    } catch { /* swallow */ }
  }

  return (
    <FeatureGate feature="livretQR">
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted">
          {livrets.length} livret{livrets.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Créer un livret
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : livrets.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <BookOpen size={36} className="text-gray-300" />
          <p className="text-sm text-muted">Aucun livret d'accueil — cliquez sur "Créer un livret"</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {livrets.map((livret) => {
            const url = getLivretUrl(livret.slug)
            const isCopied = copied === livret.id

            return (
              <div key={livret.id} className="bg-surface rounded-xl shadow-card p-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark text-sm">{livret.titre}</p>
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Home size={10} />
                        {livret.property_name ?? 'Aucun logement'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setModal(livret)}
                      className="p-1.5 text-muted hover:text-primary transition-colors rounded"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(livret.id)}
                      className="p-1.5 text-muted hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Infos rapides */}
                <div className="space-y-1">
                  {livret.wifi_nom && (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Wifi size={11} className="text-primary flex-shrink-0" />
                      <span className="font-medium text-dark">{livret.wifi_nom}</span>
                      {livret.wifi_mdp && <span className="font-mono">— {livret.wifi_mdp}</span>}
                    </div>
                  )}
                  {livret.code_acces && (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Key size={11} className="text-primary flex-shrink-0" />
                      <span>Code : <span className="font-mono text-dark">{livret.code_acces}</span></span>
                    </div>
                  )}
                </div>

                {/* Lien public */}
                <div className="bg-bg rounded-lg px-3 py-2 flex items-center gap-2">
                  <Link2 size={11} className="text-muted flex-shrink-0" />
                  <p className="text-xs text-muted truncate flex-1 font-mono">/livret/{livret.slug}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1 border-t border-border">
                  <button
                    onClick={() => handleCopy(livret)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs rounded-lg py-1.5 font-medium border transition-colors ${
                      isCopied
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-border text-muted hover:text-dark hover:border-primary'
                    }`}
                  >
                    {isCopied ? <Check size={10} /> : <Copy size={10} />}
                    {isCopied ? 'Copié !' : 'Lien'}
                  </button>
                  <button
                    onClick={() => setEmailModal(livret)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs rounded-lg py-1.5 font-medium border border-border text-muted hover:text-primary hover:border-primary transition-colors"
                  >
                    <Mail size={10} />
                    Email
                  </button>
                  <button
                    onClick={() => setQrModal(livret)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs rounded-lg py-1.5 font-medium border border-primary text-primary hover:bg-primary-light transition-colors"
                  >
                    <QrCode size={10} />
                    QR Code
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal formulaire */}
      {modal !== null && (
        <LivretModal
          livret={modal === 'create' ? null : modal}
          logements={logements}
          onClose={() => { setModal(null); setSaveError(null) }}
          onSave={handleSave}
          error={saveError}
        />
      )}

      {/* Modal QR Code */}
      {qrModal && (
        <QRModal
          url={getLivretUrl(qrModal.slug)}
          titre={qrModal.titre}
          onClose={() => setQrModal(null)}
        />
      )}

      {/* Modal Email */}
      {emailModal && (
        <EmailModal
          livret={emailModal}
          url={getLivretUrl(emailModal.slug)}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
    </FeatureGate>
  )
}
