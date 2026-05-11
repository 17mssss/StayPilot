import React, { useEffect, useState, useRef } from 'react'
import { Star, Plus, X, Trash2, MessageSquare, Search, Sparkles, Loader2 } from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

interface Avis {
  id: string
  reservation_id?: string | null
  logement_id?: string | null
  property_name?: string | null
  guest_name: string
  platform: string
  rating: number
  comment?: string | null
  date_avis: string
  reponse_admin?: string | null
  created_at: string
}

interface Logement { id: string; nom: string }

const PLATFORMS = ['airbnb', 'booking', 'abritel', 'google', 'other']
const PLATFORM_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', abritel: 'Abritel', google: 'Google', other: 'Autre',
}
const PLATFORM_COLORS: Record<string, string> = {
  airbnb: '#FF385C', booking: '#003580', abritel: '#00A699', google: '#4285F4', other: '#A3A3A3',
}

function StarRating({ rating = 0, size = 14, interactive = false, onChange }: {
  rating?: number; size?: number; interactive?: boolean; onChange?: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={`${(interactive ? (hover || rating) : rating) >= s ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} ${interactive ? 'cursor-pointer transition-colors' : ''}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(s)}
        />
      ))}
    </div>
  )
}

const EMPTY_FORM = {
  guest_name: '', platform: 'airbnb', rating: 5,
  comment: '', date_avis: new Date().toISOString().split('T')[0],
  logement_id: '', reponse_admin: '',
}

export default function Avis() {
  const [avis, setAvis]           = useState<Avis[]>([])
  const [logements, setLogements] = useState<Logement[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterRating, setFilterRating]     = useState(0)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [search, setSearch]                 = useState('')
  const [showModal, setShowModal]           = useState(false)
  const [form, setForm]                     = useState({ ...EMPTY_FORM })
  const [saving, setSaving]                 = useState(false)
  const [expandedReply, setExpandedReply]   = useState<string | null>(null)
  const [replyText, setReplyText]           = useState('')
  const [replyingSaving, setReplyingSaving] = useState(false)
  const [generatingAI, setGeneratingAI]     = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    api.get<Avis[]>('/api/avis', { params: { limit: 200 } })
      .then((r) => setAvis(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAvis([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<Logement[]>('/api/logements')
      .then((r) => setLogements(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (showModal) setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [showModal])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.guest_name.trim()) return
    setSaving(true)
    try {
      await api.post('/api/avis', {
        guest_name:    form.guest_name.trim(),
        platform:      form.platform,
        rating:        form.rating,
        comment:       form.comment || null,
        date_avis:     form.date_avis || null,
        logement_id:   form.logement_id || null,
        reponse_admin: form.reponse_admin || null,
      })
      setShowModal(false)
      load()
    } catch {
      /* swallow */
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return
    try {
      await api.delete(`/api/avis/${id}`)
      setAvis((prev) => prev.filter((a) => a.id !== id))
    } catch { /* swallow */ }
  }

  const handleReply = async (a: Avis) => {
    setReplyingSaving(true)
    try {
      await api.patch(`/api/avis/${a.id}`, { reponse_admin: replyText || null })
      setAvis((prev) => prev.map((x) => x.id === a.id ? { ...x, reponse_admin: replyText || null } : x))
      setExpandedReply(null)
      setReplyText('')
    } catch { /* swallow */ }
    finally { setReplyingSaving(false) }
  }

  const handleGenerateAI = async (avisId: string) => {
    setGeneratingAI(true)
    try {
      const r = await api.post<{ response: string }>(`/api/avis/${avisId}/generate-response`)
      const generated = r.data?.response ?? (r.data as unknown as string)
      if (typeof generated === 'string' && generated) {
        setReplyText(generated)
      }
    } catch { /* swallow */ }
    finally { setGeneratingAI(false) }
  }

  const filtered = avis.filter((a) => {
    if (filterRating && a.rating !== filterRating) return false
    if (filterPlatform && a.platform !== filterPlatform) return false
    if (search && !a.guest_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const avgRating = avis.length > 0 ? avis.reduce((s, a) => s + a.rating, 0) / avis.length : 0
  const distribution = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: avis.filter((a) => a.rating === s).length,
    pct:   avis.length > 0 ? (avis.filter((a) => a.rating === s).length / avis.length) * 100 : 0,
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div />
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={15} /> Ajouter un avis
        </button>
      </div>

      {/* Summary + Filters */}
      {avis.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {/* Note globale */}
          <div className="bg-surface rounded-xl shadow-card p-6">
            <div className="flex items-end gap-4 mb-4">
              <div className="text-5xl font-extrabold text-dark">{avgRating.toFixed(1)}</div>
              <div>
                <StarRating rating={Math.round(avgRating)} size={18} />
                <p className="text-xs text-muted mt-1">{avis.length} avis</p>
              </div>
            </div>
            <div className="space-y-2">
              {distribution.map(({ stars, count, pct }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-4">{stars}</span>
                  <Star size={10} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-surface rounded-xl shadow-card p-6 space-y-4">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un voyageur…"
                className="w-full pl-8 pr-3 py-2.5 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-2">Note</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterRating(0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRating === 0 ? 'bg-primary text-white' : 'bg-bg text-muted hover:text-dark'}`}>
                  Toutes
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button key={s} onClick={() => setFilterRating(filterRating === s ? 0 : s)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRating === s ? 'bg-primary text-white' : 'bg-bg text-muted hover:text-dark'}`}>
                    {s} <Star size={10} className={filterRating === s ? 'fill-white text-white' : 'fill-yellow-400 text-yellow-400'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-2">Plateforme</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterPlatform('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterPlatform ? 'bg-primary text-white' : 'bg-bg text-muted hover:text-dark'}`}>
                  Toutes
                </button>
                {PLATFORMS.map((p) => (
                  <button key={p} onClick={() => setFilterPlatform(filterPlatform === p ? '' : p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterPlatform === p ? 'bg-primary text-white' : 'bg-bg text-muted hover:text-dark'}`}>
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <MessageSquare size={36} className="text-gray-300" />
          <p className="text-sm text-muted">
            {avis.length === 0 ? 'Aucun avis enregistré — cliquez sur "Ajouter un avis"' : 'Aucun avis pour cette sélection'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl shadow-card p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {a.guest_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-dark text-sm">{a.guest_name}</p>
                    <p className="text-xs text-muted">{a.property_name ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[a.platform] ?? '#A3A3A3' }}
                    title={PLATFORM_LABELS[a.platform]} />
                  <button onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-muted hover:text-red-500 transition-colors rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <StarRating rating={a.rating} />

              {a.comment ? (
                <p className="text-sm text-muted leading-relaxed">{a.comment}</p>
              ) : (
                <p className="text-xs text-gray-300 italic">Aucun commentaire</p>
              )}

              {/* Réponse admin */}
              {a.reponse_admin && expandedReply !== a.id && (
                <div className="bg-primary-light rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-primary mb-0.5">Votre réponse</p>
                  <p className="text-xs text-dark leading-relaxed line-clamp-2">{a.reponse_admin}</p>
                </div>
              )}

              {/* Formulaire de réponse */}
              {expandedReply === a.id && (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Votre réponse publique…"
                    className="w-full text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary bg-bg resize-none"
                    autoFocus
                  />
                  <FeatureGate feature="reviewAutopilot">
                    <button
                      onClick={() => handleGenerateAI(a.id)}
                      disabled={generatingAI}
                      className="flex items-center gap-1.5 text-xs text-primary border border-primary rounded-lg px-3 py-1.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-50 w-full justify-center"
                    >
                      {generatingAI
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Sparkles size={11} />}
                      {generatingAI ? 'Génération en cours…' : '✨ Générer avec l\'IA'}
                    </button>
                  </FeatureGate>
                  <div className="flex gap-2">
                    <button onClick={() => handleReply(a)} disabled={replyingSaving}
                      className="flex-1 text-xs bg-primary text-white rounded-lg py-1.5 font-medium disabled:opacity-50 transition-colors">
                      {replyingSaving ? 'Envoi…' : 'Publier la réponse'}
                    </button>
                    <button onClick={() => { setExpandedReply(null); setReplyText('') }}
                      className="text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:text-dark transition-colors">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border-light pt-2">
                <p className="text-xs text-muted">
                  {new Date(a.date_avis).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {expandedReply !== a.id && (
                  <button
                    onClick={() => {
                      setExpandedReply(a.id)
                      setReplyText(a.reponse_admin ?? '')
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <MessageSquare size={11} />
                    {a.reponse_admin ? 'Modifier ma réponse' : 'Répondre'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal create/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-dark">Importer un avis</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-dark"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Nom voyageur */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Nom du voyageur *</label>
                <input
                  ref={firstInputRef}
                  value={form.guest_name}
                  onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                  placeholder="Jean Dupont"
                  className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
                />
              </div>

              {/* Logement + Plateforme */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Logement</label>
                  <select value={form.logement_id} onChange={(e) => setForm((f) => ({ ...f, logement_id: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg">
                    <option value="">Aucun</option>
                    {logements.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Plateforme</label>
                  <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg">
                    {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Note *</label>
                <StarRating rating={form.rating} size={24} interactive onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Date de l'avis</label>
                <input type="date" value={form.date_avis} onChange={(e) => setForm((f) => ({ ...f, date_avis: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg" />
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Commentaire</label>
                <textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={3} placeholder="Le voyageur a écrit…"
                  className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg resize-none" />
              </div>

              {/* Réponse admin */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Votre réponse (optionnel)</label>
                <textarea value={form.reponse_admin} onChange={(e) => setForm((f) => ({ ...f, reponse_admin: e.target.value }))}
                  rows={2} placeholder="Merci pour votre séjour…"
                  className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg resize-none" />
                {editing && (
                  <FeatureGate feature="reviewAutopilot">
                    <button
                      type="button"
                      onClick={async () => {
                        setGeneratingAI(true)
                        try {
                          const r = await api.post<{ response: string }>(`/api/avis/${editing.id}/generate-response`)
                          const generated = r.data?.response ?? (r.data as unknown as string)
                          if (typeof generated === 'string' && generated) {
                            setForm((f) => ({ ...f, reponse_admin: generated }))
                          }
                        } catch { /* swallow */ }
                        finally { setGeneratingAI(false) }
                      }}
                      disabled={generatingAI}
                      className="mt-2 flex items-center gap-1.5 text-xs text-primary border border-primary rounded-lg px-3 py-1.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
                    >
                      {generatingAI
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Sparkles size={11} />}
                      {generatingAI ? 'Génération en cours…' : '✨ Générer avec l\'IA'}
                    </button>
                  </FeatureGate>
                )}
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm text-muted hover:text-dark transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !form.guest_name.trim()}
                className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
