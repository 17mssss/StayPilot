/**
 * demoMocks.ts — Données statiques pour le mode démo (sans backend)
 *
 * Utilisé par l'adapter axios en mode démo pour retourner des données
 * fictives sans aucun appel réseau vers le backend Railway.
 */

// ── Types légers ──────────────────────────────────────────────────────────────
export type DemoMockData = unknown

// ── Logements ─────────────────────────────────────────────────────────────────
const LOGEMENTS = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    client_id: 'a0000000-0000-0000-0000-000000000001',
    nom: 'Studio Montmartre',
    adresse: '12 rue Lepic, 75018 Paris',
    ville: 'Paris',
    capacite: 3,
    nb_pieces: 1,
    plateforme: 'airbnb',
    statut: 'actif',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    client_id: 'a0000000-0000-0000-0000-000000000001',
    nom: 'Appartement Marais',
    adresse: '8 rue de Bretagne, 75003 Paris',
    ville: 'Paris',
    capacite: 4,
    nb_pieces: 2,
    plateforme: 'airbnb',
    statut: 'actif',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    client_id: 'a0000000-0000-0000-0000-000000000001',
    nom: 'Villa Côte d\'Azur',
    adresse: '25 avenue de la Mer, 06400 Cannes',
    ville: 'Cannes',
    capacite: 8,
    nb_pieces: 4,
    plateforme: 'abritel',
    statut: 'actif',
    created_at: '2025-01-01T00:00:00Z',
  },
]

