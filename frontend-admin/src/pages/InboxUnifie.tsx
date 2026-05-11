import React, { useState } from 'react'
import {
  Search, Send, Sparkles, Settings, X, Zap,
  ChevronRight, CheckCheck, AlertTriangle, Plus,
} from 'lucide-react'
import FeatureGate from '../components/FeatureGate'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChannelId = 'airbnb' | 'booking' | 'whatsapp' | 'sms' | 'email' | 'vrbo'

interface Channel {
  id: ChannelId
  label: string
  color: string        // text color
  bg: string           // avatar bg gradient
  dot: string          // indicator dot color
  connected: boolean
  apiKey: string
  docsUrl: string
}

interface Message {
  id: string
  from: 'guest' | 'host'
  text: string
  time: string
}

interface Conversation {
  id: string
  guestName: string
  initials: string
  avatarGradient: string
  channel: ChannelId
  property: string
  lastMessage: string
  time: string
  unread: number
  messages: Message[]
  checkIn: string
  checkOut: string
}

// ─── Channels config ───────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { id: 'airbnb',  label: 'Airbnb',        color: 'text-rose-500',   bg: 'from-rose-400 to-rose-600',     dot: 'bg-rose-400',   connected: false, apiKey: 'AIRBNB_CLIENT_ID + AIRBNB_CLIENT_SECRET',      docsUrl: 'https://developer.airbnb.com' },
  { id: 'booking', label: 'Booking.com',   color: 'text-blue-500',   bg: 'from-blue-500 to-blue-700',     dot: 'bg-blue-400',   connected: false, apiKey: 'BOOKING_API_KEY + BOOKING_PROPERTY_ID',        docsUrl: 'https://developers.booking.com' },
  { id: 'whatsapp',label: 'WhatsApp',      color: 'text-green-500',  bg: 'from-green-400 to-green-600',   dot: 'bg-green-400',  connected: false, apiKey: 'WHATSAPP_BUSINESS_TOKEN + PHONE_NUMBER_ID',    docsUrl: 'https://developers.facebook.com/docs/whatsapp' },
  { id: 'sms',     label: 'SMS (Twilio)',  color: 'text-violet-500', bg: 'from-violet-400 to-violet-600', dot: 'bg-violet-400', connected: false, apiKey: 'TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN',        docsUrl: 'https://www.twilio.com/docs' },
  { id: 'email',   label: 'Email',         color: 'text-indigo-500', bg: 'from-indigo-400 to-indigo-600', dot: 'bg-indigo-400', connected: false, apiKey: 'SMTP_HOST + SMTP_USER + SMTP_PASS',             docsUrl: 'https://resend.com/docs' },
  { id: 'vrbo',    label: 'Abritel/VRBO',  color: 'text-teal-500',   bg: 'from-teal-400 to-teal-600',     dot: 'bg-teal-400',   connected: false, apiKey: 'VRBO_CLIENT_ID + VRBO_CLIENT_SECRET',           docsUrl: 'https://developer.vrbo.com' },
]

const CHANNEL_LABELS: Record<ChannelId, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', whatsapp: 'WhatsApp',
  sms: 'SMS', email: 'Email', vrbo: 'Abritel',
}

const CHANNEL_DOTS: Record<ChannelId, string> = {
  airbnb: 'bg-rose-400', booking: 'bg-blue-400', whatsapp: 'bg-green-400',
  sms: 'bg-violet-400', email: 'bg-indigo-400', vrbo: 'bg-teal-400',
}

// Couleur de fond pour le badge canal dans l'en-tête de conversation
const CHANNEL_PILL: Record<ChannelId, string> = {
  airbnb:   'bg-rose-500',
  booking:  'bg-blue-600',
  whatsapp: 'bg-green-500',
  sms:      'bg-violet-500',
  email:    'bg-indigo-500',
  vrbo:     'bg-teal-500',
}

