import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Home,
  MessageSquare,
  Sparkles,
  Users,
  Receipt,
  Star,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Sun,
  Moon,
  CalendarDays,
  Crown,
  BookOpen,
  TrendingUp,
  Users2,
  Wrench,
  Zap,
  Rss,
  FileText,
  Bell,
  CheckCheck,
  BrushIcon,
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DemoProvider, useDemo } from './contexts/DemoContext'
import { PlanProvider, usePlan } from './contexts/PlanContext'
import type { PlanConfig } from './contexts/PlanContext'
import OnboardingTour from './components/OnboardingTour'
import OnboardingWizard from './components/OnboardingWizard'
import DemoBanner from './components/DemoBanner'
import DemoUpgradeModal from './components/DemoUpgradeModal'
import PlanBadge from './components/PlanBadge'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Logements from './pages/Logements'
import Reservations from './pages/Reservations'
import Messages from './pages/Messages'
import Templates from './pages/Templates'
import Simulation from './pages/Simulation'
import Menage from './pages/Menage'
import Proprietaires from './pages/Proprietaires'
import FacturationNouvelle from './pages/FacturationNouvelle'
import FacturationHistorique from './pages/FacturationHistorique'
import Avis from './pages/Avis'
import Parametres from './pages/Parametres'
import Calendrier from './pages/Calendrier'
import MessagesProprietaires from './pages/MessagesProprietaires'
import Abonnement from './pages/Abonnement'
import Livrets from './pages/Livrets'
import PricingDynamique from './pages/PricingDynamique'
import CRMVoyageurs from './pages/CRMVoyageurs'
import Maintenances from './pages/Maintenances'
import InboxUnifie from './pages/InboxUnifie'
import ChannelManager from './pages/ChannelManager'
import Investisseurs from './pages/Investisseurs'
import PortailInvestisseur from './pages/PortailInvestisseur'
import EquipeMenage from './pages/EquipeMenage'
import ExportFEC from './pages/ExportFEC'
import Demo from './pages/Demo'
import Portal from './pages/Portal'

// ── Toast notification ────────────────────────────────────────────────────────
function AgentToast({ name, onClose }: { name: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex items-center gap-3 bg-surface border border-border rounded-xl shadow-lg px-4 py-3 animate-slide-in"
      style={{ animation: 'slideInRight 0.3s ease' }}
    >
      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
        <Users2 size={15} className="text-orange-500" />
      </div>
      <div>
        <p className="text-xs font-semibold text-dark">Nouvelle demande d'accès</p>
        <p className="text-xs text-muted">{name} souhaite rejoindre votre équipe</p>
      </div>
      <button onClick={onClose} className="ml-2 text-muted hover:text-dark">
        <X size={13} />
      </button>
      {/* Barre de progression */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-orange-200 overflow-hidden">
        <div className="h-full bg-orange-400" style={{ animation: 'shrink 5s linear forwards' }} />
      </div>
    </div>
  )
}

// ── Polling des agents en attente ─────────────────────────────────────────────
function usePendingAgents(userId: string | null, jwt: string | null = null) {
  const [count, setCount] = useState(0)
  const [toasts, setToasts] = useState<{ id: number; name: string }[]>()
  const prevCountRef = useRef<number | null>(null)
  const lastNamesRef = useRef<string[]>([])
  const toastId = useRef(0)

  const poll = useCallback(async () => {
    if (!userId) return
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const bearer = jwt ?? SUPABASE_KEY
    try {
      // Trouver le concierge_id pour ce user
      const cpRes = await fetch(
        `${SUPABASE_URL}/rest/v1/concierge_profiles?select=id&user_id=eq.${userId}&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer}` } }
      )
      const cpRows = await cpRes.json()
      if (!cpRes.ok || !Array.isArray(cpRows) || cpRows.length === 0) return
      const conciergeId = cpRows[0].id

      // Compter les agents en attente
      const agRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cleaning_agents?select=id,full_name&concierge_id=eq.${conciergeId}&status=eq.pending`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer}`, Prefer: 'count=exact' } }
      )
      const agRows = await agRes.json()
      if (!agRes.ok || !Array.isArray(agRows)) return
      const newCount = agRows.length
      const newNames = agRows.map((r: { full_name: string }) => r.full_name)

      setCount(newCount)

      // Détecter les nouveaux agents (par rapport au dernier poll)
      if (prevCountRef.current !== null && newCount > prevCountRef.current) {
        const prev = lastNamesRef.current
        const added = newNames.filter((n: string) => !prev.includes(n))
        added.forEach((name: string) => {
          const id = ++toastId.current
          setToasts(ts => [...(ts ?? []), { id, name }])
        })
      }

      prevCountRef.current = newCount
      lastNamesRef.current = newNames
    } catch {
      // silencieux
    }
  }, [userId, jwt])

  useEffect(() => {
    if (!userId) return
    poll()
    const interval = setInterval(poll, 20000) // toutes les 20s
    return () => clearInterval(interval)
  }, [poll, userId])

  const dismissToast = useCallback((id: number) => {
    setToasts(ts => (ts ?? []).filter(t => t.id !== id))
  }, [])

  return { count, toasts: toasts ?? [], dismissToast }
}

