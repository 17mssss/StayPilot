// ─────────────────────────────────────────────────────────────────────────────
// ownerDemoMocks.ts — Données fictives pour le mode démo de l'espace propriétaire
// Propriétaire fictif : Jean-Paul Mercier — 2 logements gérés par StayPilot
// ─────────────────────────────────────────────────────────────────────────────

const NOW = new Date()
const yr = NOW.getFullYear()

// ── Propriétés ───────────────────────────────────────────────────────────────
const PROPERTIES = [
  {
    id: 'prop-001',
    name: 'Studio Montmartre',
    address: '12 rue Lepic, 75018 Paris',
    bedrooms: 1,
    capacity: 2,
    active: true,
    occupancy_rate: 78,
    monthly_net: 1420,
    photo_url: null,
    platform_links: { airbnb: 'https://airbnb.com', booking: null },
  },
  {
    id: 'prop-002',
    name: 'Appartement Marais',
    address: '8 rue de Bretagne, 75003 Paris',
    bedrooms: 2,
    capacity: 4,
    active: true,
    occupancy_rate: 65,
    monthly_net: 1980,
    photo_url: null,
    platform_links: { airbnb: 'https://airbnb.com', booking: 'https://booking.com' },
  },
]

// ── Réservations ─────────────────────────────────────────────────────────────
// Champs alignés avec ce qu'attendent Dashboard.tsx et Reservations.tsx :
// check_in, check_out, total_price, property_name, commission, status, guest_name
const RESERVATIONS = [
  {
    id: 'res-001',
    property_name: 'Studio Montmartre',
    platform: 'airbnb',
    guest_name: 'Sophie Martin',
    check_in: `${yr}-05-03`,
    check_out: `${yr}-05-08`,
    guests_count: 2,
    status: 'completed',
    total_price: 875,
    commission: 0.20,
  },
  {
    id: 'res-002',
    property_name: 'Appartement Marais',
    platform: 'airbnb',
    guest_name: 'James Wilson',
    check_in: `${yr}-05-10`,
    check_out: `${yr}-05-17`,
    guests_count: 3,
    status: 'completed',
    total_price: 1540,
    commission: 0.20,
  },
  {
    id: 'res-003',
    property_name: 'Studio Montmartre',
    platform: 'booking',
    guest_name: 'Lena Müller',
    check_in: `${yr}-05-20`,
    check_out: `${yr}-05-25`,
    guests_count: 1,
    status: 'completed',
    total_price: 875,
    commission: 0.20,
  },
  {
    id: 'res-004',
    property_name: 'Appartement Marais',
    platform: 'airbnb',
    guest_name: 'Carlos Mendez',
    check_in: `${yr}-06-01`,
    check_out: `${yr}-06-07`,
    guests_count: 4,
    status: 'completed',
    total_price: 1320,
    commission: 0.20,
  },
  {
    id: 'res-005',
    property_name: 'Studio Montmartre',
    platform: 'airbnb',
    guest_name: 'Amelia Johnson',
    check_in: `${yr}-06-10`,
    check_out: `${yr}-06-15`,
    guests_count: 2,
    status: 'completed',
    total_price: 875,
    commission: 0.20,
  },
  {
    id: 'res-006',
    property_name: 'Appartement Marais',
    platform: 'airbnb',
    guest_name: 'Nina Petrov',
    check_in: `${yr}-06-18`,
    check_out: `${yr}-06-25`,
    guests_count: 2,
    status: 'confirmed',
    total_price: 1540,
    commission: 0.20,
  },
  {
    id: 'res-007',
    property_name: 'Studio Montmartre',
    platform: 'airbnb',
    guest_name: 'Yuki Tanaka',
    check_in: `${yr}-07-01`,
    check_out: `${yr}-07-06`,
    guests_count: 2,
    status: 'confirmed',
    total_price: 875,
    commission: 0.20,
  },
  {
    id: 'res-008',
    property_name: 'Appartement Marais',
    platform: 'booking',
    guest_name: 'David Thompson',
    check_in: `${yr}-07-10`,
    check_out: `${yr}-07-20`,
    guests_count: 3,
    status: 'confirmed',
    total_price: 2200,
    commission: 0.20,
  },
]

