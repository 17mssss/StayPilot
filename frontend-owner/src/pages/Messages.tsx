import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, MessageSquare, RefreshCw } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  direction: 'admin_to_owner' | 'owner_to_admin'
  content: string
  is_read: boolean
  created_at: string
}

interface Proprietaire {
  id: string
  nom: string
  email: string
}

function fmtTime(d: string) {
  const date = new Date(d)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function groupByDay(messages: Message[]): { date: string; msgs: Message[] }[] {
  const groups: Record<string, Message[]> = {}
  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[d]) groups[d] = []
    groups[d].push(msg)
  }
  return Object.entries(groups).map(([date, msgs]) => ({ date, msgs }))
}

export default function Messages() {
  const { user } = useAuth()
  const [proprietaire, setProprietaire] = useState<Proprietaire | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Find proprietaire record matching current user's email
  const resolveProprietaire = useCallback(async () => {
    try {
      const res = await api.get<Proprietaire[]>('/api/proprietaires')
      const list = res.data ?? []
      const match = list.find((p) => p.email?.toLowerCase() === user?.email?.toLowerCase())
      return match ?? null
    } catch {
      return null
    }
  }, [user?.email])

  const loadMessages = useCallback(async (propId: string, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get<Message[]>('/api/owner-messages', { params: { proprietaire_id: propId } })
      setMessages(res.data ?? [])
      // Mark admin→owner messages as read
      api.patch('/api/owner-messages/read', {}, { params: { proprietaire_id: propId, direction: 'admin_to_owner' } }).catch(() => {})
    } catch {
      setError('Impossible de charger les messages.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const prop = await resolveProprietaire()
      if (!mounted) return
      if (!prop) {
        setError('Votre compte propriétaire n\'est pas encore configuré. Contactez votre conciergerie.')
        setLoading(false)
        return
      }
      setProprietaire(prop)
      await loadMessages(prop.id)
    }
    init()
    return () => { mounted = false }
  }, [resolveProprietaire, loadMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !proprietaire || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    try {
      const res = await api.post<Message>('/api/owner-messages', {
        proprietaire_id: proprietaire.id,
        direction: 'owner_to_admin',
        content,
      })
      setMessages((prev) => [...prev, res.data])
    } catch {
      setText(content)
      setError('Échec de l\'envoi. Réessayez.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !proprietaire) {
    return (
      <div className="max-w-lg mx-auto bg-surface rounded-xl shadow-card p-8 text-center">
        <MessageSquare size={40} className="mx-auto text-gray-300 mb-4" />
        <p className="text-sm text-muted">{error}</p>
      </div>
    )
  }

  const groups = groupByDay(messages)

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-dark">Messagerie</h2>
          <p className="text-xs text-muted">Échangez directement avec votre conciergerie</p>
        </div>
        {proprietaire && (
          <button
            onClick={() => loadMessages(proprietaire.id, true)}
            disabled={refreshing}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-dark transition-colors disabled:opacity-40"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-surface rounded-xl shadow-card overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageSquare size={40} className="text-gray-200" />
            <p className="text-sm text-muted">Aucun message pour l'instant.</p>
            <p className="text-xs text-gray-400">Envoyez un message à votre conciergerie ci-dessous.</p>
          </div>
        ) : (
          groups.map(({ date, msgs }) => (
            <div key={date}>
              {/* Day separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 font-medium capitalize">{date}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-3">
                {msgs.map((msg) => {
                  const isOwner = msg.direction === 'owner_to_admin'
                  return (
                    <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                      {/* Admin avatar */}
                      {!isOwner && (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mr-2 mt-1">
                          C
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isOwner ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwner
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-bg text-dark border border-border rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">{fmtTime(msg.created_at)}</span>
                      </div>
                      {/* Owner avatar */}
                      {isOwner && (
                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0 ml-2 mt-1">
                          {user?.email?.[0]?.toUpperCase() ?? 'P'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex-shrink-0">
        {error && (
          <p className="text-xs text-red-500 mb-2 text-center">{error}</p>
        )}
        <div className="flex items-end gap-2 bg-surface rounded-xl shadow-card p-2 border border-border">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Écrivez votre message… (Entrée pour envoyer)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-dark placeholder:text-gray-400 focus:outline-none leading-relaxed py-1.5 px-2 max-h-32 overflow-y-auto"
            style={{ minHeight: '36px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">Maj+Entrée pour un saut de ligne</p>
      </div>
    </div>
  )
}
