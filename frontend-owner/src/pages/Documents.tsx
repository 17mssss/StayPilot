import React, { useEffect, useState, useRef, ChangeEvent } from 'react'
import { FileText, Download, Upload, FolderOpen, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react'
import api from '../lib/api'

interface Document {
  id: string
  title: string
  category: 'contract' | 'amendment' | 'annex' | 'other'
  file_name: string
  file_url?: string
  file_size?: number
  file_mime?: string
  owner_email?: string
  created_at: string
}

const CATEGORY_LABELS: Record<Document['category'], string> = {
  contract:  'Contrat',
  amendment: 'Avenant',
  annex:     'Annexe',
  other:     'Autre',
}

const CATEGORY_CLS: Record<Document['category'], string> = {
  contract:  'bg-blue-100 text-blue-700',
  amendment: 'bg-purple-100 text-purple-700',
  annex:     'bg-gray-100 text-gray-600',
  other:     'bg-yellow-100 text-yellow-700',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024)          return `${bytes} o`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function Documents() {
  const [documents,      setDocuments]      = useState<Document[]>([])
  const [loading,        setLoading]        = useState(true)
  const [uploading,      setUploading]      = useState(false)
  const [uploadSuccess,  setUploadSuccess]  = useState(false)
  const [uploadError,    setUploadError]    = useState('')
  const [dragOver,       setDragOver]       = useState(false)
  const [downloadingId,  setDownloadingId]  = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<Document[]>('/api/documents')
      .then(r => setDocuments(r.data))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }, [])

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    const form = new FormData()
    form.append('file', file)
    form.append('title', file.name.replace(/\.[^.]+$/, ''))

    try {
      const res = await api.post<Document>('/api/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocuments(prev => [res.data, ...prev])
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch {
      setUploadError('Échec de l\'envoi. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  // Téléchargement via la route backend dédiée (gère S3 redirect et base64)
  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id)
    try {
      const res = await api.get(`/api/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = doc.file_name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Impossible de télécharger le document.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer « ${doc.title} » ?`)) return
    try {
      await api.delete(`/api/documents/${doc.id}`)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch {
      alert('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-primary bg-primary-light'
            : 'border-gray-200 bg-surface hover:border-primary hover:bg-primary-light/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          onChange={handleFile}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Envoi en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-muted" />
            <p className="text-sm font-medium text-dark">Déposez un fichier ici ou cliquez pour parcourir</p>
            <p className="text-xs text-muted">PDF, Word, JPG, PNG acceptés · max 20 Mo</p>
          </div>
        )}
      </div>

      {/* Feedback messages */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2.5">
          <CheckCircle size={15} />
          Document envoyé avec succès.
        </div>
      )}
      {uploadError && (
        <div className="flex items-center justify-between text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{uploadError}</span>
          <button onClick={() => setUploadError('')}><X size={14} /></button>
        </div>
      )}

      {/* Documents list */}
      <div className="bg-surface rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <FolderOpen size={30} className="text-gray-300" />
            <p className="text-sm text-muted">Aucun document disponible</p>
            <p className="text-xs text-muted text-center max-w-xs">
              Vos contrats et documents partagés par votre gestionnaire apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 bg-bg">
                  {['Document', 'Catégorie', 'Taille', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-bg transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText size={16} className="text-muted flex-shrink-0" />
                        <span className="font-medium text-dark truncate max-w-[200px]">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_CLS[doc.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[doc.category] ?? doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{fmtSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-muted text-xs">{fmt(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50"
                        >
                          {downloadingId === doc.id ? (
                            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          Télécharger
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
