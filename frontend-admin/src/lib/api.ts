import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { supabase } from './supabase'
import { getDemoMockData } from './demoMocks'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Helpers démo ──────────────────────────────────────────────────────────────
const DEMO_TOKEN_KEY   = 'staypilot_demo_token'
const DEMO_EXPIRES_KEY = 'staypilot_demo_expires'

function getDemoToken(): string | null {
  const token   = localStorage.getItem(DEMO_TOKEN_KEY)
  const expires = localStorage.getItem(DEMO_EXPIRES_KEY)
  if (!token || !expires) return null
  if (Date.now() >= parseInt(expires, 10)) return null
  return token
}

// ── Adapter mock pour la démo (sans appel réseau) ─────────────────────────────
function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const path   = (config.url || '').replace(/^\/api/, '')
  const method = (config.method || 'get').toLowerCase()

  // Bloquer les écritures
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const err: { response: AxiosResponse; message: string } = {
      message: 'Action non disponible en mode démo',
      response: {
        data: { success: false, demo: true, error: 'Action non disponible en mode démo' },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      } as AxiosResponse,
    }
    return Promise.reject(err)
  }

  // Retourner les données mock
  const mockData = getDemoMockData(path)
  return Promise.resolve({
    data: { success: true, data: mockData },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  } as AxiosResponse)
}

// ── Intercepteur request ──────────────────────────────────────────────────────
// Si un token démo valide existe, utiliser l'adapter mock directement.
api.interceptors.request.use(async (config) => {
  const demoToken = getDemoToken()
  if (demoToken) {
    // Remplacer l'adapter par le mock — aucun appel réseau
    config.adapter = demoAdapter
    return config
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  // Si le body est FormData, supprimer le Content-Type par défaut
  // pour laisser axios générer automatiquement le bon multipart/form-data avec boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// ── Intercepteur response ─────────────────────────────────────────────────────
// Unwrap { success: true, data: ... } responses automatically
api.interceptors.response.use(
  (response) => {
    if (
      response.config.responseType !== 'blob' &&
      response.data !== null &&
      typeof response.data === 'object' &&
      response.data.success === true &&
      'data' in response.data
    ) {
      return { ...response, data: response.data.data }
    }
    return response
  },
  (error) => {
    // 403 avec flag demo=true → action bloquée en mode démo → ouvrir la modale upgrade
    if (error.response?.status === 403 && error.response?.data?.demo === true) {
      window.dispatchEvent(new CustomEvent('demo:upgrade'))
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
