import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Users, MessageSquare, RefreshCw, Bell, ArrowLeft } from 'lucide-react'
import api from '../lib/api'

interface Proprietaire {
  id: string
  nom: string
  email: string
}

interface Message {
  id: string
  direction: 'admin_to_owner' | 'owner_to_admin'
  content: string
  is_read: boolean
  created_at: string
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

export default function MessagesProprietaires() {
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([])
  const [selected, setSelected] = useState<Proprietaire | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadPerOwner, setUnreadPerOwner] = useState<Record<string, number>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.get<Proprietaire[]>('/api/proprietaires')
      .then((r) => setProprietaires(r.data ?? []))
      .catch(() => setProprietaires([]))
      .finally(() => setLoadingList(false))
  }, [])

  // Fetch unread counts for all owners
  useEffect(() => {
    if (proprietaires.length === 0) return
    Promise.all(
      proprietaires.map((p) =>
        api.get<{ count: number }>('/api/owner-messages/unread-count', {
          params: { proprietaire_id: p.id, direction: 'owner_to_admin' },
        }).then((r) => ({ id: p.id, count: r.data?.count ?? 0 }))
          .catch(() => ({ id: p.id, count: 0 }))
      )
    ).then((results) => {
      const map: Record<string, number> = {}
      results.forEach(({ id, count }) => { map[id] = count })
      setUnreadPerOwner(map)
    })
  }, [proprietaires])

  const loadMessages = useCallback(async (prop: Proprietaire) => {
    setLoadingMsgs(true)
    try {
      const res = await api.get<Message[]>('/api/owner-messages', {
        params: { proprietaire_id: prop.id },
      })
      setMessages(res.data ?? [])
      // Mark owner→admin as read
      api.patch('/api/owner-messages/read', {}, {
        params: { proprietaire_id: prop.id, direction: 'owner_to_admin' },
      }).catch(() => {})
      setUnreadPerOwner((prev) => ({ ...prev, [prop.id]: 0 }))
    } catch {
      setMessages([])
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  const selectOwner = (p: Proprietaire) => {
    setSelected(p)
    setText('')
    loadMessages(p)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    try {
      const res = await api.post<Message>('/api/owner-messages', {
        proprietaire_id: selected.id,
        direction: 'admin_to_owner',
        content,
      })
      setMessages((prev) => [...prev, res.data])

      // Also create a notification for the owner
      api.post('/api/notifications', {
        proprietaire_id: selected.id,
        type: 'message',
        title: 'Nouveau message de votre conciergerie',
        body: content.length > 100 ? content.slice(0, 100) + '…' : content,
      }).catch(() => {})
    } catch {
      setText(content)
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

  const totalUnread = Object.values(unreadPerOwner).reduce((a, b) => a + b, 0)
  const groups = groupByDay(messages)

  return (
    <div className="flex gap-3 sm:gap-5" style={{ height: 'calc(100vh - 8rem - env(safe-area-inset-bottom, 0px))' }}>
      {/* Owner list — full width on mobile when no selection, fixed 224px on md+ */}
      <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col overflow-hidden w-full md:w-56 md:flex-shrink-0 bg-surface rounded-xl shadow-card`}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted" />
            <span className="text-xs font-semibold text-dark">Propriétaires</span>
          </div>
          {totalUnread > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : proprietaires.length === 0 ? (
            <p className="text-xs text-muted text-center py-8 px-3">Aucun propriétaire</p>
          ) : (
            proprietaires.map((p) => {
              const unread = unreadPerOwner[p.id] ?? 0
              return (
                <button
                  key={p.id}
                  onClick={() => selectOwner(p)}
                  className={`w-full text-left px-4 py-3 border-b border-border flex items-center gap-2.5 hover:bg-bg transition-colors ${
                    selected?.id === p.id ? 'bg-primary-light' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {p.nom[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selected?.id === p.id ? 'text-primary' : 'text-dark'}`}>
                      {p.nom}
                    </p>
                    {p.email && (
                      <p className="text-[10px] text-muted truncate">{p.email}</p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area — hidden on mobile when no owner selected */}
      <div className={`${!selected ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
        {!selected ? (
          <div className="hidden md:flex flex-1 bg-surface rounded-xl shadow-card flex-col items-center justify-center gap-3 text-center">
            <MessageSquare size={40} className="text-muted opacity-30" />
            <p className="text-sm text-muted">Sélectionnez un propriétaire pour afficher la conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile back button */}
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden flex-shrink-0 text-muted hover:text-dark"
                  aria-label="Retour"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-dark truncate">{selected.nom}</h3>
                  {selected.email && <p className="text-xs text-muted truncate">{selected.email}</p>}
                </div>
              </div>
              <button
                onClick={() => loadMessages(selected)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-dark transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-surface rounded-xl shadow-card overflow-y-auto p-4 space-y-4 min-h-0">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <MessageSquare size={36} className="text-muted opacity-30" />
                  <p className="text-sm text-muted">Aucun message avec ce propriétaire</p>
                </div>
              ) : (
                groups.map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted font-medium capitalize">{date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3">
                      {msgs.map((msg) => {
                        const isAdmin = msg.direction === 'admin_to_owner'
                        return (
                          <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            {!isAdmin && (
                              <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0 mr-2 mt-1">
                                {selected.nom[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isAdmin
                                  ? 'bg-primary text-white rounded-br-sm'
                                  : 'bg-bg text-dark border border-border rounded-bl-sm'
                              }`}>
                                {msg.content}
                              </div>
                              <span className="text-[10px] text-muted px-1">{fmtTime(msg.created_at)}</span>
                            </div>
                            {isAdmin && (
                              <div className="w-7 h-7 rounded-full bg-bg flex items-center justify-center text-muted text-[10px] font-bold flex-shrink-0 ml-2 mt-1">
                                A
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
              <div className="flex items-end gap-2 bg-surface rounded-xl shadow-card p-2 border border-border">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Répondre à ${selected.nom}… (Entrée pour envoyer)`}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-dark placeholder:text-muted focus:outline-none leading-relaxed py-1.5 px-2 max-h-32 overflow-y-auto"
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
                  className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
