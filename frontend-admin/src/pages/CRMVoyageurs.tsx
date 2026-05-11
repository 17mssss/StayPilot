import React, { useEffect, useState, useRef } from 'react'
import {
  Search, X, Plus, Tag, Users2, Loader2, ChevronRight, Phone, Mail,
  Globe, Calendar, TrendingUp, Edit3, Check,
} from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Voyageur {
  id: string
  client_id: string
  nom: string
  email: string | null
  telephone: string | null
  nationalite: string | null
  nb_sejours: number
  montant_total: number
  tags: string[]
  notes: string | null
  premiere_reservation: string | null
  derniere_reservation: string | null
  created_at: string
}

interface Reservation {
  id: string
  checkin: string
  checkout: string
  montant_total: number
  statut: string
  logement_id: string
}

interface VoyageurDetail extends Voyageur {
  historique: Reservation[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TAGS_PREDEFINIS = ['VIP', 'Fidèle', 'Attention', 'Famille', 'Business']

const TAG_COLORS: Record<string, string> = {
  'VIP':       'bg-yellow-100 text-yellow-700',
  'Fidèle':    'bg-green-100 text-green-700',
  'Attention': 'bg-red-100 text-red-600',
  'Famille':   'bg-purple-100 text-purple-700',
  'Business':  'bg-blue-100 text-blue-700',
}

const tagColor = (tag: string) =>
  TAG_COLORS[tag] ?? 'bg-border text-muted'

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEur(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function initiales(nom: string) {
  return nom.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

// ─── Panneau latéral détail voyageur ─────────────────────────────────────────
function VoyageurPanel({ voyageur, onClose, onUpdate }: {
  voyageur: Voyageur
  onClose: () => void
  onUpdate: () => void
}) {
  const [detail,       setDetail]       = useState<VoyageurDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [notes,        setNotes]        = useState(voyageur.notes ?? '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes,  setSavingNotes]  = useState(false)
  const [newTag,       setNewTag]       = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [tags,         setTags]         = useState<string[]>(voyageur.tags ?? [])
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<VoyageurDetail>(`/api/crm-voyageurs/${voyageur.id}`)
      .then((r) => {
        setDetail(r.data)
        setNotes(r.data.notes ?? '')
        setTags(r.data.tags ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false))
  }, [voyageur.id])

  useEffect(() => {
    if (showTagInput) tagInputRef.current?.focus()
  }, [showTagInput])

  const saveNotes = async () => {
    setSavingNotes(true)
    await api.patch(`/api/crm-voyageurs/${voyageur.id}`, { notes }).catch(() => {})
    setSavingNotes(false)
    setEditingNotes(false)
    onUpdate()
  }

  const addTag = async (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) { setNewTag(''); setShowTagInput(false); return }
    const newTags = [...tags, trimmed]
    setTags(newTags)
    setNewTag('')
    setShowTagInput(false)
    await api.patch(`/api/crm-voyageurs/${voyageur.id}`, { tags: newTags }).catch(() => {})
    onUpdate()
  }

  const removeTag = async (tag: string) => {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    await api.patch(`/api/crm-voyageurs/${voyageur.id}`, { tags: newTags }).catch(() => {})
    onUpdate()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-surface border-l border-border h-full flex flex-col overflow-hidden shadow-2xl">
        {/* Header panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {initiales(voyageur.nom)}
            </div>
            <div>
              <p className="font-semibold text-dark">{voyageur.nom}</p>
              <p className="text-xs text-muted">{voyageur.email ?? 'Pas d\'email'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-dark"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg border border-border rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Séjours</p>
              <p className="text-xl font-bold text-dark">{voyageur.nb_sejours}</p>
            </div>
            <div className="bg-bg border border-border rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Total dépensé</p>
              <p className="text-xl font-bold text-primary">{fmtEur(voyageur.montant_total)}</p>
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-2">
            {voyageur.telephone && (
              <div className="flex items-center gap-2 text-sm text-dark">
                <Phone size={14} className="text-muted flex-shrink-0" />
                {voyageur.telephone}
              </div>
            )}
            {voyageur.email && (
              <div className="flex items-center gap-2 text-sm text-dark">
                <Mail size={14} className="text-muted flex-shrink-0" />
                {voyageur.email}
              </div>
            )}
            {voyageur.nationalite && (
              <div className="flex items-center gap-2 text-sm text-dark">
                <Globe size={14} className="text-muted flex-shrink-0" />
                {voyageur.nationalite}
              </div>
            )}
            {voyageur.premiere_reservation && (
              <div className="flex items-center gap-2 text-sm text-dark">
                <Calendar size={14} className="text-muted flex-shrink-0" />
                Premier séjour : {fmtDate(voyageur.premiere_reservation)}
              </div>
            )}
            {voyageur.derniere_reservation && (
              <div className="flex items-center gap-2 text-sm text-dark">
                <TrendingUp size={14} className="text-muted flex-shrink-0" />
                Dernier séjour : {fmtDate(voyageur.derniere_reservation)}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-dark">Tags</p>
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus size={12} /> Ajouter tag
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tagColor(tag)}`}
                >
                  <Tag size={10} />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:opacity-60 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {showTagInput && (
                <div className="flex items-center gap-1">
                  <input
                    ref={tagInputRef}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag(newTag) }
                      if (e.key === 'Escape') { setShowTagInput(false); setNewTag('') }
                    }}
                    placeholder="Nouveau tag…"
                    className="border border-border rounded-lg px-2 py-1 text-xs bg-bg text-dark focus:outline-none focus:border-primary w-28"
                  />
                  <button
                    onClick={() => addTag(newTag)}
                    className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={() => { setShowTagInput(false); setNewTag('') }}
                    className="w-6 h-6 rounded-lg bg-bg border border-border text-muted flex items-center justify-center"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* Tags prédéfinis */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TAGS_PREDEFINIS.filter((t) => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="text-xs text-muted border border-dashed border-border px-2 py-0.5 rounded-full hover:border-primary hover:text-primary transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-dark">Notes</p>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Edit3 size={12} /> Modifier
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Notes sur ce voyageur…"
                  className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingNotes(false); setNotes(detail?.notes ?? '') }}
                    className="flex-1 border border-border rounded-lg py-2 text-xs font-medium text-dark hover:bg-bg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="flex-1 bg-primary text-white rounded-lg py-2 text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {savingNotes ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted bg-bg border border-border rounded-lg px-3 py-2.5 min-h-12">
                {notes || 'Aucune note'}
              </p>
            )}
          </div>

          {/* Historique réservations */}
          <div>
            <p className="text-sm font-semibold text-dark mb-2">
              Historique des séjours
              {detail && <span className="text-xs font-normal text-muted ml-1">({detail.historique.length})</span>}
            </p>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ) : !detail?.historique.length ? (
              <p className="text-xs text-muted text-center py-4">Aucun séjour enregistré</p>
            ) : (
              <div className="space-y-2">
                {detail.historique.map((res) => (
                  <div key={res.id} className="bg-bg border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-dark">
                        {fmtDate(res.checkin)} → {fmtDate(res.checkout)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                        res.statut === 'annulee' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                      }`}>
                        {res.statut}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-dark">{fmtEur(res.montant_total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CRMVoyageurs() {
  const [voyageurs,  setVoyageurs]  = useState<Voyageur[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [searching,  setSearching]  = useState(false)
  const [selected,   setSelected]   = useState<Voyageur | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = (q?: string) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : ''
    api.get<Voyageur[]>(`/api/crm-voyageurs${params}`)
      .then((r) => setVoyageurs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVoyageurs([]))
      .finally(() => { setLoading(false); setSearching(false) })
  }

  useEffect(() => { load() }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    setSearching(true)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => load(val), 350)
  }

  return (
    <FeatureGate feature="crmVoyageurs">
    <div>
      {/* Barre de recherche */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          {searching
            ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
            : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          }
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-8 pr-3 py-2.5 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span className="text-xs text-muted ml-auto">
          {voyageurs.length} voyageur{voyageurs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : voyageurs.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border flex flex-col items-center justify-center h-48 gap-3">
          <Users2 size={36} className="text-gray-300" />
          <p className="text-sm text-muted">
            {search ? 'Aucun voyageur trouvé' : 'Aucun voyageur enregistré'}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {voyageurs.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelected(v)}
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {initiales(v.nom)}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-dark truncate">{v.nom}</p>
                    {(v.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {v.email ?? 'Pas d\'email'}
                    {v.derniere_reservation && (
                      <span className="ml-2">· Dernier séjour : {fmtDate(v.derniere_reservation)}</span>
                    )}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-sm font-bold text-dark">{fmtEur(v.montant_total)}</p>
                  <p className="text-xs text-muted">
                    {v.nb_sejours} séjour{v.nb_sejours !== 1 ? 's' : ''}
                  </p>
                </div>

                <ChevronRight size={16} className="text-muted flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panneau latéral */}
      {selected && (
        <VoyageurPanel
          voyageur={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => load(search || undefined)}
        />
      )}
    </div>
    </FeatureGate>
  )
}
