import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { supabase } from './supabase'
import { getOwnerDemoMockData } from './ownerDemoMocks'

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Demo mode helpers ────────────────────────────────────────────────────────
function isDemoActive(): boolean {
  try {
    const token = localStorage.getItem('owner_demo_token')
    const exp = parseInt(localStorage.getItem('owner_demo_expires') ?? '0', 10)
    return !!(token && exp && Date.now() < exp)
  } catch {
    return false
  }
}

// Intercepte toutes les requêtes en mode démo et retourne des données fictives
async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = config.url ?? ''
  const mockData = getOwnerDemoMockData(url)

  await new Promise((r) => setTimeout(r, 80))

  return {
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data: { success: true, data: mockData },
  }
}

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    // Mode démo : court-circuiter avec l'adaptateur fictif
    if (isDemoActive()) {
      config.adapter = demoAdapter
      return config
    }

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // no session, proceed without token
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ─────────────────────────────────────────────────────
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
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