// ── Revenus mensuels ─────────────────────────────────────────────────────────
const REVENUES_MONTHLY = [
  { month: `${yr}-01`, gross: 1750, net: 1400, commission: 350, reservations: 2 },
  { month: `${yr}-02`, gross: 2625, net: 2100, commission: 525, reservations: 3 },
  { month: `${yr}-03`, gross: 3500, net: 2800, commission: 700, reservations: 4 },
  { month: `${yr}-04`, gross: 3063, net: 2450, commission: 613, reservations: 3 },
  { month: `${yr}-05`, gross: 3290, net: 2632, commission: 658, reservations: 3 },
  { month: `${yr}-06`, gross: 4235, net: 3388, commission: 847, reservations: 3 },
]

// ── Revenus par propriété ────────────────────────────────────────────────────
const REVENUES_BY_PROPERTY = [
  {
    logement_id: 'prop-001',
    logement_nom: 'Studio Montmartre',
    gross: 10063,
    net: 8050,
    commission: 2013,
    reservations: 9,
    occupancy_rate: 78,
  },
  {
    logement_id: 'prop-002',
    logement_nom: 'Appartement Marais',
    gross: 8400,
    net: 6720,
    commission: 1680,
    reservations: 6,
    occupancy_rate: 65,
  },
]

// ── Factures ─────────────────────────────────────────────────────────────────
// Champs : invoice_number/numero, total_ttc/montant, created_at, status
const INVOICES = [
  {
    id: 'inv-001',
    invoice_number: 'FAC-2026-006',
    numero: 'FAC-2026-006',
    month: `${yr}-06`,
    period_label: 'Juin 2026',
    gross_total: 4235,
    commission_total: 847,
    net_total: 3388,
    total_ttc: 3388,
    montant: 3388,
    status: 'sent',
    pdf_url: null,
    created_at: `${yr}-06-02T10:00:00Z`,
  },
  {
    id: 'inv-002',
    invoice_number: 'FAC-2026-005',
    numero: 'FAC-2026-005',
    month: `${yr}-05`,
    period_label: 'Mai 2026',
    gross_total: 3290,
    commission_total: 658,
    net_total: 2632,
    total_ttc: 2632,
    montant: 2632,
    status: 'paid',
    pdf_url: null,
    created_at: `${yr}-05-02T10:00:00Z`,
  },
  {
    id: 'inv-003',
    invoice_number: 'FAC-2026-004',
    numero: 'FAC-2026-004',
    month: `${yr}-04`,
    period_label: 'Avril 2026',
    gross_total: 3063,
    commission_total: 613,
    net_total: 2450,
    total_ttc: 2450,
    montant: 2450,
    status: 'paid',
    pdf_url: null,
    created_at: `${yr}-04-02T10:00:00Z`,
  },
]

// ── Avis ─────────────────────────────────────────────────────────────────────
// Champs : id, rating, guest_name, date_avis
const AVIS = [
  {
    id: 'avis-001',
    reservation_id: 'res-001',
    guest_name: 'Sophie Martin',
    logement_nom: 'Studio Montmartre',
    rating: 5,
    note: 5,
    commentaire: 'Superbe appartement, très bien situé à Montmartre. Propre et confortable !',
    platform: 'airbnb',
    date_avis: `${yr}-05-09T12:00:00Z`,
    created_at: `${yr}-05-09T12:00:00Z`,
  },
  {
    id: 'avis-002',
    reservation_id: 'res-002',
    guest_name: 'James Wilson',
    logement_nom: 'Appartement Marais',
    rating: 4,
    note: 4,
    commentaire: 'Great location in the Marais. Apartment was clean and well-equipped.',
    platform: 'airbnb',
    date_avis: `${yr}-05-18T09:00:00Z`,
    created_at: `${yr}-05-18T09:00:00Z`,
  },
  {
    id: 'avis-003',
    reservation_id: 'res-003',
    guest_name: 'Lena Müller',
    logement_nom: 'Studio Montmartre',
    rating: 5,
    note: 5,
    commentaire: 'Wunderschöne Wohnung in Paris! Sehr empfehlenswert.',
    platform: 'booking',
    date_avis: `${yr}-05-26T15:00:00Z`,
    created_at: `${yr}-05-26T15:00:00Z`,
  },
  {
    id: 'avis-004',
    reservation_id: 'res-004',
    guest_name: 'Carlos Mendez',
    logement_nom: 'Appartement Marais',
    rating: 5,
    note: 5,
    commentaire: 'Excelente apartamento, muy espacioso. Volveré sin duda.',
    platform: 'airbnb',
    date_avis: `${yr}-06-08T11:00:00Z`,
    created_at: `${yr}-06-08T11:00:00Z`,
  },
]

