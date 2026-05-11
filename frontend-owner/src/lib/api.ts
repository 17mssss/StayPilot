import axios from 'axios'
import { supabase } from './supabase'

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Supabase JWT token
api.interceptors.request.use(
  async (config) => {
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

// Response interceptor: unwrap { success, data } + handle 401
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
