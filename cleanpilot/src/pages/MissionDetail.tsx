import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Clock, CheckSquare, Square,
  Camera, Trash2, CheckCircle2, Loader2,
  AlertTriangle, Home, ChevronRight, ChevronDown,
} from 'lucide-react'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Mission, ChecklistItem } from './MissionsToday'

const TYPE_LABELS: Record<string, string> = {
  menage: 'Ménage', maintenance: 'Maintenance',
  check_in: 'Arrivée', check_out: 'Départ',
}
const TYPE_COLORS: Record<string, string> = {
  menage: 'bg-sky-100 text-sky-700',
  maintenance: 'bg-orange-100 text-orange-700',
  check_in: 'bg-green-100 text-green-700',
  check_out: 'bg-purple-100 text-purple-700',
}

function formatTime(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Mock detail for demo
function getMockMission(id: string): Mission {
  return {
    id,
    logement_name: 'Appartement Bastille',
    address: '12 rue de la Roquette, Paris 11e',
    type: 'menage',
    status: id === 'mock-3' ? 'done' : 'pending',
    priority: id === 'mock-1' ? 'urgent' : 'normal',
    scheduled_at: new Date().toISOString(),
    deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    duration_min: 90,
    notes: 'Locataire repart à 10h. Prochain arrive à 14h. Changer les draps chambre 2. Attention : chat dans l\'appartement, ne pas le laisser sortir.',
    checklist: [
      { id: 'c1', label: 'Faire les lits (chambre 1 + 2)', done: false },
      { id: 'c2', label: 'Nettoyer la salle de bain', done: false },
      { id: 'c3', label: 'Cuisine + vaisselle', done: false },
      { id: 'c4', label: 'Aspirer + serpillière salon', done: false },
      { id: 'c5', label: 'Aspirer + serpillière chambre', done: false },
      { id: 'c6', label: 'Vérifier stock serviettes', done: false },
      { id: 'c7', label: 'Recharger kit accueil (shampooing, savon)', done: false },
      { id: 'c8', label: 'Vider poubelles', done: false },
      { id: 'c9', label: 'Vérifier fenêtres fermées + volets', done: false },
    ],
  }
}

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { agent } = useAuth()

  const [mission, setMission] = useState<Mission | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [photos, setPhotos] = useState<string[]>([])   // base64 data URLs
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)  // seconds
  const [notesOpen, setNotesOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    api.get<Mission>(`/api/menage/${id}`)
      .then(r => {
        setMission(r.data)
        setChecklist(r.data.checklist ?? [])
        // Auto-démarrer le timer si la mission n'est pas déjà terminée
        if (r.data.status !== 'done') {
          setStartTime(new Date())
          if (!r.data.id.startsWith('mock')) {
            api.patch(`/api/menage/${r.data.id}`, { status: 'in_progress' }).catch(() => {})
          }
        }
      })
      .catch(() => {
        const mock = getMockMission(id)
        setMission(mock)
        setChecklist(mock.checklist ?? [])
        // Auto-démarrer même en mode mock
        if (mock.status !== 'done') setStartTime(new Date())
      })
      .finally(() => setLoading(false))
  }, [id])

  // Timer
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const toggleItem = (itemId: string) => {
    setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, done: !c.done } : c))
  }

  // Upload des photos vers Supabase Storage
  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return []
    const urls: string[] = []
    for (const dataUrl of photos) {
      try {
        // Convertir base64 en Blob
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const path = `${mission!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { data, error } = await supabase.storage
          .from('mission-photos')
          .upload(path, blob, { contentType: blob.type, upsert: false })

        if (!error && data) {
          const { data: urlData } = supabase.storage.from('mission-photos').getPublicUrl(data.path)
          if (urlData?.publicUrl) urls.push(urlData.publicUrl)
        }
      } catch { /* ignorer les erreurs d'upload individuelles */ }
    }
    return urls
  }

  const handleComplete = async () => {
    if (!mission) return
    setSaving(true)
    const done = checklist.filter(c => c.done).length
    const total = checklist.length
    if (done < total) {
      const ok = confirm(`${total - done} tâche(s) non cochée(s). Terminer quand même ?`)
      if (!ok) { setSaving(false); return }
    }
    try {
      // Upload des photos en parallèle
      const photoUrls = await uploadPhotos()

      if (!mission.id.startsWith('mock')) {
        await api.patch(`/api/menage/${mission.id}`, {
          status: 'done',
          checklist,
          completed_at: new Date().toISOString(),
          duration_actual: elapsed > 0 ? Math.ceil(elapsed / 60) : undefined,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
        }).catch(() => {})
      }

      // Notifier le concierge via Supabase
      if (agent?.concierge_id) {
        supabase.from('concierge_notifications').insert({
          concierge_id: agent.concierge_id,
          type: 'mission_done',
          title: 'Mission terminée ✓',
          body: `${agent.full_name} a terminé le ménage de « ${mission.logement_name} »${photoUrls.length > 0 ? ` (${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''})` : ''}`,
          logement_name: mission.logement_name,
          agent_name: agent.full_name,
          mission_id: mission.id,
        }).then(() => {}, () => {})
      }

      setMission(m => m ? { ...m, status: 'done' } : m)
      navigate('/', { replace: true })
    } catch {
      alert('Erreur lors de la sauvegarde. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos(prev => [...prev, reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-6">
        <p className="text-base text-dark font-semibold">Mission introuvable</p>
        <button onClick={() => navigate('/')} className="text-sm text-primary">Retour</button>
      </div>
    )
  }

  const doneCnt = checklist.filter(c => c.done).length
  const pct = checklist.length > 0 ? Math.round((doneCnt / checklist.length) * 100) : 0
  const isDone = mission.status === 'done'

  return (
    <div className="flex flex-col bg-bg safe-top" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-bg border border-border flex items-center justify-center active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[mission.type] ?? 'bg-gray-100 text-gray-600'}`}>
                {TYPE_LABELS[mission.type] ?? mission.type}
              </span>
              {mission.priority === 'urgent' && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} /> URGENT
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-dark mt-0.5 truncate">{mission.logement_name}</h2>
          </div>
          {/* Timer */}
          {startTime && (
            <div className="text-sm font-mono font-bold text-primary tabular-nums">
              {formatElapsed(elapsed)}
            </div>
          )}
        </div>
      </div>

      {/* Content — scrollable zone */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Info card */}
        <div className="mx-4 mt-4 bg-surface rounded-2xl shadow-card p-4 space-y-2">
          {mission.address && (
            <p className="text-sm text-muted flex items-center gap-2">
              <MapPin size={14} className="flex-shrink-0 text-primary" />
              {mission.address}
            </p>
          )}
          {(mission.scheduled_at || mission.deadline) && (
            <p className="text-sm text-muted flex items-center gap-2">
              <Clock size={14} className="flex-shrink-0 text-primary" />
              {formatTime(mission.scheduled_at)}
              {mission.deadline && <> → {formatTime(mission.deadline)}</>}
              {mission.duration_min && <span className="text-muted ml-1">(~{mission.duration_min} min)</span>}
            </p>
          )}
          {isDone && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={14} />
              <span className="text-sm font-medium">Mission terminée</span>
            </div>
          )}
        </div>

        {/* Notes collapsible */}
        {mission.notes && (
          <div className="mx-4 mt-3">
            <button
              onClick={() => setNotesOpen(o => !o)}
              className="w-full flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-yellow-800">📝 Notes conciergerie</span>
              {notesOpen ? <ChevronDown size={16} className="text-yellow-600" /> : <ChevronRight size={16} className="text-yellow-600" />}
            </button>
            {notesOpen && (
              <div className="bg-yellow-50 border border-yellow-200 border-t-0 rounded-b-2xl px-4 py-3">
                <p className="text-sm text-yellow-900 leading-relaxed">{mission.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="mx-4 mt-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-sm font-semibold text-dark">Checklist</p>
              <span className="text-xs font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {checklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => !isDone && toggleItem(item.id)}
                  disabled={isDone}
                  className={`w-full flex items-center gap-3 bg-surface rounded-xl p-3.5 shadow-card text-left active:scale-[0.99] transition-transform ${isDone ? 'opacity-60' : ''}`}
                >
                  {item.done
                    ? <CheckSquare size={20} className="text-success flex-shrink-0" />
                    : <Square size={20} className="text-muted flex-shrink-0" />
                  }
                  <span className={`text-sm ${item.done ? 'line-through text-muted' : 'text-dark'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-sm font-semibold text-dark">Photos ({photos.length})</p>
            {!isDone && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-primary font-medium"
              >
                <Camera size={15} /> Ajouter
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhoto}
          />
          {photos.length === 0 ? (
            !isDone && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-8 bg-surface rounded-2xl border-2 border-dashed border-border text-muted"
              >
                <Camera size={28} />
                <span className="text-sm">Prendre une photo</span>
              </button>
            )
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  {!isDone && (
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
              {!isDone && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted"
                >
                  <Camera size={22} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bouton Terminer — élément normal du flux, toujours visible */}
      {!isDone && (
        <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-3">
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-success text-white font-bold text-base active:scale-[0.98] disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</>
              : <><CheckCircle2 size={18} /> Terminer &amp; envoyer</>
            }
          </button>
        </div>
      )}

      {/* Spacer pour le nav bar fixe en bas */}
      <div className="flex-shrink-0" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }} />
    </div>
  )
}
