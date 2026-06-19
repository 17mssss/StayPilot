import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../contexts/DemoContext'

// Durée de la démo : 48h
const DEMO_DURATION_MS = 48 * 60 * 60 * 1000

export default function Demo() {
  const navigate = useNavigate()
  const { isDemo, startDemo } = useDemo()

  useEffect(() => {
    if (isDemo) {
      // Déjà en mode démo → aller au tableau de bord
      navigate('/', { replace: true })
      return
    }

    // Activer le mode démo
    const expiresAt = Date.now() + DEMO_DURATION_MS
    startDemo('owner_demo_local', expiresAt)
    navigate('/', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