// Icône texte par canal (emoji léger)
const CHANNEL_ICON: Record<ChannelId, string> = {
  airbnb:   '🏠',
  booking:  '🌐',
  whatsapp: '💬',
  sms:      '📱',
  email:    '✉️',
  vrbo:     '🏡',
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
  {
    id: '1', guestName: 'Sophie Martin', initials: 'SM',
    avatarGradient: 'from-pink-400 to-rose-500',
    channel: 'airbnb', property: 'Appt Marais', lastMessage: 'Est-ce que le parking est inclus ?',
    time: '5 min', unread: 2, checkIn: '12 mai', checkOut: '15 mai',
    messages: [
      { id: 'm1', from: 'guest', text: 'Bonjour ! Je serai là vers 16h, est-ce que c\'est ok ?', time: '14:20' },
      { id: 'm2', from: 'host',  text: 'Bonjour Sophie ! Oui, parfait. Le code de la porte est 4821.', time: '14:35' },
      { id: 'm3', from: 'guest', text: 'Est-ce que le parking est inclus ?', time: '14:55' },
      { id: 'm4', from: 'guest', text: 'Ou y a-t-il un parking à proximité ?', time: '14:56' },
    ],
  },
  {
    id: '2', guestName: 'Marco Rossi', initials: 'MR',
    avatarGradient: 'from-orange-400 to-amber-500',
    channel: 'booking', property: 'Studio Bastille', lastMessage: 'Merci beaucoup pour tout !',
    time: '2h', unread: 0, checkIn: '10 mai', checkOut: '12 mai',
    messages: [
      { id: 'm5', from: 'guest', text: 'Bonsoir, nous sommes bien arrivés. Tout est parfait.', time: '19:10' },
      { id: 'm6', from: 'host',  text: 'Super, bonne nuit ! N\'hésitez pas si besoin.', time: '19:15' },
      { id: 'm7', from: 'guest', text: 'Merci beaucoup pour tout !', time: '20:02' },
    ],
  },
  {
    id: '3', guestName: 'Emma Dupuis', initials: 'ED',
    avatarGradient: 'from-violet-400 to-purple-500',
    channel: 'whatsapp', property: 'Loft Oberkampf', lastMessage: 'Le lave-vaisselle ne démarre pas 😅',
    time: '3h', unread: 1, checkIn: '11 mai', checkOut: '14 mai',
    messages: [
      { id: 'm8', from: 'guest', text: 'Bonjour ! On vient d\'arriver, tout est super.', time: '11:30' },
      { id: 'm9', from: 'guest', text: 'Le lave-vaisselle ne démarre pas 😅', time: '13:45' },
    ],
  },
  {
    id: '4', guestName: 'James Wilson', initials: 'JW',
    avatarGradient: 'from-sky-400 to-blue-500',
    channel: 'airbnb', property: 'Appt Marais', lastMessage: 'Perfect, thanks!',
    time: 'Hier', unread: 0, checkIn: '9 mai', checkOut: '11 mai',
    messages: [
      { id: 'm10', from: 'guest', text: 'Hello! What time is the checkout exactly?', time: '09:15' },
      { id: 'm11', from: 'host',  text: 'Hi James! Checkout is at 11am. Leave the key in the lockbox.', time: '09:30' },
      { id: 'm12', from: 'guest', text: 'Perfect, thanks!', time: '09:32' },
    ],
  },
  {
    id: '5', guestName: 'Lucie Bernard', initials: 'LB',
    avatarGradient: 'from-teal-400 to-emerald-500',
    channel: 'email', property: 'Studio Bastille', lastMessage: 'Avez-vous des restos à recommander ?',
    time: 'Hier', unread: 0, checkIn: '13 mai', checkOut: '16 mai',
    messages: [
      { id: 'm13', from: 'guest', text: 'Bonjour, j\'ai réservé via votre site. Avez-vous des recommandations de restaurants dans le quartier ?', time: 'Hier 18:00' },
    ],
  },
  {
    id: '6', guestName: 'Carlos García', initials: 'CG',
    avatarGradient: 'from-lime-400 to-green-500',
    channel: 'vrbo', property: 'Loft Oberkampf', lastMessage: '¿Hay toallas extra disponibles?',
    time: '2j', unread: 0, checkIn: '8 mai', checkOut: '10 mai',
    messages: [
      { id: 'm14', from: 'guest', text: '¿Hay toallas extra disponibles?', time: '2j 10:00' },
    ],
  },
]

