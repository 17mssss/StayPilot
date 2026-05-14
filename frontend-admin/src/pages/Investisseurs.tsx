import React, { useEffect, useState } from 'react'
import {
  TrendingUp, Plus, Trash2, Link2, Mail, X, Loader2,
  Check, Search, Building2, Crown, RefreshCw,
} from 'lucide-react'
import api from '../lib/api'
import { usePlan } from '../contexts/PlanContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Logement { id: string; nom?: string; name?: string }

interface Investisseur {
  id: string
  nom: string
  email?: string | null
  logement_ids: string[]
  access_token: string
  token_expires_at: string
  is_active: boolean
  created_at: string
}

const emptyForm = () => ({ nom: '', email: '', logement_ids: [] as string[] })

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-semibold text-dark">{title}</p>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Formulaire de création ────────────────────────────────────────────────────

function InvestisseurForm({
  logements,
  onSave,
  onCancel,
  saving,
  error,
}: {
  logements: Logement[]
  onSave: (data: ReturnType<typeof emptyForm>) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(emptyForm())

  const toggleLogement = (id: string) =>
    setForm((f) => ({
      ...f,
      logement_ids: f.logement_ids.includes(id)
        ? f.logement_ids.filter((x) => x !== id)
        : [...f.logement_ids, id],
    }))

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-dark mb-1">Nom investisseur *</label>
        <input
          value={form.nom}
          onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          placeholder="ex. Jean Dupont Capital"
          className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="investisseur@email.com"
          className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark mb-1">
          Logements visibles * ({form.logement_ids.length} sélectionné{form.logement_ids.length > 1 ? 's' : ''})
        </label>
        <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
          {logements.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">Aucun logement disponible</p>
          ) : (
            logements.map((l) => {
              const nom     = l.nom ?? l.name ?? l.id
              const checked = form.logement_ids.includes(l.id)
              return (
                <label
                  key={l.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-border-light transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLogement(l.id)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-dark truncate">{nom}</span>
                </label>
              )
            })
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nom || form.logement_ids.length === 0}
          className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Créer le portail
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-muted hover:text-dark border border-border rounded-lg transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Investisseurs() {
  const { planId } = usePlan()
  const isEnterprise = planId === 'business'

  const [investisseurs, setInvestisseurs] = useState<Investisseur[]>([])
  const [logements, setLogements]         = useState<Logement[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [showModal, setShowModal]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [formError, setFormError]         = useState<string | null>(null)
  const [copiedId, setCopiedId]           = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [renewingId, setRenewingId]       = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/investisseurs'),
      api.get('/api/logements'),
    ]).then(([inv, log]) => {
      setInvestisseurs(inv.data ?? [])
      setLogements(log.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const portailUrl = (token: string) =>
    `${window.location.origin}/portail/${token}`

  const handleCopy = async (inv: Investisseur) => {
    await navigator.clipboard.writeText(portailUrl(inv.access_token))
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSendEmail = async (inv: Investisseur) => {
    if (!inv.email) {
      alert('Cet investisseur n\'a pas d\'email renseigné.')
      return
    }
    try {
      await api.post(`/api/investisseurs/${inv.id}/send-report`)
      alert(`Rapport envoyé à ${inv.email} ✓`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur lors de l\'envoi'
      alert(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce portail ? L\'investisseur n\'aura plus accès au lien.')) return
    setDeletingId(id)
    try {
      await api.delete(`/api/investisseurs/${id}`)
      setInvestisseurs((prev) => prev.filter((i) => i.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleRenewToken = async (id: string) => {
    if (!confirm('Renouveler le token ? L\'ancien lien sera immédiatement invalide.')) return
    setRenewingId(id)
    try {
      const res = await api.post(`/api/investisseurs/${id}/token`)
      setInvestisseurs((prev) =>
        prev.map((i) => i.id === id ? { ...i, access_token: res.data.access_token, token_expires_at: res.data.token_expires_at } : i)
      )
    } finally {
      setRenewingId(null)
    }
  }

  const handleCreate = async (form: ReturnType<typeof emptyForm>) => {
    setFormError(null)
    setSaving(true)
    try {
      const res = await api.post('/api/investisseurs', form)
      setInvestisseurs((prev) => [res.data, ...prev])
      setShowModal(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setFormError(msg ?? 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const filtered = investisseurs.filter((i) =>
    i.nom.toLowerCase().includes(search.toLowerCase()) ||
    (i.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const logementName = (id: string) => {
    const l = logements.find((x) => x.id === id)
    return l?.nom ?? l?.name ?? id.slice(0, 8)
  }

  const formatExpiry = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <TrendingUp size={18} className="text-primary flex-shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-dark leading-tight">Portail Investisseur</h2>
            <p className="text-xs text-muted mt-0.5">Partagez les performances de vos biens avec vos clients VIP</p>
          </div>
          {!isEnterprise && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
              <Crown size={10} />
              Enterprise
            </span>
          )}
        </div>
        <button
          onClick={() => { setFormError(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-white rounded-lg px-3.5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Créer un portail
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un investisseur…"
          className="w-full border border-border bg-surface rounded-lg pl-9 pr-3 py-2.5 text-sm text-dark focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 space-y-2">
          <TrendingUp size={32} className="mx-auto text-muted/40" />
          <p className="text-sm font-medium text-dark">Aucun portail investisseur</p>
          <p className="text-xs text-muted">Créez un portail pour partager les performances de vos biens avec un investisseur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="bg-surface border border-border rounded-xl p-4 space-y-3"
            >
              {/* Ligne principale */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-dark truncate">{inv.nom}</p>
                    {inv.is_active ? (
                      <span className="text-[10px] font-medium bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Actif</span>
                    ) : (
                      <span className="text-[10px] font-medium bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Inactif</span>
                    )}
                  </div>
                  {inv.email && (
                    <p className="text-xs text-muted mt-0.5 truncate">{inv.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleRenewToken(inv.id)}
                    disabled={renewingId === inv.id}
                    title="Renouveler le token"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-dark hover:bg-bg transition-colors disabled:opacity-50"
                  >
                    {renewingId === inv.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <RefreshCw size={13} />
                    }
                  </button>
                  <button
                    onClick={() => handleSendEmail(inv)}
                    title="Envoyer par email"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-dark hover:bg-bg transition-colors"
                  >
                    <Mail size={13} />
                  </button>
                  <button
                    onClick={() => handleCopy(inv)}
                    title="Copier le lien"
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      copiedId === inv.id
                        ? 'text-green-500 bg-green-50'
                        : 'text-muted hover:text-dark hover:bg-bg'
                    }`}
                  >
                    {copiedId === inv.id ? <Check size={13} /> : <Link2 size={13} />}
                  </button>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    disabled={deletingId === inv.id}
                    title="Supprimer"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === inv.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>

              {/* Logements + lien */}
              <div className="space-y-2">
                {inv.logement_ids?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Building2 size={11} className="text-muted flex-shrink-0" />
                    {inv.logement_ids.map((id) => (
                      <span key={id} className="text-[10px] font-medium bg-border-light text-dark px-1.5 py-0.5 rounded-full">
                        {logementName(id)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted font-mono truncate flex-1 bg-bg rounded px-2 py-1 border border-border">
                    {portailUrl(inv.access_token)}
                  </p>
                </div>
                <p className="text-[10px] text-muted">
                  Expire le {formatExpiry(inv.token_expires_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <Modal title="Nouveau portail investisseur" onClose={() => setShowModal(false)}>
          <InvestisseurForm
            logements={logements}
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}
    </div>
  )
}