// ── Documents ─────────────────────────────────────────────────────────────────
const DOCUMENTS = [
  {
    id: 'doc-001',
    title: 'Contrat de mandat de gestion — Studio Montmartre',
    category: 'contract',
    file_name: 'contrat_mandat_studio_montmartre.pdf',
    file_size: 245760,
    file_mime: 'application/pdf',
    created_at: `${yr}-01-15T09:00:00Z`,
  },
  {
    id: 'doc-002',
    title: 'Contrat de mandat de gestion — Appartement Marais',
    category: 'contract',
    file_name: 'contrat_mandat_appt_marais.pdf',
    file_size: 253952,
    file_mime: 'application/pdf',
    created_at: `${yr}-01-15T09:05:00Z`,
  },
  {
    id: 'doc-003',
    title: 'Annexe tarifaire 2026',
    category: 'annex',
    file_name: 'annexe_tarifaire_2026.pdf',
    file_size: 102400,
    file_mime: 'application/pdf',
    created_at: `${yr}-01-20T10:00:00Z`,
  },
  {
    id: 'doc-004',
    title: 'Avenant — Mise à jour commission juillet 2026',
    category: 'amendment',
    file_name: 'avenant_commission_juillet_2026.pdf',
    file_size: 87040,
    file_mime: 'application/pdf',
    created_at: `${yr}-06-01T14:00:00Z`,
  },
]

// ── Messages ─────────────────────────────────────────────────────────────────
const MESSAGES = [
  {
    id: 'msg-001',
    direction: 'admin_to_owner',
    content: 'Bonjour Jean-Paul, bienvenue sur votre espace propriétaire StayPilot ! Vous pouvez suivre vos revenus, réservations et documents depuis ce portail.',
    is_read: true,
    created_at: `${yr}-01-16T10:00:00Z`,
  },
  {
    id: 'msg-002',
    direction: 'owner_to_admin',
    content: 'Merci ! L\'interface est très claire. Les relevés de juin seront disponibles quand ?',
    is_read: true,
    created_at: `${yr}-06-03T14:30:00Z`,
  },
  {
    id: 'msg-003',
    direction: 'admin_to_owner',
    content: 'Les relevés de juin seront disponibles aux alentours du 5 juillet. Nous vous enverrons une notification dès qu\'ils seront prêts.',
    is_read: true,
    created_at: `${yr}-06-03T16:00:00Z`,
  },
  {
    id: 'msg-004',
    direction: 'admin_to_owner',
    content: 'Bonjour Jean-Paul, votre Appartement Marais a reçu un excellent avis 5 étoiles de Carlos Mendez cette semaine !',
    is_read: false,
    created_at: `${yr}-06-09T09:00:00Z`,
  },
]

// ── Proprietaire (profil) ────────────────────────────────────────────────────
const PROPRIETAIRE = [
  {
    id: 'owner-demo-001',
    nom: 'Jean-Paul Mercier',
    email: 'demo@staypilot.cc',
    phone: '+33 6 12 34 56 78',
  },
]