// Plusieurs variations par conversation pour simuler une vraie régénération IA
const AI_REPLIES: Record<string, string[]> = {
  '1': [
    'Bonjour Sophie ! Le parking n\'est pas inclus, mais il y a un parking public Indigo à 50m (rue de Bretagne). Environ 3€/h ou 18€/nuit. Bonne installation !',
    'Bonjour Sophie ! Pas de parking privé malheureusement, mais je vous conseille le parking Sainte-Croix-de-la-Bretonnerie à 2 min à pied — très pratique et abordable. Bonne arrivée !',
    'Bonsoir Sophie ! Le logement n\'inclut pas de parking, mais l\'application PayByPhone couvre toute la zone — vous pouvez payer votre stationnement directement depuis votre téléphone. À bientôt !',
  ],
  '2': [
    'Avec plaisir Marco, bonne route ! N\'hésitez pas à laisser un avis, ça nous ferait vraiment plaisir 😊',
    'Ravi que votre séjour se soit bien passé ! Si vous repassez par Paris, n\'hésitez pas à réserver à nouveau. Un petit avis nous ferait très plaisir 🌟',
    'Merci à vous Marco ! C\'était un plaisir de vous accueillir. Bonne continuation et à peut-être bientôt !',
  ],
  '3': [
    'Bonjour Emma ! Appuyez sur le bouton "Marche" puis maintenez "Programme" 3 secondes. Si ça ne règle pas le problème, appelez-nous au 06 XX XX XX XX.',
    'Bonjour Emma ! Essayez de débrancher l\'appareil 30 secondes puis de le rebrancher — ça réinitialise souvent le programme. Si le souci persiste, je suis joignable au 06 XX XX XX XX !',
    'Bonjour ! Vérifiez que le verrou de la porte est bien enclenché (voyant vert). Si le lave-vaisselle ne démarre toujours pas, contactez-moi directement et j\'envoie quelqu\'un.',
  ],
  '4': [
    'Hi James! Happy you enjoyed your stay. Please leave the keys in the lockbox by the door. Hope to host you again!',
    'Hi James, glad to hear it! The lockbox is right next to the entrance — just drop the keys there when you leave. It was a pleasure having you!',
    'Thanks James! Feel free to check out anytime before 11am. Don\'t forget to leave the keys in the lockbox. Hope to see you in Paris again!',
  ],
  '5': [
    'Bonjour Lucie ! Je recommande "Le Bistrot Paul Bert" pour une cuisine française traditionnelle, et "Septime" pour une expérience gastronomique. Les deux sont à 5 min à pied 🍽️',
    'Bonjour Lucie ! Pour les restaurants : "Clown Bar" pour la bistronomie (réserver à l\'avance !), et "Au Passage" pour des petites assiettes à partager. Vous allez vous régaler !',
    'Bonjour ! Le quartier regorge de bonnes adresses : "Yard" pour une cuisine moderne, ou "Bonvivant" pour un brunch le week-end. Bon appétit et bon séjour !',
  ],
  '6': [
    '¡Hola Carlos! Sí, hay toallas extra en el armario del baño, segundo estante. ¡Que disfrute su estancia!',
    '¡Buenos días Carlos! Las toallas adicionales están en el armario blanco del pasillo. ¡No dude en pedirme si necesita algo más!',
    '¡Hola! Encontrará toallas de repuesto bajo el lavabo del baño. Cualquier cosa que necesite, estoy a su disposición. ¡Buen viaje!',
  ],
}

// ─── Groupes dans la sidebar ───────────────────────────────────────────────────

const GROUPS: { label: string; channels: ChannelId[] }[] = [
  { label: 'Plateformes', channels: ['airbnb', 'booking', 'vrbo'] },
  { label: 'Messagerie directe', channels: ['whatsapp', 'sms', 'email'] },
]

// ─── API Setup panel ───────────────────────────────────────────────────────────

function APISetupPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-dark">Connexion des canaux</h2>
            <p className="text-xs text-muted mt-0.5">Variables d'environnement requises par canal</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-border-light hover:text-dark transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="rounded-xl border border-border bg-bg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ch.bg} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{ch.label[0]}</span>
                  </div>
                  <span className="text-sm font-semibold text-dark">{ch.label}</span>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
                  Non connecté
                </span>
              </div>
              <code className="block text-xs text-muted font-mono bg-surface rounded-lg px-3 py-2 border border-border leading-relaxed">
                {ch.apiKey}
              </code>
              <a href={ch.docsUrl} target="_blank" rel="noopener noreferrer"
                className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${ch.color} hover:underline`}>
                Documentation <ChevronRight size={11} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function InboxUnifie() {
  const [active, setActive]         = useState<Conversation>(CONVERSATIONS[0])
  const [filter, setFilter]         = useState<ChannelId | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [reply, setReply]           = useState('')
  const [aiSuggestion, setAI]       = useState(false)
  const [aiIndex, setAiIndex]       = useState<Record<string, number>>({})
  const [aiLoading, setAiLoading]   = useState(false)
  const [showSetup, setShowSetup]   = useState(false)
  const [sent, setSent]             = useState<string[]>([])

  const visible = CONVERSATIONS.filter(c => {
    if (filter !== 'all' && c.channel !== filter) return false
    if (search && !c.guestName.toLowerCase().includes(search.toLowerCase()) &&
        !c.lastMessage.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalUnread = CONVERSATIONS.reduce((n, c) => n + c.unread, 0)

  const handleSend = () => {
    if (!reply.trim()) return
    setSent(p => [...p, active.id + ':' + reply])
    setReply('')
    setAI(false)
  }

  const getCurrentAI = () => {
    const variants = AI_REPLIES[active.id] ?? []
    const idx = aiIndex[active.id] ?? 0
    return variants[idx % variants.length] ?? ''
  }

  const regenerateAI = () => {
    setAiLoading(true)
    setTimeout(() => {
      setAiIndex(prev => {
        const cur = prev[active.id] ?? 0
        const variants = AI_REPLIES[active.id] ?? []
        return { ...prev, [active.id]: (cur + 1) % Math.max(variants.length, 1) }
      })
      setAiLoading(false)
    }, 600)
  }

  const useAI = () => {
    setReply(getCurrentAI())
    setAI(false)
  }

  return (
    <FeatureGate feature="inboxIA">
      {/* Étire sur toute la hauteur disponible, déborde des paddings de la page */}
      <div className="flex flex-col -mx-3 sm:-mx-6 -my-4 sm:-my-6" style={{ height: 'calc(100dvh - 3.5rem)' }}>

        {/* Banner API */}
        <div className="flex items-center gap-3 px-5 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            <strong>Mode démo</strong> — Branchez vos clés API pour envoyer et recevoir de vrais messages.
          </p>
          <button onClick={() => setShowSetup(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0">
            <Settings size={12} /> Configurer les canaux
          </button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
          <div className="w-72 flex-shrink-0 flex flex-col bg-surface border-r border-border">

            {/* Titre + actions */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold text-dark tracking-tight">Chats</h2>
                {totalUnread > 0 && (
                  <span className="text-xs font-bold bg-primary text-white rounded-full px-1.5 py-0.5 leading-none">
                    {totalUnread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-border-light hover:text-dark transition-colors">
                  <Plus size={17} />
                </button>
                <button onClick={() => setShowSetup(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-border-light hover:text-dark transition-colors">
                  <Settings size={15} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-bg rounded-xl border border-border focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Filtre "Tous" */}
            {filter !== 'all' && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => setFilter('all')}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <X size={11} /> Effacer le filtre
                </button>
              </div>
            )}

            {/* Groupes de conversations */}
            <nav className="flex-1 overflow-y-auto pb-4">
              {GROUPS.map(group => {
                const groupConvs = visible.filter(c => group.channels.includes(c.channel))
                if (groupConvs.length === 0) return null
                return (
                  <div key={group.label} className="mt-2">
                    <p className="px-5 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                      {group.label}
                    </p>
                    {groupConvs.map(conv => {
                      const isActive = active.id === conv.id
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setActive(conv)}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                            isActive ? 'bg-primary/10 dark:bg-primary/15' : 'hover:bg-border-light'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${conv.avatarGradient} flex items-center justify-center`}>
                              <span className="text-white text-sm font-bold">{conv.initials}</span>
                            </div>
                            {/* Canal dot */}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${CHANNEL_DOTS[conv.channel]} border-2 border-surface`} />
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-dark' : 'font-semibold text-dark/80'}`}>
                                {conv.guestName}
                              </span>
                              <span className="text-[10px] text-muted flex-shrink-0">{conv.time}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className={`text-xs truncate ${conv.unread > 0 ? 'text-dark/70 font-medium' : 'text-muted'}`}>
                                {conv.lastMessage}
                              </p>
                              {conv.unread > 0 && (
                                <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                                  {conv.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}

              {visible.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
                  <Search size={28} className="opacity-20" />
                  <p className="text-sm">Aucune conversation</p>
                </div>
              )}
            </nav>
          </div>

          {/* ══ CONVERSATION ═════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 bg-bg">

            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-surface border-b border-border flex-shrink-0">
              {/* Avatar + badge canal superposé */}
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${active.avatarGradient} flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">{active.initials}</span>
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${CHANNEL_DOTS[active.channel]} border-2 border-surface`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-dark">{active.guestName}</span>
                  {/* Pastille canal colorée bien visible */}
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white tracking-wide ${CHANNEL_PILL[active.channel]}`}>
                    <span>{CHANNEL_ICON[active.channel]}</span>
                    {CHANNEL_LABELS[active.channel]}
                  </span>
                </div>
                <p className="text-xs text-muted truncate mt-0.5">
                  {active.property} · Check-in {active.checkIn} · Check-out {active.checkOut}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
              {active.messages.map((msg, i) => {
                const isHost    = msg.from === 'host'
                const prevSame  = i > 0 && active.messages[i - 1].from === msg.from
                const nextSame  = i < active.messages.length - 1 && active.messages[i + 1].from === msg.from

                return (
                  <div key={msg.id} className={`flex ${isHost ? 'justify-end' : 'justify-start'} ${prevSame ? 'mt-0.5' : 'mt-3'}`}>
                    {/* Avatar guest (premier du groupe) */}
                    {!isHost && !prevSame && (
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${active.avatarGradient} flex items-center justify-center flex-shrink-0 mr-2 mt-0.5`}>
                        <span className="text-white text-[10px] font-bold">{active.initials}</span>
                      </div>
                    )}
                    {!isHost && prevSame && <div className="w-9 flex-shrink-0" />}

                    <div className={`flex flex-col ${isHost ? 'items-end' : 'items-start'} max-w-[65%]`}>
                      <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                        isHost
                          ? `bg-primary text-white ${prevSame ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'}`
                          : `bg-surface border border-border text-dark shadow-sm ${prevSame ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'}`
                      }`}>
                        {msg.text}
                      </div>
                      {/* Heure + lu */}
                      {!nextSame && (
                        <div className={`flex items-center gap-1 mt-1 ${isHost ? 'pr-1' : 'pl-1'}`}>
                          <span className="text-[10px] text-muted">{msg.time}</span>
                          {isHost && <CheckCheck size={11} className="text-primary/60" />}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Suggestion IA */}
            {aiSuggestion && (AI_REPLIES[active.id]?.length ?? 0) > 0 && (
              <div className="mx-5 mb-3 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                      <Zap size={11} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Suggestion IA</span>
                  </div>
                  <button onClick={regenerateAI} disabled={aiLoading}
                    className="flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50">
                    {aiLoading
                      ? <><span className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin inline-block" /> Génération…</>
                      : '↺ Régénérer'
                    }
                  </button>
                </div>
                <p className={`text-sm text-dark leading-relaxed mb-3 transition-opacity ${aiLoading ? 'opacity-40' : 'opacity-100'}`}>
                  {getCurrentAI()}
                </p>
                <div className="flex gap-2">
                  <button onClick={useAI} disabled={aiLoading}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                    Utiliser
                  </button>
                  <button onClick={() => setAI(false)}
                    className="py-2 px-4 rounded-xl border border-border text-muted hover:text-dark text-sm transition-colors">
                    Ignorer
                  </button>
                </div>
              </div>
            )}

            {/* Composer */}
            <div className="px-5 pb-5 pt-2 flex-shrink-0">
              <div className="flex items-end gap-2 bg-surface rounded-2xl border border-border px-4 py-3 shadow-sm focus-within:border-primary transition-colors">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={`Répondre à ${active.guestName}…`}
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-dark resize-none focus:outline-none placeholder:text-muted leading-relaxed"
                />
                <div className="flex items-center gap-2 pb-0.5">
                  <button
                    onClick={() => setAI(v => !v)}
                    title="Suggestion IA"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      aiSuggestion
                        ? 'bg-purple-600 text-white'
                        : 'text-muted hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                    }`}
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim()}
                    className="w-8 h-8 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted text-center mt-2">
                Mode démo · Connectez vos APIs pour envoyer de vrais messages
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSetup && <APISetupPanel onClose={() => setShowSetup(false)} />}
    </FeatureGate>
  )
}
