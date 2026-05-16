import React, { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, TrendingUp, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

// ─── Types ────────────────────────────────────────────────────────────────────
type TypeRegle = 'saisonnier' | 'occupation' | 'dernier_moment'

interface ReglePricing {
  id: string
  client_id: string
  logement_id: string | null
  nom: string
  type: TypeRegle
  date_debut: string | null
  date_fin: string | null
  taux_ajustement: number
  actif: boolean
  created_at: string
}

interface Logement {
  id: string
  name?: string
  nom?: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_META: Record<TypeRegle, { label: string; cls: string }> = {
  saisonnier:      { label: 'Saisonnier',      cls: 'bg-blue-100 text-blue-700' },
  occupation:      { label: 'Occupation',      cls: 'bg-green-100 text-green-700' },
  dernier_moment:  { label: 'Dernier moment',  cls: 'bg-orange-100 text-orange-700' },
}

const defaultForm = {
  logement_id:     '',
  nom:             '',
  type:            'saisonnier' as TypeRegle,
  date_debut:      '',
  date_fin:        '',
  taux_ajustement: 0,
  actif:           true,
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ regle, logements, onClose, onSave }: {
  regle: ReglePricing | null
  logements: Logement[]
  onClose: () => void
  onSave: (data: typeof defaultForm, id?: string) => Promise<void>
}) {
  const [form, setForm] = useState<typeof defaultForm>(
    regle ? {
      logement_id:     regle.logement_id ?? '',
      nom:             regle.nom,
      type:            regle.type,
      date_debut:      regle.date_debut ?? '',
      date_fin:        regle.date_fin ?? '',
      taux_ajustement: regle.taux_ajustement,
      actif:           regle.actif,
    } : defaultForm
  )
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<typeof defaultForm>) =>
    setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form, regle?.id)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 my-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-dark">
            {regle ? 'Modifier la règle' : 'Nouvelle règle de pricing'}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-dark"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Nom de la règle *</label>
            <input
              required
              value={form.nom}
              onChange={(e) => set({ nom: e.target.value })}
              placeholder="Ex: Été haute saison"
              className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">Type de règle *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as TypeRegle[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ type: t })}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    form.type === t
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border text-muted hover:border-primary/50 bg-bg'
                  }`}
                >
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Logement */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Logement (optionnel)</label>
            <select
              value={form.logement_id}
              onChange={(e) => set({ logement_id: e.target.value })}
              className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Tous les logements</option>
              {logements.map((l) => (
                <option key={l.id} value={l.id}>{l.nom ?? l.name ?? l.id}</option>
              ))}
            </select>
          </div>

          {/* Dates (saisonnier) */}
          {form.type === 'saisonnier' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Date début</label>
                <input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) => set({ date_debut: e.target.value })}
                  className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Date fin</label>
                <input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) => set({ date_fin: e.target.value })}
                  className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Taux d'ajustement */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">
              Taux d'ajustement (%) *{' '}
              <span className="text-xs font-normal text-muted">
                Positif = hausse, négatif = réduction
              </span>
            </label>
            <div className="relative">
              <input
                required
                type="number"
                step="0.5"
                min="-100"
                max="500"
                value={form.taux_ajustement}
                onChange={(e) => set({ taux_ajustement: parseFloat(e.target.value) || 0 })}
                className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
            </div>
            {form.taux_ajustement !== 0 && (
              <p className={`text-xs mt-1 font-medium ${form.taux_ajustement > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {form.taux_ajustement > 0 ? `+${form.taux_ajustement}%` : `${form.taux_ajustement}%`} sur le prix de base
              </p>
            )}
          </div>

          {/* Statut */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm font-medium text-dark">Règle active</p>
              <p className="text-xs text-muted">Appliquée automatiquement</p>
            </div>
            <button
              type="button"
              onClick={() => set({ actif: !form.actif })}
              className={`transition-colors ${form.actif ? 'text-primary' : 'text-gray-300'}`}
            >
              {form.actif ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
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
              {saving ? 'Enregistrement…' : regle ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PricingDynamique() {
  const [regles,    setRegles]    = useState<ReglePricing[]>([])
  const [logements, setLogements] = useState<Logement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<'create' | ReglePricing | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const load = () => {
    Promise.all([
      api.get<ReglePricing[]>('/api/pricing-dynamique'),
      api.get<Logement[]>('/api/logements'),
    ])
      .then(([r1, r2]) => {
        setRegles(Array.isArray(r1.data) ? r1.data : [])
        setLogements(Array.isArray(r2.data) ? r2.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSave = async (data: typeof defaultForm, id?: string) => {
    const payload = {
      ...data,
      logement_id:     data.logement_id || null,
      date_debut:      data.date_debut  || null,
      date_fin:        data.date_fin    || null,
    }
    if (id) await api.patch(`/api/pricing-dynamique/${id}`, payload).catch(() => {})
    else    await api.post('/api/pricing-dynamique', payload).catch(() => {})
    setModal(null)
    load()
  }

  const handleToggle = async (regle: ReglePricing) => {
    setToggling(regle.id)
    await api.patch(`/api/pricing-dynamique/${regle.id}`, { actif: !regle.actif }).catch(() => {})
    setToggling(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette règle de pricing ?')) return
    setDeleting(id)
    await api.delete(`/api/pricing-dynamique/${id}`).catch(() => {})
    setDeleting(null)
    load()
  }

  const logementName = (id: string | null) => {
    if (!id) return 'Tous les logements'
    const l = logements.find((x) => x.id === id)
    return l?.nom ?? l?.name ?? id
  }

  return (
    <FeatureGate feature="pricingDynamique">
    <div>
      {/* En-tête */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
          <TrendingUp size={18} className="text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-dark">Pricing dynamique</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">Bêta</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Définissez des règles de tarification. L'application automatique aux réservations est en cours de développement.
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="ml-auto flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus size={16} /> Nouvelle règle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : regles.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border flex flex-col items-center justify-center h-48 gap-3">
          <TrendingUp size={36} className="text-gray-300" />
          <p className="text-sm text-muted">Aucune règle de pricing configurée</p>
          <button onClick={() => setModal('create')} className="text-sm text-primary hover:underline">
            + Créer une première règle
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {regles.map((regle) => {
            const meta = TYPE_META[regle.type] ?? TYPE_META.saisonnier

            return (
              <div key={regle.id} className="bg-surface rounded-xl shadow-card p-5 flex flex-col gap-4">
                {/* Header carte */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-dark truncate">{regle.nom}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{logementName(regle.logement_id)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setModal(regle)}
                      className="w-7 h-7 rounded-lg bg-bg hover:bg-border flex items-center justify-center text-muted hover:text-dark transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(regle.id)}
                      disabled={deleting === regle.id}
                      className="w-7 h-7 rounded-lg bg-bg hover:bg-red-50 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    regle.taux_ajustement >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {regle.taux_ajustement >= 0 ? `+${regle.taux_ajustement}%` : `${regle.taux_ajustement}%`}
                  </span>
                </div>

                {/* Dates (si saisonnier) */}
                {regle.type === 'saisonnier' && regle.date_debut && regle.date_fin && (
                  <p className="text-xs text-muted">
                    Du {new Date(regle.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {' '}au {new Date(regle.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}

                {/* Toggle actif */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-dark">Règle active</p>
                    <p className="text-xs text-muted">{regle.actif ? 'Appliquée automatiquement' : 'Désactivée'}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(regle)}
                    disabled={toggling === regle.id}
                    className={`transition-colors ${regle.actif ? 'text-primary' : 'text-gray-300'} disabled:opacity-50`}
                  >
                    {toggling === regle.id
                      ? <Loader2 size={22} className="animate-spin text-primary" />
                      : regle.actif ? <ToggleRight size={30} /> : <ToggleLeft size={30} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal !== null && (
        <Modal
          regle={modal === 'create' ? null : modal}
          logements={logements}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
    </FeatureGate>
  )
}