// ── Notifs missions CleanPilot ────────────────────────────────────────────────
interface CleaningNotif {
  id: string
  title: string
  body: string | null
  agent_name: string | null
  logement_name: string | null
  is_read: boolean
  created_at: string
}

function useCleaningNotifications(userId: string | null, jwt: string | null = null) {
  const [notifs, setNotifs]   = useState<CleaningNotif[]>([])
  const [unread, setUnread]   = useState(0)
  const conciergeIdRef        = useRef<string | null>(null)

  const poll = useCallback(async () => {
    if (!userId) return
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const bearer  = jwt ?? SUPABASE_KEY
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer}` }

    try {
      // Résoudre le concierge_id (une seule fois)
      if (!conciergeIdRef.current) {
        const cpRes = await fetch(
          `${SUPABASE_URL}/rest/v1/concierge_profiles?select=id&user_id=eq.${userId}&limit=1`,
          { headers }
        )
        const cpRows = await cpRes.json()
        if (!cpRes.ok || !Array.isArray(cpRows) || cpRows.length === 0) return
        conciergeIdRef.current = cpRows[0].id
      }

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/concierge_notifications?select=*&concierge_id=eq.${conciergeIdRef.current}&order=created_at.desc&limit=20`,
        { headers }
      )
      const rows: CleaningNotif[] = await res.json()
      if (!res.ok || !Array.isArray(rows)) return
      setNotifs(rows)
      setUnread(rows.filter(n => !n.is_read).length)
    } catch { /* silencieux */ }
  }, [userId, jwt])

  useEffect(() => {
    if (!userId) return
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [poll, userId])

  const markAllRead = useCallback(async () => {
    if (!conciergeIdRef.current) return
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const bearer  = jwt ?? SUPABASE_KEY
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/concierge_notifications?concierge_id=eq.${conciergeIdRef.current}&is_read=eq.false`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ is_read: true }),
        }
      )
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch { /* silencieux */ }
  }, [jwt])

  return { notifs, unread, markAllRead, refetch: poll }
}

// ── Panneau de notifications ──────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function NotifDropdown({
  notifs,
  unread,
  onMarkAll,
  onClose,
}: {
  notifs: CleaningNotif[]
  unread: number
  onMarkAll: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-lg z-[9999] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-dark">
          Notifications
          {unread > 0 && (
            <span className="ml-2 text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
              {unread}
            </span>
          )}
        </p>
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium"
          >
            <CheckCheck size={13} /> Tout lire
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="max-h-72 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted">
            <Bell size={28} className="opacity-30" />
            <p className="text-xs">Aucune notification</p>
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 ${
                n.is_read ? 'opacity-60' : 'bg-primary/5'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BrushIcon size={14} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-dark">{n.title}</p>
                {n.body && <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>}
                <p className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Navigation config ─────────────────────────────────────────────────────────
// Sections épurées — 4 groupes logiques
type NavItem = {
  name: string
  path: string
  icon: React.ElementType
  tour?: string | null
  subNav?: { name: string; path: string }[]
}
type NavSection = {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    // Section principale — pas de label
    items: [
      { name: 'Dashboard',    path: '/',            icon: LayoutDashboard, tour: 'nav-dashboard'   },
      { name: 'Réservations', path: '/reservations',icon: Calendar,        tour: 'nav-reservations'},
      { name: 'Calendrier',   path: '/calendrier',  icon: CalendarDays                             },
      { name: 'Logements',    path: '/logements',   icon: Home,            tour: 'nav-logements'   },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { name: 'Propriétaires', path: '/proprietaires', icon: Users, tour: 'nav-proprietaires' },
      { name: 'Ménage',        path: '/menage',         icon: Sparkles                         },
      { name: 'Équipe ménage', path: '/equipe-menage',  icon: Users2                           },
      { name: 'Maintenances',  path: '/maintenances',   icon: Wrench                           },
      {
        name: 'Facturation',
        path: '/facturation',
        icon: Receipt,
        tour: 'nav-facturation',
        subNav: [
          { name: 'Générer',    path: '/facturation/nouvelle'   },
          { name: 'Historique', path: '/facturation/historique' },
        ],
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: 'Messagerie IA', path: '/messages', icon: MessageSquare, tour: 'nav-messages' },
      { name: 'Inbox Unifié',  path: '/inbox',    icon: Zap                                 },
      { name: 'Avis',          path: '/avis',     icon: Star                                },
    ],
  },
  {
    label: 'Automatisation',
    items: [
      { name: 'Channel Manager',  path: '/channels', icon: Rss       },
      { name: 'Livrets QR',       path: '/livrets',  icon: BookOpen  },
      { name: 'Pricing dynamique',path: '/pricing',  icon: TrendingUp},
      { name: 'CRM Voyageurs',    path: '/crm',      icon: Users2    },
    ],
  },
  {
    label: 'Enterprise',
    items: [
      { name: 'Portail Investisseur', path: '/investisseurs', icon: TrendingUp },
      { name: 'Export FEC',           path: '/export-fec',    icon: FileText   },
    ],
  },
]

// Flat list for titleMap / compat
const navigation = navSections.flatMap(s => s.items)

const titleMap: Record<string, string> = {
  '/':                          'Dashboard',
  '/reservations':              'Réservations',
  '/calendrier':                'Calendrier',
  '/logements':                 'Logements',
  '/messages':                  'Messagerie IA',
  '/menage':                    'Ménage',
  '/equipe-menage':             'Équipe ménage',
  '/proprietaires':             'Propriétaires',
  '/messages-proprietaires':    'Messages propriétaires',
  '/facturation/nouvelle':      'Générer une facture',
  '/facturation/historique':    'Historique des factures',
  '/avis':                      'Avis voyageurs',
  '/channels':                  'Channel Manager',
  '/livrets':                   'Livrets d\'accueil QR',
  '/pricing':                   'Pricing dynamique',
  '/maintenances':              'Maintenances',
  '/crm':                       'CRM Voyageurs',
  '/parametres':                'Paramètres',
  '/simulation':                'Simulation',
  '/abonnement':                'Abonnement',
  '/inbox':                     'Inbox Unifié',
  '/investisseurs':             'Portail Investisseur',
  '/export-fec':                'Export FEC',
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────
const mobileNavItems = [
  { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
  { name: 'Réservations', path: '/reservations', icon: Calendar },
  { name: 'Messages',     path: '/messages',     icon: MessageSquare },
  { name: 'Ménage',       path: '/menage',       icon: Sparkles },
  { name: 'Plus',         path: null,            icon: Menu },
] as const

function MobileNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-fit">
            <Sidebar onClose={() => setSidebarOpen(false)} pendingCount={pendingCount} />
          </div>
        </div>
      )}
      {/* Barre de navigation mobile — GPU-composited, jamais de tremblement */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border lg:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: 'translateZ(0)',       /* force GPU layer */
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <div className="flex items-stretch" style={{ height: '56px' }}>
          {mobileNavItems.map((item) => {
            if (item.path === null) {
              return (
                <button
                  key="more"
                  onClick={() => setSidebarOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted active:opacity-60 transition-opacity min-w-0"
                  style={{ height: '56px' }}
                >
                  <item.icon size={22} />
                  <span className="text-[10px] font-medium mt-0.5">Plus</span>
                </button>
              )
            }
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity min-w-0"
                style={{ height: '56px' }}
              >
                <item.icon size={22} className={isActive ? 'text-primary' : 'text-muted'} />
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-primary' : 'text-muted'}`}>
                  {item.name}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const PRO_FEATURES: Record<string, keyof PlanConfig['limits']> = {
  '/livrets':      'livretQR',
  '/pricing':      'pricingDynamique',
  '/maintenances': 'maintenance',
  '/crm':          'crmVoyageurs',
  '/inbox':        'inboxIA',
}

function SidebarNavItem({
  item,
  onClose,
  factOpen,
  setFactOpen,
  badgeCount = 0,
}: {
  item: NavItem
  onClose?: () => void
  factOpen: boolean
  setFactOpen: (v: boolean) => void
  badgeCount?: number
}) {
  const { canUse } = usePlan()
  const location = useLocation()
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path)

  const proLocked = PRO_FEATURES[item.path] && !canUse(PRO_FEATURES[item.path]!)

  if (item.subNav) {
    return (
      <div>
        <button
          data-tour={item.tour ?? undefined}
          onClick={() => setFactOpen(!factOpen)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-border-light hover:text-dark'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <item.icon size={15} />
            {item.name}
          </div>
          {factOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {factOpen && (
          <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.subNav.map((sub) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `block px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted hover:text-dark'
                  }`
                }
              >
                {sub.name}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onClose}
      data-tour={item.tour ?? undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
          isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-border-light hover:text-dark'
        }`
      }
    >
      <item.icon size={15} className="flex-shrink-0" />
      <span className="flex-1 truncate">{item.name}</span>
      {proLocked && (
        <span className="text-[9px] font-semibold bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
          Pro
        </span>
      )}
      {badgeCount > 0 && (
        <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </NavLink>
  )
}

function Sidebar({ onClose, pendingCount = 0 }: { onClose?: () => void; pendingCount?: number }) {
  const { logout } = useAuth()
  const { plan, planId } = usePlan()
  const { isDemo, exitDemo, triggerUpgrade } = useDemo()
  const navigate = useNavigate()
  const location = useLocation()
  const [factOpen, setFactOpen] = useState(location.pathname.startsWith('/facturation'))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleExitDemo = () => {
    exitDemo()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex flex-col h-full w-52 lg:w-48 bg-surface border-r border-border">

      {/* Logo + close */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
        <img src="/logo.png" alt="StayPilot" className="w-24 h-auto" />
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-muted hover:text-dark lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  item={item}
                  onClose={onClose}
                  factOpen={factOpen}
                  setFactOpen={setFactOpen}
                  badgeCount={item.path === '/equipe-menage' ? pendingCount : 0}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Abonnement + Paramètres + Logout */}
      <div className="px-2 py-3 border-t border-border flex-shrink-0 space-y-0.5">
        {/* Plan pill — cliquable (ou upgrade en démo) */}
        {isDemo ? (
          <button
            onClick={triggerUpgrade}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-border-light hover:text-dark transition-colors w-full"
          >
            <Crown size={15} className="flex-shrink-0 text-violet-500" />
            <span className="flex-1 truncate">Abonnement</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-violet-100 text-violet-700">
              Démo
            </span>
          </button>
        ) : (
          <NavLink
            to="/abonnement"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-border-light hover:text-dark'
              }`
            }
          >
            {planId === 'business' ? (
              <Crown size={15} className="flex-shrink-0 text-purple-500" />
            ) : planId === 'pro' ? (
              <Zap size={15} className="flex-shrink-0 text-orange-500" />
            ) : (
              <Crown size={15} className="flex-shrink-0" />
            )}
            <span className="flex-1 truncate">Abonnement</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${plan.color} ${plan.textColor}`}>
              {plan.name}
            </span>
          </NavLink>
        )}

        <NavLink
          to="/parametres"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-border-light hover:text-dark'
            }`
          }
        >
          <Settings size={15} />
          Paramètres
        </NavLink>

        {isDemo ? (
          <>
            <button
              onClick={triggerUpgrade}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:opacity-90 transition-opacity"
            >
              <Sparkles size={15} />
              Passer au Pro
            </button>
            <button
              onClick={handleExitDemo}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-dark hover:bg-border-light transition-colors"
            >
              <LogOut size={13} />
              Quitter la démo
            </button>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-dark hover:bg-border-light transition-colors"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        )}
      </div>
    </aside>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
function Layout() {
  const { user, session, loading } = useAuth()
  const { isDemo, triggerUpgrade } = useDemo()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme-admin')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  // En mode démo, pas de polling Supabase (pas de session réelle)
  const { count: pendingCount, toasts, dismissToast } = usePendingAgents(isDemo ? null : (user?.id ?? null), session?.access_token ?? null)
  const { notifs, unread, markAllRead } = useCleaningNotifications(isDemo ? null : (user?.id ?? null), session?.access_token ?? null)

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme-admin', dark ? 'dark' : 'light')
  }, [dark])

  // Écouter les événements demo:upgrade déclenchés par api.ts (403 demo)
  React.useEffect(() => {
    if (!isDemo) return
    const handler = () => triggerUpgrade()
    window.addEventListener('demo:upgrade', handler)
    return () => window.removeEventListener('demo:upgrade', handler)
  }, [isDemo, triggerUpgrade])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user && !isDemo) return <Navigate to="/login" replace />

  const title = titleMap[location.pathname] ?? 'StayPilot'

  return (
    <div className="flex bg-bg overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar pendingCount={pendingCount} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Bannière démo */}
        <DemoBanner />

        {/* Header */}
        <header className="flex items-center h-14 px-4 sm:px-6 bg-surface border-b border-border flex-shrink-0 z-40">
          <h1 className="text-sm font-semibold text-dark flex-1 truncate tracking-tight">{title}</h1>

          {/* Cloche de notifications CleanPilot */}
          <div className="relative mr-1">
            <button
              onClick={() => {
                const opening = !notifOpen
                setNotifOpen(opening)
                if (opening && unread > 0) markAllRead()
              }}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors"
            >
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotifDropdown
                notifs={notifs}
                unread={unread}
                onMarkAll={markAllRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          <button
            onClick={() => setDark(d => !d)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-3 sm:px-6 py-4 sm:py-6 page-content">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav pendingCount={pendingCount} />

      {/* Tour d'onboarding (guide interface) */}
      <OnboardingTour />

      {/* Wizard de démarrage (premier login sans logement) */}
      <OnboardingWizard />

      {/* Modale upgrade démo */}
      <DemoUpgradeModal />

      {/* Toast notifications agents en attente */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <AgentToast name={t.name} onClose={() => dismissToast(t.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── App routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth()
  const { isDemo } = useDemo()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login"    element={(user || isDemo) ? <Navigate to="/portal" replace /> : <Login />} />
      <Route path="/register" element={(user || isDemo) ? <Navigate to="/portal" replace /> : <Register />} />
      <Route path="/demo"     element={<Demo />} />
      <Route path="/portail/:token" element={<PortailInvestisseur />} />
      <Route path="/portal" element={(user || isDemo) ? <Portal /> : <Navigate to="/login" replace />} />

      <Route element={<Layout />}>
        <Route path="/"                        element={<Dashboard />} />
        <Route path="/reservations"            element={<Reservations />} />
        <Route path="/calendrier"              element={<Calendrier />} />
        <Route path="/logements"               element={<Logements />} />
        <Route path="/messages"                element={<Messages />} />
        <Route path="/menage"                  element={<Menage />} />
        <Route path="/proprietaires"           element={<Proprietaires />} />
        <Route path="/facturation"             element={<Navigate to="/facturation/nouvelle" replace />} />
        <Route path="/facturation/nouvelle"    element={<FacturationNouvelle />} />
        <Route path="/facturation/historique"  element={<FacturationHistorique />} />
        <Route path="/avis"                    element={<Avis />} />
        <Route path="/channels"                element={<ChannelManager />} />
        <Route path="/livrets"                 element={<Livrets />} />
        <Route path="/pricing"                 element={<PricingDynamique />} />
        <Route path="/maintenances"            element={<Maintenances />} />
        <Route path="/crm"                     element={<CRMVoyageurs />} />
        <Route path="/inbox"                   element={<InboxUnifie />} />
        <Route path="/messages-proprietaires"  element={<MessagesProprietaires />} />
        <Route path="/parametres"              element={<Parametres />} />
        <Route path="/simulation"              element={<Simulation />} />
        <Route path="/templates"               element={<Templates />} />
        <Route path="/abonnement"              element={<Abonnement />} />
        <Route path="/investisseurs"           element={<Investisseurs />} />
        <Route path="/equipe-menage"           element={<EquipeMenage />} />
        <Route path="/export-fec"              element={<ExportFEC />} />
        <Route path="/factures"                element={<Navigate to="/facturation/historique" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <PlanProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PlanProvider>
      </DemoProvider>
    </AuthProvider>
  )
}