// ── Relevés ──────────────────────────────────────────────────────────────────
const RELEVES = [
  {
    id: 'rel-001',
    month: `${yr}-05`,
    period_label: 'Mai 2026',
    gross_total: 3290,
    commission_total: 658,
    net_total: 2632,
    reservations_count: 3,
    details: [
      { logement: 'Studio Montmartre', gross: 1750, commission: 350, net: 1400 },
      { logement: 'Appartement Marais', gross: 1540, commission: 308, net: 1232 },
    ],
    status: 'final',
    pdf_url: null,
    created_at: `${yr}-06-01T08:00:00Z`,
  },
  {
    id: 'rel-002',
    month: `${yr}-04`,
    period_label: 'Avril 2026',
    gross_total: 3063,
    commission_total: 613,
    net_total: 2450,
    reservations_count: 3,
    details: [
      { logement: 'Studio Montmartre', gross: 1750, commission: 350, net: 1400 },
      { logement: 'Appartement Marais', gross: 1313, commission: 263, net: 1050 },
    ],
    status: 'final',
    pdf_url: null,
    created_at: `${yr}-05-01T08:00:00Z`,
  },
]

// ── Notifications ────────────────────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'new_reservation',
    title: 'Nouvelle réservation confirmée',
    body: 'Nina Petrov a réservé l\'Appartement Marais du 18 au 25 juin.',
    is_read: false,
    created_at: `${yr}-06-10T09:00:00Z`,
  },
  {
    id: 'notif-002',
    type: 'new_review',
    title: 'Nouvel avis 5 ⭐',
    body: 'Carlos Mendez a laissé un avis 5 étoiles pour l\'Appartement Marais.',
    is_read: false,
    created_at: `${yr}-06-09T11:00:00Z`,
  },
  {
    id: 'notif-003',
    type: 'invoice_ready',
    title: 'Relevé de mai disponible',
    body: 'Votre relevé de mai 2026 est disponible. Net à percevoir : 2 632 €.',
    is_read: true,
    created_at: `${yr}-06-01T08:00:00Z`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale — retourne la donnée fictive selon l'URL
// ─────────────────────────────────────────────────────────────────────────────
export function getOwnerDemoMockData(url: string): unknown {
  // Nettoyer l'URL : enlever /api, query string et trailing slash
  const cleanUrl = (url ?? '')
    .replace(/^\/api/, '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')

  // Properties
  if (cleanUrl === '/owner/properties') return PROPERTIES

  // Reservations
  if (cleanUrl === '/reservations') return RESERVATIONS

  // Invoices
  if (cleanUrl === '/invoices') return INVOICES
  if (cleanUrl.match(/^\/invoices\/[^/]+\/download$/)) return null

  // Avis
  if (cleanUrl === '/avis') return AVIS

  // Revenues
  if (cleanUrl.startsWith('/revenues/monthly')) return REVENUES_MONTHLY
  if (cleanUrl.startsWith('/revenues/by-property')) return REVENUES_BY_PROPERTY

  // Documents
  if (cleanUrl === '/documents') return DOCUMENTS
  if (cleanUrl.match(/^\/documents\/[^/]+\/download$/)) return null

  // Messages
  if (cleanUrl === '/owner-messages') return MESSAGES
  if (cleanUrl === '/owner-messages/unread-count') return { count: 1 }

  // Proprietaires
  if (cleanUrl === '/proprietaires') return PROPRIETAIRE

  // Relevés
  if (cleanUrl === '/releves') return RELEVES

  // Notifications
  if (cleanUrl === '/notifications/count') return { count: 2 }
  if (cleanUrl === '/notifications' || cleanUrl.startsWith('/notifications')) return NOTIFICATIONS

  // Profil
  if (cleanUrl === '/owner/profile') {
    return {
      id: 'owner-demo-001',
      nom: 'Jean-Paul Mercier',
      email: 'demo@staypilot.cc',
      phone: '+33 6 12 34 56 78',
      iban: 'FR76 3000 6000 0112 3456 7890 189',
      address: '45 avenue de la République, 75011 Paris',
    }
  }

  console.warn('[OwnerDemo] Route non gérée:', cleanUrl)
  return null
}
