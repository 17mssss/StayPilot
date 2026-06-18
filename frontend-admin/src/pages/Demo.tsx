/**
 * Demo.tsx — Page d'entrée démo (/demo)
 *
 * Active le mode démo localement (sans appel backend) :
 * - Stocke un token démo fictif dans localStorage via DemoContext
 * - Redirige vers le Dashboard (/)
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../contexts/DemoContext'

export default function Demo() {
  const navigate  = useNavigate()
  const { isDemo, startDemo } = useDemo()

  useEffect(() => {
    // Si déjà en mode démo → rediriger directement
    if (isDemo) {
      navigate('/', { replace: true })
      return
    }
    // Activer le mode démo localement — aucun appel réseau
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000 // 48h
    startDemo('local_demo_token', expiresAt)
    navigate('/', { replace: true })
  }, [])

  return null
}
