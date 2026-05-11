import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const avatars = [
  { id: 'femme-blanche',    label: 'Femme',   src: new URL('../assets/avatars/femme-blanche.svg',    import.meta.url).href },
  { id: 'homme-blanc',      label: 'Homme',   src: new URL('../assets/avatars/homme-blanc.svg',      import.meta.url).href },
  { id: 'femme-noire',      label: 'Femme',   src: new URL('../assets/avatars/femme-noire.svg',      import.meta.url).href },
  { id: 'homme-noir',       label: 'Homme',   src: new URL('../assets/avatars/homme-noir.svg',       import.meta.url).href },
  { id: 'femme-asiatique',  label: 'Femme',   src: new URL('../assets/avatars/femme-asiatique.svg',  import.meta.url).href },
  { id: 'homme-asiatique',  label: 'Homme',   src: new URL('../assets/avatars/homme-asiatique.svg',  import.meta.url).href },
]

const STORAGE_KEY = 'staypilot_avatar'

export default function AvatarPicker() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'homme-blanc'
  )

  // Nom affiché : prénom + nom si dispo, sinon partie avant @ de l'email
  const displayName = (() => {
    const meta = user?.user_metadata
    if (meta?.first_name || meta?.last_name) {
      return [meta.first_name, meta.last_name].filter(Boolean).join(' ')
    }
    return user?.email?.split('@')[0] ?? 'Mon compte'
  })()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentAvatar = avatars.find((a) => a.id === selected) ?? avatars[0]

  const handleSelect = (id: string) => {
    setSelected(id)
    localStorage.setItem(STORAGE_KEY, id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Avatar actuel — cliquable */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 group focus:outline-none"
        title="Changer d'avatar"
      >
        <img
          src={currentAvatar.src}
          alt="Mon avatar"
          className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-primary transition-all shadow-sm"
        />
        <div className="hidden lg:flex flex-col items-start">
          <span className="text-sm font-bold text-dark leading-tight">{displayName}</span>
          <span className="text-xs text-muted leading-tight">Administrateur</span>
        </div>
      </button>

      {/* Dropdown sélecteur */}
      {open && (
        <div className="absolute right-0 top-14 z-50 bg-surface rounded-2xl shadow-xl border border-border p-4 w-64">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Choisir mon avatar
          </p>
          <div className="grid grid-cols-3 gap-3">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:bg-primary-light ${
                  selected === avatar.id
                    ? 'ring-2 ring-primary bg-primary-light'
                    : 'hover:ring-1 hover:ring-primary/30'
                }`}
              >
                <img
                  src={avatar.src}
                  alt={avatar.label}
                  className="w-14 h-14 rounded-full shadow-sm"
                />
                <span className="text-xs text-muted">{avatar.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
