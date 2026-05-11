import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PlanProvider, usePlan } from './contexts/PlanContext'
import type { PlanConfig } from './contexts/PlanContext'
import OnboardingTour from './components/OnboardingTour'
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
      { name: 'Livrets QR',       path: '/livrets',  icon: BookOpen  },
      { name: 'Pricing dynamique',path: '/pricing',  icon: TrendingUp},
      { name: 'CRM Voyageurs',    path: '/crm',      icon: Users2    },
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
  '/proprietaires':             'Propriétaires',
  '/messages-proprietaires':    'Messages propriétaires',
  '/facturation/nouvelle':      'Générer une facture',
  '/facturation/historique':    'Historique des factures',
  '/avis':                      'Avis voyageurs',
  '/livrets':                   'Livrets d\'accueil QR',
  '/pricing':                   'Pricing dynamique',
  '/maintenances':              'Maintenances',
  '/crm':                       'CRM Voyageurs',
  '/parametres':                'Paramètres',
  '/simulation':                'Simulation',
  '/abonnement':                'Abonnement',
  '/inbox':                     'Inbox Unifié',
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────
const mobileNavItems = [
  { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
  { name: 'Réservations', path: '/reservations', icon: Calendar },
  { name: 'Messages',     path: '/messages',     icon: MessageSquare },
  { name: 'Ménage',       path: '/menage',       icon: Sparkles },
  { name: 'Plus',         path: null,            icon: Menu },
] as const

function MobileNav() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-fit">
            <Sidebar onClose={() => setSidebarOpen(false)} />
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
}: {
  item: NavItem
  onClose?: () => void
  factOpen: boolean
  setFactOpen: (v: boolean) => void
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
    </NavLink>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { logout } = useAuth()
  const { plan, planId } = usePlan()
  const navigate = useNavigate()
  const location = useLocation()
  const [factOpen, setFactOpen] = useState(location.pathname.startsWith('/facturation'))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Abonnement + Paramètres + Logout */}
      <div className="px-2 py-3 border-t border-border flex-shrink-0 space-y-0.5">
        {/* Plan pill — cliquable */}
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

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-dark hover:bg-border-light transition-colors"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
function Layout() {
  const { user, loading } = useAuth()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme-admin')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const location = useLocation()

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme-admin', dark ? 'dark' : 'light')
  }, [dark])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const title = titleMap[location.pathname] ?? 'StayPilot'

  return (
    <div className="flex bg-bg overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — minimal Apple/Claude style, hauteur identique à la sidebar */}
        <header className="flex items-center h-14 px-4 sm:px-6 bg-surface border-b border-border flex-shrink-0 z-40">
          <h1 className="text-sm font-semibold text-dark flex-1 truncate tracking-tight">{title}</h1>
          <button
            onClick={() => setDark(d => !d)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        {/* Page content — seul élément qui défile */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-3 sm:px-6 py-4 sm:py-6 page-content">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Tour d'onboarding */}
      <OnboardingTour />
    </div>
  )
}

// ── App routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

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
      <PlanProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PlanProvider>
    </AuthProvider>
  )
}
