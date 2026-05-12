import React from 'react'
import {
  BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate,
} from 'react-router-dom'
import { Home, Calendar } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import MissionsToday from './pages/MissionsToday'
import MissionDetail from './pages/MissionDetail'
import Planning from './pages/Planning'
import PendingApproval from './pages/PendingApproval'
import './index.css'

// ── Barre de navigation basse ─────────────────────────────────────────────────

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around h-14">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <Home size={20} />
          <span className="text-[10px] font-medium">Missions</span>
        </NavLink>
        <NavLink
          to="/planning"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <Calendar size={20} />
          <span className="text-[10px] font-medium">Planning</span>
        </NavLink>
      </div>
    </nav>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Layout protégé (agents approuvés) ────────────────────────────────────────

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-14">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

// ── Routeur principal ─────────────────────────────────────────────────────────

function AppRoutes() {
  const { user, agent, loading, agentLoading } = useAuth()

  // Attendre la résolution de l'auth et du profil agent
  if (loading || (user && agentLoading)) return <Spinner />

  // ── Utilisateur non connecté ──
  if (!user) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // ── Connecté mais pas encore de profil agent (registration incomplète) ──
  if (!agent) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Navigate to="/register" replace />} />
      </Routes>
    )
  }

  // ── Demande en attente ou refusée ──
  if (agent.status === 'pending' || agent.status === 'declined') {
    return <PendingApproval />
  }

  // ── Agent approuvé — application complète ──
  return (
    <Routes>
      <Route path="/login"    element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index                       element={<MissionsToday />} />
        <Route path="/missions/:id"        element={<MissionDetail />} />
        <Route path="/planning"            element={<Planning />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
