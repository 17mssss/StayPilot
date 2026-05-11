import React, { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCheck, Trash2, Euro, Calendar, FileText, MessageSquare, Info } from 'lucide-react'
import api from '../lib/api'

interface Notification {
  id: string
  type: 'info' | 'new_reservation' | 'cancellation' | 'payment' | 'document' | 'message'
  title: string
  body?: string
  is_read: boolean
  created_at: string
}

const TYPE_CONFIG: Record<Notification['type'], { icon: React.ReactNode; cls: string; label: string }> = {
  info:            { icon: <Info size={16} />,         cls: 'bg-gray-100 text-gray-600',   label: 'Info' },
  new_reservation: { icon: <Calendar size={16} />,     cls: 'bg-green-100 text-green-700', label: 'Réservation' },
  cancellation:    { icon: <Calendar size={16} />,     cls: 'bg-red-100 text-red-600',     label: 'Annulation' },
  payment:         { icon: <Euro size={16} />,         cls: 'bg-blue-100 text-blue-700',   label: 'Paiement' },
  document:        { icon: <FileText size={16} />,     cls: 'bg-purple-100 text-purple-700', label: 'Document' },
  message:         { icon: <MessageSquare size={16} />, cls: 'bg-orange-100 text-orange-600', label: 'Message' },
}

function fmtDate(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'À l\'instant'
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '50' }
      if (filter === 'unread') params.unread_only = 'true'
      const res = await api.get<Notification[]>('/api/notifications', { params })
      setNotifs(res.data ?? [])
    } catch {
      setNotifs([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const markRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch {
      // silently ignore
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.patch('/api/notifications/read-all')
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  const deleteNotif = async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`)
      setNotifs((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // silently ignore
    }
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length
  const displayed = filter === 'unread' ? notifs.filter((n) => !n.is_read) : notifs

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-dark">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-muted mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-dark'}`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 font-medium transition-colors ${filter === 'unread' ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-dark'}`}
            >
              Non lues
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              <CheckCheck size={14} />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Bell size={36} className="text-gray-200" />
          <p className="text-sm text-muted">
            {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            return (
              <div
                key={notif.id}
                className={`bg-surface rounded-xl shadow-card p-4 flex gap-3 transition-opacity ${notif.is_read ? 'opacity-70' : ''}`}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${notif.is_read ? 'text-muted' : 'text-dark'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1.5">{fmtDate(notif.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notif.is_read && (
                        <button
                          onClick={() => markRead(notif.id)}
                          title="Marquer comme lu"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary-light transition-colors"
                        >
                          <CheckCheck size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotif(notif.id)}
                        title="Supprimer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
