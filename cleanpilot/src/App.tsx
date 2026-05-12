import React from 'react'
import {
  BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate,
} from 'react-router-dom'
import { Home, Calendar, User, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MissionsToday from './pages/MissionsToday'
import MissionDetail from './pages/MissionDetail'
import Planning from './pages/Planning'
import './index.css'

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around h-14">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 transition-colors ${
              isActive ? 'text-brand' : 'text-muted'
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
              isActive ? 'text-brand' : 'text-muted'
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

function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-14">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Layout />}>
        <Route index element={<MissionsToday />} />
        <Route path="/missions/:id" element={<MissionDetail />} />
        <Route path="/planning" element={<Planning />} />
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