// ── Réservations ──────────────────────────────────────────────────────────────
const RESERVATIONS = [
  { id: 'c1000000-0000-0000-0000-000000000016', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'abritel', guest_name: 'Marc Dubois', guest_email: 'marc.dubois@orange.fr', guest_phone: '+33612345678', check_in: '2026-08-03', check_out: '2026-08-10', status: 'confirmed', guests_count: 6, total_price: 2240, created_at: '2026-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000011', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'booking', guest_name: 'David Smith', guest_email: 'david.smith@gmail.com', guest_phone: '+44789456123', check_in: '2026-07-28', check_out: '2026-08-01', status: 'confirmed', guests_count: 2, total_price: 720, created_at: '2026-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000015', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'airbnb', guest_name: 'Elena Petrova', guest_email: 'elena.petrova@mail.ru', guest_phone: '+79161234567', check_in: '2026-07-23', check_out: '2026-07-30', status: 'confirmed', guests_count: 4, total_price: 1960, created_at: '2026-05-20T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000005', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'airbnb', guest_name: 'Pierre Fontaine', guest_email: 'pierre.fontaine@free.fr', guest_phone: '+33698765432', check_in: '2026-07-20', check_out: '2026-07-24', status: 'confirmed', guests_count: 3, total_price: 560, created_at: '2026-05-15T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000010', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'direct', guest_name: 'Claire Dupont', guest_email: 'claire.dupont@sfr.fr', guest_phone: '+33654321098', check_in: '2026-07-16', check_out: '2026-07-19', status: 'confirmed', guests_count: 2, total_price: 535, created_at: '2026-05-10T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000014', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'direct', guest_name: 'Sarah Johnson', guest_email: 'sarah.j@gmail.com', guest_phone: '+1415123456', check_in: '2026-07-13', check_out: '2026-07-20', status: 'confirmed', guests_count: 8, total_price: 2580, created_at: '2026-05-05T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000004', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'direct', guest_name: 'Chloé Bernard', guest_email: 'chloe.b@outlook.com', guest_phone: '+33611223344', check_in: '2026-07-10', check_out: '2026-07-13', status: 'confirmed', guests_count: 2, total_price: 380, created_at: '2026-05-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000009', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'airbnb', guest_name: 'Yuki Tanaka', guest_email: 'yuki.tanaka@gmail.com', guest_phone: '+818012345678', check_in: '2026-07-08', check_out: '2026-07-12', status: 'confirmed', guests_count: 2, total_price: 680, created_at: '2026-04-20T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000003', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'airbnb', guest_name: 'Sophie Moreau', guest_email: 'sophie.moreau@hotmail.fr', guest_phone: '+33622334455', check_in: '2026-07-03', check_out: '2026-07-06', status: 'confirmed', guests_count: 2, total_price: 420, created_at: '2026-04-15T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000013', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'booking', guest_name: 'Ahmed Mansouri', guest_email: 'ahmed.mansouri@yahoo.fr', guest_phone: '+33677889900', check_in: '2026-07-02', check_out: '2026-07-09', status: 'confirmed', guests_count: 5, total_price: 2100, created_at: '2026-04-10T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000008', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'abritel', guest_name: 'Maria Garcia', guest_email: 'maria.garcia@gmail.com', guest_phone: '+34612345678', check_in: '2026-07-01', check_out: '2026-07-05', status: 'confirmed', guests_count: 4, total_price: 790, created_at: '2026-04-05T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000002', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'booking', guest_name: 'Hugo Petit', guest_email: 'hugo.petit@gmail.com', guest_phone: '+33633445566', check_in: '2026-06-26', check_out: '2026-06-29', status: 'confirmed', guests_count: 1, total_price: 307, created_at: '2026-04-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000007', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'booking', guest_name: 'Thomas Wagner', guest_email: 'thomas.w@web.de', guest_phone: '+4915112345678', check_in: '2026-06-25', check_out: '2026-06-28', status: 'confirmed', guests_count: 1, total_price: 495, created_at: '2026-03-20T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000012', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'airbnb', guest_name: 'Isabella Rossi', guest_email: 'isabella.rossi@gmail.com', guest_phone: '+393331234567', check_in: '2026-06-21', check_out: '2026-06-28', status: 'confirmed', guests_count: 6, total_price: 2360, created_at: '2026-03-15T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000001', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'airbnb', guest_name: 'Emma Leroy', guest_email: 'emma.leroy@gmail.com', guest_phone: '+33644556677', check_in: '2026-06-20', check_out: '2026-06-23', status: 'confirmed', guests_count: 2, total_price: 485, created_at: '2026-03-10T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000006', logement_id: 'b1000000-0000-0000-0000-000000000002', property_name: 'Appartement Marais', platform: 'airbnb', guest_name: 'Luca Bianchi', guest_email: 'luca.bianchi@gmail.com', guest_phone: '+393456789012', check_in: '2026-06-19', check_out: '2026-06-22', status: 'checked_in', guests_count: 2, total_price: 645, created_at: '2026-03-05T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000018', logement_id: 'b1000000-0000-0000-0000-000000000001', property_name: 'Studio Montmartre', platform: 'booking', guest_name: 'Anne Martin', guest_email: 'anne.martin@gmail.com', guest_phone: '+33655667788', check_in: '2026-06-06', check_out: '2026-06-09', status: 'completed', guests_count: 2, total_price: 340, created_at: '2026-03-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000017', logement_id: 'b1000000-0000-0000-0000-000000000003', property_name: 'Villa Côte d\'Azur', platform: 'airbnb', guest_name: 'Carlos Mendez', guest_email: 'carlos.m@gmail.com', guest_phone: '+34698765432', check_in: '2026-05-29', check_out: '2026-06-05', status: 'completed', guests_count: 4, total_price: 1890, created_at: '2026-02-20T00:00:00Z' },
]

