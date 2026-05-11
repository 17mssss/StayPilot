import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Sparkles, MessageSquare, RefreshCw, ArrowLeft, Plus, Settings, CheckCheck } from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string; guest_name?: string; property_name?: string; logement_name?: string
  last_message?: string; last_message_at?: string; unread_count?: number; reservation_id?: string
}
interface Message {
  id: string; content: string; direction: 'inbound' | 'outbound'
  channel: string; sent_at: string; status: string; genere_par_ia?: boolean; valide?: boolean | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(d: string) {
  const date = new Date(d)
  const now   = new Date()
  const diff  = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// Génère un gradient déterministe par nom
const GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-orange-400 to-amber-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-blue-500',
  'from-teal-400 to-emerald-500',
  'from-lime-400 to-green-500',
  'from-indigo-400 to-blue-600',
  'from-fuchsia-400 to-pink-500',
]
function gradientFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return GRADIENTS[h % GRADIENTS.length]
}
function initialsFor(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

// ─── Notifications ─────────────────────────────────────────────────────────────

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
}
function pushNotif(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted')
    new Notification(title, { body, icon: '/favicon.ico' })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected,      setSelected]      = useState<Conversation | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [newMessage,    setNewMessage]    = useState('')
  const [sending,       setSending]       = useState(false)
  const [validating,    setValidating]    = useState<string | null>(null)
  const [regenerating,  setRegenerating]  = useState<string | null>(null)
  const [channel,       setChannel]       = useState<'email' | 'whatsapp' | 'sms'>('email')
  const [search,        setSearch]        = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMsgCountRef  = useRef<Record<string, number>>({})
  const lastSuggCountRef = useRef<Record<string, number>>({})

  useEffect(() => { requestNotifPermission() }, [])

  const loadConversations = useCallback(() => {
    api.get<Conversation[]>('/api/messages')
      .then(r => { const c = Array.isArray(r.data) ? r.data : []; setConversations(c) })
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false))
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Polling 30s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await api.get<Conversation[]>('/api/messages')
        const convs: Conversation[] = Array.isArray(r.data) ? r.data : []
        setConversations(convs)
        for (const c of convs) {
          const prev = lastMsgCountRef.current[c.id] ?? c.unread_count ?? 0
          const curr = c.unread_count ?? 0
          if (curr > prev) pushNotif(`Nouveau message — ${c.guest_name ?? 'Voyageur'}`, c.last_message ?? '')
          lastMsgCountRef.current[c.id] = curr
        }
      } catch {}
    }, 30_000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    const id = selected.reservation_id ?? selected.id
    api.get<Message[]>(`/api/reservations/${id}/messages`)
      .then(r => {
        const msgs: Message[] = Array.isArray(r.data) ? r.data : []
        setMessages(msgs)
        const sc = msgs.filter(m => m.genere_par_ia && m.valide == null).length
        const prev = lastSuggCountRef.current[id] ?? 0
        if (sc > prev) pushNotif('Suggestion IA en attente', `${selected.guest_name ?? 'Voyageur'} — réponse à valider`)
        lastSuggCountRef.current[id] = sc
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false))
  }, [selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !selected) return
    setSending(true)
    try {
      const res = await api.post<Message>('/api/messages/send', {
        reservation_id: selected.reservation_id ?? selected.id,
        content: newMessage.trim(),
      })
      setMessages(prev => [...prev, res.data])
      setNewMessage('')
    } catch {}
    setSending(false)
  }

  const handleValidate = async (msg: Message) => {
    setValidating(msg.id)
    try {
      const res = await api.patch<Message>(`/api/messages/${msg.id}/valider`, { valide: true })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...res.data, valide: true } : m))
    } catch {}
    setValidating(null)
  }

  const handleReject = async (msg: Message) => {
    setRegenerating(msg.id)
    const rid = selected?.reservation_id ?? selected?.id
    try {
      await api.delete(`/api/messages/${msg.id}`)
      setMessages(prev => prev.filter(m => m.id !== msg.id))
      const res = await api.post<Message>(`/api/messages/${rid}/regenerate`, {})
      if (res.data) {
        setMessages(prev => [...prev, res.data])
        pushNotif('Nouvelle suggestion IA', `${selected?.guest_name ?? 'Voyageur'} — nouvelle réponse générée`)
      }
    } catch {}
    setRegenerating(null)
  }

  const handleRequestSuggestion = async () => {
    if (!selected || regenerating) return
    const rid = selected.reservation_id ?? selected.id
    setRegenerating('manual')
    try {
      // Supprimer toutes les suggestions IA en attente avant d'en générer une nouvelle
      const pending = messages.filter(m => m.genere_par_ia && m.valide == null)
      for (const p of pending) {
        try { await api.delete(`/api/messages/${p.id}`) } catch {}
      }
      setMessages(prev => prev.filter(m => !(m.genere_par_ia && m.valide == null)))

      const res = await api.post<Message>(`/api/messages/${rid}/regenerate`, {})
      if (res.data) {
        setMessages(prev => [...prev, res.data])
        pushNotif('Suggestion IA générée', `${selected.guest_name ?? 'Voyageur'} — réponse prête`)
      }
    } catch {}
    setRegenerating(null)
  }

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_count ?? 0), 0)

  const visible = conversations.filter(c => {
    if (!search) return true
    const name = (c.guest_name ?? '').toLowerCase()
    const msg  = (c.last_message ?? '').toLowerCase()
    return name.includes(search.toLowerCase()) || msg.includes(search.toLowerCase())
  })

  return (
    <div className="flex flex-col -mx-3 sm:-mx-6 -my-4 sm:-my-6" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      <div className="flex flex-1 min-h-0">

        {/* ══ SIDEBAR ════════════════════════════════════════════════════════════ */}
        <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 flex-col bg-surface border-r border-border`}>

          {/* Titre */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-dark tracking-tight">Messagerie</h2>
              {totalUnread > 0 && (
                <span className="text-xs font-bold bg-primary text-white rounded-full px-1.5 py-0.5 leading-none">
                  {totalUnread}
                </span>
              )}
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-border-light hover:text-dark transition-colors">
              <Plus size={17} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-bg rounded-xl border border-border focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted">
                <MessageSquare size={28} className="opacity-20" />
                <p className="text-sm">{search ? 'Aucun résultat' : 'Aucune conversation'}</p>
              </div>
            ) : (
              <>
                <p className="px-5 pb-1 pt-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Conversations
                </p>
                {visible.map(c => {
                  const name  = c.guest_name ?? 'Voyageur'
                  const isAct = selected?.id === c.id
                  const unread = c.unread_count ?? 0
                  return (
                    <button key={c.id} onClick={() => setSelected(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                        isAct ? 'bg-primary/10 dark:bg-primary/15' : 'hover:bg-border-light'
                      }`}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center`}>
                          <span className="text-white text-sm font-bold">{initialsFor(name)}</span>
                        </div>
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-dark' : 'font-semibold text-dark/80'}`}>
                            {name}
                          </span>
                          {c.last_message_at && (
                            <span className="text-[10px] text-muted flex-shrink-0">{fmtTime(c.last_message_at)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-dark/70 font-medium' : 'text-muted'}`}>
                            {c.last_message ?? c.property_name ?? c.logement_name ?? '—'}
                          </p>
                          {unread > 0 && (
                            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* ══ CONVERSATION ═══════════════════════════════════════════════════════ */}
        <div className={`${!selected ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 bg-bg`}>
          {selected ? (() => {
            const name = selected.guest_name ?? 'Voyageur'
            const grad = gradientFor(name)
            return (
              <div className="flex flex-col h-full">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-surface border-b border-border flex-shrink-0">
                  <button onClick={() => setSelected(null)}
                    className="md:hidden w-8 h-8 flex items-center justify-center text-muted hover:text-dark -ml-1">
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">{initialsFor(name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-dark truncate">{name}</p>
                    <p className="text-xs text-muted truncate">
                      {selected.property_name ?? selected.logement_name ?? 'Messagerie IA'}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
                  {loadingMsgs ? (
                    <div className="flex justify-center pt-10">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                      <MessageSquare size={32} className="text-muted" />
                      <p className="text-sm text-muted">Aucun message</p>
                    </div>
                  ) : (
                    messages.map((m, i) => {
                      const isOut    = m.direction === 'outbound'
                      const isRead   = m.status === 'lu' || m.status === 'read'
                      const isPend   = !!m.genere_par_ia && m.valide == null
                      const prevSame = i > 0 && messages[i - 1].direction === m.direction
                      const nextSame = i < messages.length - 1 && messages[i + 1].direction === m.direction
                      const isRej    = regenerating === m.id
                      const time     = new Date(m.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

                      return (
                        <div key={m.id} className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} ${prevSame ? 'mt-0.5' : 'mt-3'}`}>

                          {/* Badge IA */}
                          {m.genere_par_ia && (
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                              <Sparkles size={9} /> Suggestion IA
                            </div>
                          )}

                          {/* Avatar guest */}
                          <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} w-full`}>
                            {!isOut && !prevSame && (
                              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 mr-2 mt-0.5`}>
                                <span className="text-white text-[10px] font-bold">{initialsFor(name)}</span>
                              </div>
                            )}
                            {!isOut && prevSame && <div className="w-9 flex-shrink-0" />}

                            {/* Bulle */}
                            <div className={`max-w-[65%] px-4 py-2.5 text-sm leading-relaxed ${
                              !isOut
                                ? `bg-surface border border-border text-dark shadow-sm ${prevSame ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'}`
                                : isPend
                                  ? `bg-violet-100 dark:bg-violet-900/30 text-dark border border-violet-300 dark:border-violet-700 ${prevSame ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'}`
                                  : `bg-primary text-white ${prevSame ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'}`
                            }`}>
                              {m.content}
                            </div>
                          </div>

                          {/* Heure + lu */}
                          {!nextSame && (
                            <div className={`flex items-center gap-1 mt-1 ${isOut ? 'pr-1' : 'pl-9'}`}>
                              <span className="text-[10px] text-muted">{time}</span>
                              {isOut && !isPend && <CheckCheck size={11} className={isRead ? 'text-primary/70' : 'text-muted'} />}
                            </div>
                          )}

                          {/* Boutons validation IA */}
                          {isPend && isOut && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <button disabled={validating === m.id || isRej} onClick={() => handleValidate(m)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                                {validating === m.id
                                  ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                                  : '✓ Envoyer'}
                              </button>
                              <button disabled={validating === m.id || isRej} onClick={() => handleReject(m)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                                {isRej ? <RefreshCw size={11} className="animate-spin" /> : '↺ Régénérer'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="px-5 pb-5 pt-2 flex-shrink-0">
                  {/* Sélecteur canal (Pro) */}
                  <FeatureGate feature="whatsapp">
                    <div className="flex items-center gap-1.5 mb-2">
                      {(['email', 'whatsapp', 'sms'] as const).map(c => (
                        <button key={c} onClick={() => setChannel(c)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            channel === c ? 'bg-primary text-white border-primary' : 'bg-bg text-muted border-border hover:border-primary/50 hover:text-dark'
                          }`}>
                          {c === 'email' ? 'Email' : c === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        </button>
                      ))}
                    </div>
                  </FeatureGate>

                  <div className="flex items-end gap-2 bg-surface rounded-2xl border border-border px-4 py-3 shadow-sm focus-within:border-primary transition-colors">
                    <textarea
                      rows={2}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      placeholder={`Répondre à ${name}…`}
                      className="flex-1 bg-transparent text-sm text-dark resize-none focus:outline-none placeholder:text-muted leading-relaxed"
                    />
                    <div className="flex items-center gap-2 pb-0.5">
                      <button onClick={handleRequestSuggestion} disabled={!!regenerating} title="Suggestion IA"
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 transition-colors">
                        {regenerating === 'manual'
                          ? <RefreshCw size={15} className="animate-spin" />
                          : <Sparkles size={15} />}
                      </button>
                      <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                        className="w-8 h-8 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-30 text-white flex items-center justify-center transition-colors">
                        {sending
                          ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })() : (
            <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-8">
              <MessageSquare size={40} className="text-muted opacity-20" />
              <p className="text-sm text-muted font-medium">Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
