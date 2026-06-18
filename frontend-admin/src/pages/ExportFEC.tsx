import React, { useState } from 'react'
import {
  FileText, Download, AlertCircle, RefreshCw,
  CheckCircle2, Table2, Calculator, Info,
} from 'lucide-react'
import api from '../lib/api'
import { usePlan } from '../contexts/PlanContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reservation {
  id: string
  check_in: string
  check_out: string
  guest_name: string
  platform: string
  property_name: string | null
  total_price: number
  status: string
}

// ── FEC Helpers ───────────────────────────────────────────────────────────────

/** Format date YYYYMMDD pour le FEC */
function toFecDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.replace(/-/g, '').slice(0, 8)
}

/** Nettoyer une chaîne (pas de ; ni de retour chariot) */
function sanitize(s: string | null | undefined): string {
  return (s ?? '').replace(/[;\r\n]/g, ' ').trim()
}

/** Formater un montant FEC : 2 décimales, pas de séparateur de milliers */
function fmtFEC(n: number): string {
  return Math.abs(n).toFixed(2)
}

/** Générer les lignes FEC à partir des réservations */
function buildFecRows(
  reservations: Reservation[],
  commissionRate: number,
  year: number,
): string[][] {
  const rows: string[][] = []
  let ecritureNum = 1

  for (const r of reservations) {
    if (r.status === 'cancelled') continue

    const date = toFecDate(r.check_in)
    const pieceRef = sanitize(r.id.slice(0, 8).toUpperCase())
    const logement = sanitize(r.property_name ?? 'Logement')
    const voyageur = sanitize(r.guest_name ?? 'Voyageur')
    const gross = Number(r.total_price ?? 0)
    const commission = Math.round(gross * commissionRate * 100) / 100
    const net = Math.round((gross - commission) * 100) / 100
    const label = sanitize(`${logement} - ${voyageur}`)
    const numStr = String(ecritureNum).padStart(5, '0')

    // ── Écriture 1 : constatation de la recette brute
    //   Débit 411100 (Clients/Voyageurs) | Crédit 706000 (Prestations hébergement)

    // Ligne débit client
    rows.push([
      'VE', 'VENTES',
      `VE${year}-${numStr}`,
      date,
      '411100', 'Clients – Voyageurs',
      '', '',
      pieceRef, date,
      label,
      fmtFEC(gross), '0,00',
      '', '', date,
      fmtFEC(gross), 'EUR',
    ])

    // Ligne crédit produit
    rows.push([
      'VE', 'VENTES',
      `VE${year}-${numStr}`,
      date,
      '706000', 'Prestations hébergement',
      '', '',
      pieceRef, date,
      label,
      '0,00', fmtFEC(gross),
      '', '', date,
      fmtFEC(gross), 'EUR',
    ])

    ecritureNum++

    // ── Écriture 2 : commission conciergerie
    if (commission > 0) {
      const numStr2 = String(ecritureNum).padStart(5, '0')

      rows.push([
        'OD', 'OPERATIONS DIVERSES',
        `OD${year}-${numStr2}`,
        date,
        '621100', 'Commissions conciergerie',
        '', '',
        pieceRef, date,
        `Commission – ${label}`,
        fmtFEC(commission), '0,00',
        '', '', date,
        fmtFEC(commission), 'EUR',
      ])

      rows.push([
        'OD', 'OPERATIONS DIVERSES',
        `OD${year}-${numStr2}`,
        date,
        '411100', 'Clients – Voyageurs',
        '', '',
        pieceRef, date,
        `Commission – ${label}`,
        '0,00', fmtFEC(commission),
        '', '', date,
        fmtFEC(commission), 'EUR',
      ])

      ecritureNum++
    }
  }

  return rows
}

const FEC_HEADERS = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib',
  'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate',
  'Montantdevise', 'Idevise',
]

function buildFecCsv(rows: string[][]): string {
  const lines = [FEC_HEADERS.join('\t')]
  for (const row of rows) {
    lines.push(row.join('\t'))
  }
  return lines.join('\r\n')
}

