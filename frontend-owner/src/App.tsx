import React, { useState, useEffect } from 'react'
import {
  BrowserRouter, Routes, Route, Navigate, NavLink,
  useNavigate, useLocation, Outlet,
} from 'react-router-dom'
import {
  LayoutDashboard, Calendar, TrendingUp, FileText,
  FolderOpen, User, LogOut, Menu, X, Bell, Home, Sun, Moon,
  MessageSquare, BarChart2,
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import api from './lib/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Revenus from './pages/Revenus'
import Factures from './pages/Factures'
import Logements from './pages/Logements'
import Documents from './pages/Documents'
import Profil from './pages/Profil'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import Releves from './pages/Releves'
import LogementDetail from './pages/LogementDetail'

const NAV_ITEMS = [
  { to: '/',               label: 'Mon tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/reservations',   label: 'Mes réservations',    icon: Calendar },
  { to: '/revenus',        label: 'Mes revenus',         icon: TrendingUp },
  { to: '/factures',       label: 'Mes factures',        icon: FileText },
  { to: '/logements',      label: 'Mes logements',       icon: Home },
  { to: '/documents',      label: 'Mes documents',       icon: FolderOpen },
  { to: '/releves',        label: 'Mes relevés',         icon: BarChart2 },
  { to: '/notifications',  label: 'Notifications',       icon: Bell },
  { to: '/messages',       label: 'Messages',            icon: MessageSquare },
  { to: '/profil',         label: 'Mon profil',          icon: User },
]

const TITLE_MAP: Record<string, string> = {
  '/':               'Tableau de bord',
  '/reservations':   'Mes réservations',
  '/revenus':        'Mes revenus',
  '/factures':       'Mes factures',
  '/logements':      'Mes logements',
  '/documents':      'Mes documents',
  '/releves':        'Mes relevés',
  '/notifications':  'Notifications',
  '/messages':       'Messages',
  '/profil':         'Mon profil',
}

function Sidebar({ onClose, unreadNotifs, unreadMessages }: {
  onClose?: () => void
  unreadNotifs: number
  unreadMessages: number
}) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const badgeFor = (to: string) => {
    if (to === '/notifications') return unreadNotifs
    if (to === '/messages') return unreadMessages
    return 0
  }

  return (
    <aside className="flex flex-col h-full w-48 bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-3 border-b border-border flex-shrink-0">
        <div className="flex items-center w-full">
          <img src="/logo.png" alt="StayPilot" className="w-36 h-auto" />
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-dark lg:hidden"><X size={18} /></button>
        )}
      </div>

      {/* Owner label */}
      <div className="px-4 py-3 border-b border-border-light">
        <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-0.5">Espace propriétaire</p>
        <p className="text-xs font-medium text-dark truncate">{user?.email ?? 'Propriétaire'}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
          const badge = badgeFor(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-muted hover:bg-border-light hover:text-dark'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-border flex-shrink-0">
        <button
          onClick={async () => { await logout(); navigate('/login') }}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-dark hover:bg-border-light transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

function Layout() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Poll unread counts every 60s
  useEffect(() => {
    if (!user) return

    const fetchCounts = () => {
      api.get<{ count: number }>('/api/notifications/count')
        .then((r) => setUnreadNotifs(r.data?.count ?? 0))
        .catch(() => {})
      api.get<{ count: number }>('/api/owner-messages/unread-count', {
        params: { direction: 'admin_to_owner' },
      })
        .then((r) => setUnreadMessages(r.data?.count ?? 0))
        .catch(() => {})
    }

    fetchCounts()
    const timer = setInterval(fetchCounts, 60_000)
    return () => clearInterval(timer)
  }, [user])

  // Reset badge when navigating to those pages
  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadNotifs(0)
    if (location.pathname === '/messages') setUnreadMessages(0)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const title = TITLE_MAP[location.pathname] ?? 'StayPilot'
  const totalBadge = unreadNotifs + unreadMessages

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar unreadNotifs={unreadNotifs} unreadMessages={unreadMessages} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} unreadNotifs={unreadNotifs} unreadMessages={unreadMessages} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center h-16 px-4 sm:px-6 bg-surface border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="mr-3 text-muted hover:text-dark lg:hidden">
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold text-dark flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(d => !d)}
              className="w-9 h-9 rounded-lg bg-bg border border-border flex items-center justify-center text-muted hover:text-dark transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Bell with badge */}
            <NavLink to="/notifications"
              className="relative w-9 h-9 rounded-lg bg-bg border border-border flex items-center justify-center text-muted hover:text-dark transition-colors">
              <Bell size={16} />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
                  {totalBadge > 99 ? '99+' : totalBadge}
                </span>
              )}
            </NavLink>
            <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.email?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-xs font-semibold text-dark truncate max-w-[120px]">{user.email}</span>
                <span className="text-[10px] text-muted">Propriétaire</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/revenus" element={<Revenus />} />
        <Route path="/factures" element={<Factures />} />
        <Route path="/logements" element={<Logements />} />
        <Route path="/logements/:id" element={<LogementDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/releves" element={<Releves />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profil" element={<Profil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