// ── Avis ──────────────────────────────────────────────────────────────────────
const AVIS = [
  { id: '16f49eee-cf0b-4a49-a09a-54d9dccf84ec', logement_id: 'b1000000-0000-0000-0000-000000000001', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'Anne Martin', rating: 5, comment: 'Appartement parfait ! Très propre, bien équipé, emplacement idéal à Montmartre. On reviendra sans hésiter.', date_avis: '2026-06-10', platform: 'booking', reponse_admin: null },
  { id: '4fe6f343-ed78-46f7-a98b-062f4f9a33f8', logement_id: 'b1000000-0000-0000-0000-000000000003', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'Carlos Mendez', rating: 5, comment: 'Villa extraordinaire ! Piscine magnifique, vue imprenable, très bien tenu. Service de conciergerie au top.', date_avis: '2026-06-03', platform: 'airbnb', reponse_admin: null },
  { id: '622ed495-8052-4082-9709-6afef992ea97', logement_id: 'b1000000-0000-0000-0000-000000000002', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'David Schneider', rating: 4, comment: 'Bel appartement au cœur du Marais, très bien situé. Quelques petits détails à peaufiner mais globalement excellent.', date_avis: '2026-05-27', platform: 'airbnb', reponse_admin: null },
  { id: 'bd13f152-e576-4855-8d73-c68a28d7cda7', logement_id: 'b1000000-0000-0000-0000-000000000001', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'Keiko Yamamoto', rating: 5, comment: 'Studio charmant et très bien équipé. Hôte très réactif. Nous avons adoré notre séjour à Montmartre !', date_avis: '2026-05-19', platform: 'booking', reponse_admin: null },
  { id: '03a6b2d9-7df9-41af-abd6-11814e73d476', logement_id: 'b1000000-0000-0000-0000-000000000003', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'Michel et Christine Renard', rating: 5, comment: 'Séjour inoubliable dans cette villa de rêve. Tout était parfait : propreté irréprochable, équipements top.', date_avis: '2026-05-11', platform: 'abritel', reponse_admin: null },
  { id: '627d98b2-4baf-473e-84b1-49f297c124e6', logement_id: 'b1000000-0000-0000-0000-000000000002', client_id: 'a0000000-0000-0000-0000-000000000001', guest_name: 'Sophie Laurent', rating: 4, comment: 'Très bon séjour dans l\'appartement du Marais. Bien décoré, propre, quartier vivant. Je recommande.', date_avis: '2026-05-04', platform: 'direct', reponse_admin: null },
]