/** CSV simplifié pour Excel */
function buildSimpleCsv(reservations: Reservation[], commissionRate: number): string {
  const lines = [
    ['Date', 'Logement', 'Voyageur', 'Plateforme', 'Revenus bruts (€)', 'Commission (€)', 'Revenus nets (€)'].join(';'),
  ]
  for (const r of reservations) {
    if (r.status === 'cancelled') continue
    const gross = Number(r.total_price ?? 0)
    const commission = Math.round(gross * commissionRate * 100) / 100
    const net = gross - commission
    lines.push([
      r.check_in,
      sanitize(r.property_name ?? ''),
      sanitize(r.guest_name ?? ''),
      r.platform,
      gross.toFixed(2).replace('.', ','),
      commission.toFixed(2).replace('.', ','),
      net.toFixed(2).replace('.', ','),
    ].join(';'))
  }
  return lines.join('\r\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const bom = mime.includes('text') ? '﻿' : ''
  const blob = new Blob([bom + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Composants UI ─────────────────────────────────────────────────────────────

function InfoBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface rounded-xl shadow-card p-4 text-center">
      <p className="text-2xl font-extrabold text-dark">{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ExportFEC() {
  const { canUse } = usePlan()
  const currentYear = new Date().getFullYear()

  const [year, setYear]               = useState(currentYear)
  const [commissionRate, setCommissionRate] = useState(20)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [stats, setStats]             = useState<{
    total: number
    gross: number
    commission: number
    net: number
    rows: number
  } | null>(null)

  const isEnterprise = canUse('crmVoyageurs') // Enterprise flag

  const handleExport = async (format: 'fec' | 'csv') => {
    setLoading(true)
    setError(null)
    setStats(null)

    try {
      // Récupérer toutes les réservations de l'année
      const pages: Reservation[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const res = await api.get('/api/reservations', {
          params: { year, limit: 200, page },
        })
        const data: Reservation[] = res.data?.data ?? res.data ?? []
        pages.push(...data.filter((r: Reservation) => {
          const rYear = r.check_in?.slice(0, 4)
          return rYear === String(year)
        }))
        hasMore = data.length === 200
        page++
        if (page > 20) break // sécurité
      }

      // Fallback : fetch without year filter if empty
      if (pages.length === 0) {
        const res = await api.get('/api/reservations', { params: { limit: 500, page: 1 } })
        const data: Reservation[] = res.data?.data ?? res.data ?? []
        pages.push(...data.filter((r: Reservation) => r.check_in?.startsWith(String(year))))
      }

      const rate = commissionRate / 100
      const active = pages.filter(r => r.status !== 'cancelled')
      const gross = active.reduce((s, r) => s + Number(r.total_price ?? 0), 0)
      const commission = Math.round(gross * rate * 100) / 100
      const net = gross - commission

      if (format === 'fec') {
        const rows = buildFecRows(pages, rate, year)
        const csv = buildFecCsv(rows)
        downloadFile(csv, `FEC_StayPilot_${year}.txt`, 'text/plain;charset=utf-8')
        setStats({ total: active.length, gross, commission, net, rows: rows.length })
      } else {
        const csv = buildSimpleCsv(pages, rate)
        downloadFile(csv, `Export_StayPilot_${year}.csv`, 'text/csv;charset=utf-8')
        setStats({ total: active.length, gross, commission, net, rows: active.length })
      }
    } catch (err: unknown) {
      console.error(err)
      setError('Impossible de récupérer les réservations. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  if (!isEnterprise) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface rounded-xl shadow-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <Calculator size={22} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-dark">Export FEC — Réservé Enterprise</p>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            L'export du Fichier des Écritures Comptables (FEC) est disponible dans le plan
            Enterprise. Passez à Enterprise pour accéder à cette fonctionnalité.
          </p>
          <a
            href="/abonnement"
            className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Voir les plans
          </a>
        </div>
      </div>
    )
  }

  const fmtEur = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="max-w-2xl space-y-5 mx-auto">

      {/* Description */}
      <div className="bg-surface rounded-xl shadow-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText size={16} className="text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-dark">Export FEC — Format légal français</p>
            <p className="text-xs text-muted leading-relaxed">
              Le Fichier des Écritures Comptables est le format officiel requis par l'administration
              fiscale française (Article L47 A du LPF). Ce fichier est directement importable dans
              <strong className="text-dark"> Sage, Pennylane, Cegid, EBP</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Paramètres */}
      <div className="bg-surface rounded-xl shadow-card p-5 space-y-4">
        <p className="text-sm font-semibold text-dark">Paramètres de l'export</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Exercice comptable</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full text-sm bg-bg border border-border rounded-lg px-3 py-2 text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Taux de commission (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionRate}
              onChange={e => setCommissionRate(Number(e.target.value))}
              className="w-full text-sm bg-bg border border-border rounded-lg px-3 py-2 text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Info comptes */}
        <div className="bg-bg rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-muted" />
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Plan comptable utilisé</span>
          </div>
          {[
            ['411100', 'Clients – Voyageurs (tiers)'],
            ['706000', 'Prestations hébergement (produits)'],
            ['621100', 'Commissions conciergerie (charges)'],
          ].map(([code, label]) => (
            <div key={code} className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">{code}</span>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Stats après export */}
      {stats && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={15} />
            <span className="text-sm font-semibold">Fichier généré et téléchargé</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <InfoBadge label="Réservations" value={stats.total} />
            <InfoBadge label="Revenus bruts" value={fmtEur(stats.gross)} />
            <InfoBadge label="Commissions" value={fmtEur(stats.commission)} />
            <InfoBadge label="Revenus nets" value={fmtEur(stats.net)} />
          </div>
        </div>
      )}

      {/* Boutons d'export */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleExport('fec')}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-dark text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-dark/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <FileText size={15} />
          )}
          <span>Export FEC</span>
          <span className="text-[10px] opacity-60">.txt</span>
        </button>

        <button
          onClick={() => handleExport('csv')}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-surface border border-border text-dark rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-bg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Table2 size={15} />
          )}
          <span>Export simplifié</span>
          <span className="text-[10px] text-muted">.csv</span>
        </button>
      </div>

      {/* Note légale */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-xs text-yellow-800 leading-relaxed">
          <strong>Note :</strong> Ce fichier FEC est généré à partir des réservations enregistrées
          dans StayPilot. Vérifiez avec votre expert-comptable que le plan comptable utilisé
          correspond à votre structure juridique (LMNP, SCI, SARL…).
        </p>
      </div>

      {/* Comment l'importer */}
      <div className="bg-surface rounded-xl shadow-card p-5 space-y-3">
        <p className="text-sm font-semibold text-dark flex items-center gap-2">
          <Download size={14} className="text-primary" />
          Comment importer le FEC
        </p>
        <div className="space-y-2 text-xs text-muted">
          {[
            ['Pennylane', 'Paramètres → Comptabilité → Importer un FEC'],
            ['Sage 50',   'Fichier → Importer → Fichier des écritures comptables'],
            ['Cegid',     'Traitements → Imports → FEC → Sélectionner le fichier'],
            ['EBP',       'Outils → Import → Fichier FEC légal'],
          ].map(([logiciel, path]) => (
            <div key={logiciel} className="flex items-start gap-2">
              <span className="font-semibold text-dark flex-shrink-0 w-20">{logiciel}</span>
              <span>{path}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