// ── Maintenances ──────────────────────────────────────────────────────────────
const MAINTENANCES = [
  { id: 'mnt-001', logement_id: 'b1000000-0000-0000-0000-000000000001', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Remplacement ampoules salle de bain', description: 'Plusieurs ampoules à changer', priorite: 'normale', statut: 'resolu', created_at: '2026-06-01T00:00:00Z', resolved_at: '2026-06-02T00:00:00Z' },
  { id: 'mnt-002', logement_id: 'b1000000-0000-0000-0000-000000000002', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Fuite robinet cuisine', description: 'Petit filet d\'eau au niveau du robinet', priorite: 'haute', statut: 'en_cours', created_at: '2026-06-10T00:00:00Z', resolved_at: null },
  { id: 'mnt-003', logement_id: 'b1000000-0000-0000-0000-000000000003', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Nettoyage piscine', description: 'Nettoyage filtres + traitement eau', priorite: 'normale', statut: 'planifie', created_at: '2026-06-12T00:00:00Z', resolved_at: null },
  { id: 'mnt-004', logement_id: 'b1000000-0000-0000-0000-000000000001', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Serrure porte d\'entrée à huiler', description: 'Difficulté à tourner la clé', priorite: 'basse', statut: 'ouvert', created_at: '2026-06-14T00:00:00Z', resolved_at: null },
]

// ── CRM Voyageurs ─────────────────────────────────────────────────────────────
const CRM_VOYAGEURS = [
  { id: 'crm-001', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Emma Leroy', email: 'emma.leroy@gmail.com', telephone: '+33644556677', plateforme: 'airbnb', nb_sejours: 3, derniere_resa: '2026-06-20', total_depense: 1250, notes: 'Cliente fidèle, très appréciée' },
  { id: 'crm-002', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'David Smith', email: 'david.smith@gmail.com', telephone: '+44789456123', plateforme: 'booking', nb_sejours: 2, derniere_resa: '2026-07-28', total_depense: 1420, notes: '' },
  { id: 'crm-003', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Carlos Mendez', email: 'carlos.m@gmail.com', telephone: '+34698765432', plateforme: 'airbnb', nb_sejours: 1, derniere_resa: '2026-05-29', total_depense: 1890, notes: 'Grand groupe, villa uniquement' },
  { id: 'crm-004', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Sarah Johnson', email: 'sarah.j@gmail.com', telephone: '+1415123456', plateforme: 'direct', nb_sejours: 2, derniere_resa: '2026-07-13', total_depense: 3080, notes: 'Réservation directe, bonne cliente' },
  { id: 'crm-005', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Marc Dubois', email: 'marc.dubois@orange.fr', telephone: '+33612345678', plateforme: 'abritel', nb_sejours: 1, derniere_resa: '2026-08-03', total_depense: 2240, notes: '' },
]

// ── Propriétaires ─────────────────────────────────────────────────────────────
const PROPRIETAIRES = [
  { id: 'prop-001', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Jean-Paul Mercier', email: 'jp.mercier@gmail.com', telephone: '+33601020304', commission: 20, logement_ids: ['b1000000-0000-0000-0000-000000000001'], created_at: '2025-01-15T00:00:00Z' },
  { id: 'prop-002', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'Nathalie Rousseau', email: 'nathalie.r@orange.fr', telephone: '+33612345670', commission: 18, logement_ids: ['b1000000-0000-0000-0000-000000000002'], created_at: '2025-02-10T00:00:00Z' },
  { id: 'prop-003', client_id: 'a0000000-0000-0000-0000-000000000001', nom: 'François et Marie Leblanc', email: 'leblanc.immo@gmail.com', telephone: '+33623456789', commission: 22, logement_ids: ['b1000000-0000-0000-0000-000000000003'], created_at: '2025-03-05T00:00:00Z' },
]

// ── Notifications ─────────────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { id: 'notif-001', client_id: 'a0000000-0000-0000-0000-000000000001', type: 'nouvelle_reservation', message: 'Nouvelle réservation : Marc Dubois du 3 au 10 août — Villa Côte d\'Azur', is_read: false, created_at: '2026-06-01T10:00:00Z' },
  { id: 'notif-002', client_id: 'a0000000-0000-0000-0000-000000000001', type: 'avis', message: 'Nouvel avis 5★ reçu de Anne Martin sur Studio Montmartre', is_read: false, created_at: '2026-06-10T14:30:00Z' },
  { id: 'notif-003', client_id: 'a0000000-0000-0000-0000-000000000001', type: 'maintenance', message: 'Ticket maintenance : Fuite robinet cuisine — Appartement Marais', is_read: true, created_at: '2026-06-10T09:00:00Z' },
]

// ── Factures ──────────────────────────────────────────────────────────────────
const INVOICES = [
  { id: 'inv-001', client_id: 'a0000000-0000-0000-0000-000000000001', numero: 'FAC-2026-001', proprietaire_nom: 'Jean-Paul Mercier', logement_nom: 'Studio Montmartre', montant_ht: 1250, tva: 250, montant_ttc: 1500, statut: 'payee', date_emission: '2026-05-31', date_echeance: '2026-06-15' },
  { id: 'inv-002', client_id: 'a0000000-0000-0000-0000-000000000001', numero: 'FAC-2026-002', proprietaire_nom: 'Nathalie Rousseau', logement_nom: 'Appartement Marais', montant_ht: 1620, tva: 324, montant_ttc: 1944, statut: 'en_attente', date_emission: '2026-06-01', date_echeance: '2026-06-30' },
  { id: 'inv-003', client_id: 'a0000000-0000-0000-0000-000000000001', numero: 'FAC-2026-003', proprietaire_nom: 'François et Marie Leblanc', logement_nom: 'Villa Côte d\'Azur', montant_ht: 5850, tva: 1170, montant_ttc: 7020, statut: 'payee', date_emission: '2026-05-31', date_echeance: '2026-06-15' },
]

// ── Menage / Équipe ───────────────────────────────────────────────────────────
const MENAGE_TASKS = [
  { id: 'task-001', logement_id: 'b1000000-0000-0000-0000-000000000001', logement_nom: 'Studio Montmartre', agent_nom: 'Marie Dupont', date_mission: '2026-06-23', heure_debut: '10:00', statut: 'planifie', type: 'depart' },
  { id: 'task-002', logement_id: 'b1000000-0000-0000-0000-000000000002', logement_nom: 'Appartement Marais', agent_nom: 'Lucas Martin', date_mission: '2026-06-22', heure_debut: '11:00', statut: 'en_cours', type: 'depart' },
  { id: 'task-003', logement_id: 'b1000000-0000-0000-0000-000000000001', logement_nom: 'Studio Montmartre', agent_nom: 'Marie Dupont', date_mission: '2026-06-20', heure_debut: '10:00', statut: 'termine', type: 'arrivee' },
]

const MENAGE_STATS = {
  total_missions: 24,
  missions_semaine: 5,
  taux_completion: 96,
  agents_actifs: 3,
}

// ── Pricing Dynamique ─────────────────────────────────────────────────────────
const PRICING_DYNAMIQUE = [
  { id: 'price-001', logement_id: 'b1000000-0000-0000-0000-000000000001', nom: 'Tarif été', date_debut: '2026-07-01', date_fin: '2026-08-31', prix_nuit: 145, minimum_nuits: 2, actif: true },
  { id: 'price-002', logement_id: 'b1000000-0000-0000-0000-000000000002', nom: 'Tarif été', date_debut: '2026-07-01', date_fin: '2026-08-31', prix_nuit: 180, minimum_nuits: 3, actif: true },
  { id: 'price-003', logement_id: 'b1000000-0000-0000-0000-000000000003', nom: 'Haute saison', date_debut: '2026-06-15', date_fin: '2026-09-15', prix_nuit: 320, minimum_nuits: 5, actif: true },
]

// ── Livrets ───────────────────────────────────────────────────────────────────
const LIVRETS = [
  { id: 'livret-001', logement_id: 'b1000000-0000-0000-0000-000000000001', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Livret Studio Montmartre', contenu: 'Bienvenue dans notre studio...', qr_code_url: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'livret-002', logement_id: 'b1000000-0000-0000-0000-000000000002', client_id: 'a0000000-0000-0000-0000-000000000001', titre: 'Livret Appartement Marais', contenu: 'Bienvenue dans notre appartement...', qr_code_url: null, created_at: '2026-01-01T00:00:00Z' },
]

// ── Inbox ─────────────────────────────────────────────────────────────────────
const INBOX = [
  { id: 'msg-001', client_id: 'a0000000-0000-0000-0000-000000000001', canal: 'airbnb', voyageur_nom: 'Elena Petrova', contenu: 'Bonjour, est-ce que la villa dispose bien d\'une piscine privée ?', direction: 'entrant', statut: 'lu', created_at: '2026-06-15T09:30:00Z' },
  { id: 'msg-002', client_id: 'a0000000-0000-0000-0000-000000000001', canal: 'booking', voyageur_nom: 'David Smith', contenu: 'Hello, what time is check-in available?', direction: 'entrant', statut: 'non_lu', created_at: '2026-06-16T14:20:00Z' },
  { id: 'msg-003', client_id: 'a0000000-0000-0000-0000-000000000001', canal: 'direct', voyageur_nom: 'Sarah Johnson', contenu: 'Bonjour, pouvez-vous me confirmer la disponibilité pour 8 personnes en juillet ?', direction: 'entrant', statut: 'non_lu', created_at: '2026-06-17T11:00:00Z' },
]

// ── Revenue summary ───────────────────────────────────────────────────────────
const REVENUE_SUMMARY = {
  total_mois: 8347,
  total_annee: 47820,
  nb_nuits: 124,
  taux_occupation: 72,
  revenu_moyen_nuit: 189,
  evolution_mois: 14.2,
  par_logement: [
    { logement_id: 'b1000000-0000-0000-0000-000000000001', nom: 'Studio Montmartre', total: 1892, taux_occupation: 68 },
    { logement_id: 'b1000000-0000-0000-0000-000000000002', nom: 'Appartement Marais', total: 2765, taux_occupation: 74 },
    { logement_id: 'b1000000-0000-0000-0000-000000000003', nom: 'Villa Côte d\'Azur', total: 3690, taux_occupation: 75 },
  ],
  par_mois: [
    { mois: 'Jan', total: 2100 }, { mois: 'Fév', total: 2450 }, { mois: 'Mar', total: 3200 },
    { mois: 'Avr', total: 4100 }, { mois: 'Mai', total: 5300 }, { mois: 'Juin', total: 7200 },
    { mois: 'Juil', total: 0 }, { mois: 'Août', total: 0 }, { mois: 'Sep', total: 0 },
    { mois: 'Oct', total: 0 }, { mois: 'Nov', total: 0 }, { mois: 'Déc', total: 0 },
  ],
}

// ── Channels ──────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'ch-001', nom: 'Airbnb', actif: true, synced_at: '2026-06-18T08:00:00Z' },
  { id: 'ch-002', nom: 'Booking.com', actif: true, synced_at: '2026-06-18T08:00:00Z' },
  { id: 'ch-003', nom: 'Abritel', actif: true, synced_at: '2026-06-18T07:30:00Z' },
]

// ── Owner messages ────────────────────────────────────────────────────────────
const OWNER_MESSAGES = [
  { id: 'om-001', from: 'Jean-Paul Mercier', subject: 'Question sur le loyer de mai', content: 'Bonjour, pouvez-vous me confirmer le virement pour mai ?', is_read: true, created_at: '2026-06-05T10:00:00Z' },
  { id: 'om-002', from: 'Nathalie Rousseau', subject: 'Travaux prévus en septembre', content: 'Je souhaitais vous informer de travaux de rénovation prévus...', is_read: false, created_at: '2026-06-12T14:00:00Z' },
]

// ── Simulation revenus ────────────────────────────────────────────────────────
const SIMULATION = {
  potentiel_annuel: 65000,
  taux_optimise: 82,
  gain_potentiel: 17180,
  recommandations: ['Activer le pricing dynamique été', 'Ouvrir les réservations directes', 'Améliorer le taux de réponse'],
}

// ── Reports ───────────────────────────────────────────────────────────────────
const REPORTS = {
  disponible: true,
  derniere_generation: '2026-06-01T00:00:00Z',
}

// ── Investisseurs ─────────────────────────────────────────────────────────────
const INVESTISSEURS = {
  rendement_brut: 8.4,
  rendement_net: 6.2,
  valeur_portefeuille: 1250000,
  revenus_annuels: 78000,
  taux_occupation_moyen: 73,
}

// ── Fonction principale de résolution des mocks ───────────────────────────────

export function getDemoMockData(url: string): unknown {
  // Normaliser l'URL (retirer query params et trailing slash)
  const cleanUrl = url.split('?')[0].replace(/\/$/, '')

  // Logements
  if (cleanUrl === '/logements' || cleanUrl.match(/^\/logements$/)) return LOGEMENTS
  if (cleanUrl.match(/^\/logements\/b1[0-9a-f-]+$/)) {
    const id = cleanUrl.split('/').pop()
    return LOGEMENTS.find(l => l.id === id) ?? null
  }

  // Réservations
  if (cleanUrl === '/reservations' || cleanUrl === '/reservations/') return { data: RESERVATIONS, total: RESERVATIONS.length, page: 1, limit: 50 }
  if (cleanUrl.match(/^\/reservations\/c1[0-9a-f-]+$/)) {
    const id = cleanUrl.split('/').pop()
    return RESERVATIONS.find(r => r.id === id) ?? null
  }
  if (cleanUrl.match(/^\/reservations\/c1[0-9a-f-]+\/messages$/)) return []

  // Avis
  if (cleanUrl === '/avis') return AVIS
  if (cleanUrl.match(/^\/avis\//)) return AVIS.find(a => a.id === cleanUrl.split('/').pop()) ?? null

  // Maintenances
  if (cleanUrl === '/maintenances') return MAINTENANCES
  if (cleanUrl.match(/^\/maintenances\//)) return MAINTENANCES.find(m => m.id === cleanUrl.split('/').pop()) ?? null

  // CRM Voyageurs
  if (cleanUrl === '/crm-voyageurs') return CRM_VOYAGEURS
  if (cleanUrl.match(/^\/crm-voyageurs\//)) return CRM_VOYAGEURS.find(c => c.id === cleanUrl.split('/').pop()) ?? null

  // Propriétaires
  if (cleanUrl === '/proprietaires') return PROPRIETAIRES
  if (cleanUrl.match(/^\/proprietaires\//)) return PROPRIETAIRES.find(p => p.id === cleanUrl.split('/').pop()) ?? null

  // Notifications
  if (cleanUrl === '/notifications') return { notifications: NOTIFICATIONS, unread_count: NOTIFICATIONS.filter(n => !n.is_read).length }
  if (cleanUrl === '/notifications/unread-count') return { count: NOTIFICATIONS.filter(n => !n.is_read).length }

  // Factures / Invoices
  if (cleanUrl === '/invoices') return INVOICES
  if (cleanUrl === '/invoices/releve') return { releve: [], total: 0 }
  if (cleanUrl.match(/^\/invoices\//)) return INVOICES.find(i => i.id === cleanUrl.split('/').pop()) ?? null

  // Ménage
  if (cleanUrl === '/menage' || cleanUrl === '/menage/') return MENAGE_TASKS
  if (cleanUrl === '/menage/stats') return MENAGE_STATS

  // Pricing dynamique
  if (cleanUrl === '/pricing-dynamique') return PRICING_DYNAMIQUE

  // Livrets
  if (cleanUrl === '/livrets') return LIVRETS
  if (cleanUrl.match(/^\/livrets\//)) return LIVRETS.find(l => l.id === cleanUrl.split('/').pop()) ?? null

  // Inbox
  if (cleanUrl === '/inbox') return INBOX
  if (cleanUrl === '/inbox/unread-count') return { count: INBOX.filter(m => m.statut === 'non_lu').length }

  // Revenue / Reports
  if (cleanUrl === '/revenues' || cleanUrl === '/revenues/summary') return REVENUE_SUMMARY
  if (cleanUrl === '/reports') return REPORTS

  // Channels
  if (cleanUrl === '/channels') return CHANNELS

  // Owner messages
  if (cleanUrl === '/owner-messages') return OWNER_MESSAGES
  if (cleanUrl === '/owner-messages/unread-count') return { count: OWNER_MESSAGES.filter(m => !m.is_read).length }
  if (cleanUrl === '/owner-messages/read') return { success: true }

  // Simulation
  if (cleanUrl === '/simulation') return SIMULATION

  // Investisseurs
  if (cleanUrl === '/investisseurs') return INVESTISSEURS

  // Sync
  if (cleanUrl === '/sync') return { status: 'synced', last_sync: new Date().toISOString() }

  // Auth routes (device check — laisser passer)
  if (cleanUrl.startsWith('/auth/')) return { trusted: true, device_id: 'demo-device' }

  // Fallback : retourner un tableau vide
  return []
}
