require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const stripeWebhookRoutes = require('./routes/stripeWebhook');
const logementsRoutes    = require('./routes/logements');
const reservationsRoutes = require('./routes/reservations');
const messagesRoutes     = require('./routes/messages');
const templatesRoutes    = require('./routes/templates');
const invoicesRoutes     = require('./routes/invoices');
const revenuesRoutes     = require('./routes/revenues');
const documentsRoutes       = require('./routes/documents');
const simulationRoutes      = require('./routes/simulation');
const webhookRoutes         = require('./routes/webhooks');
const proprietairesRoutes   = require('./routes/proprietaires');
const { router: syncRoutes, webhookRouter: cmWebhooks } = require('./routes/sync');
const notificationsRoutes   = require('./routes/notifications');
const ownerMessagesRoutes   = require('./routes/owner-messages');
const avisRoutes            = require('./routes/avis');
const menageRoutes          = require('./routes/menage');
const livretsRoutes         = require('./routes/livrets');
const maintenancesRoutes    = require('./routes/maintenances');
const contactRoutes         = require('./routes/contact');
const pricingDynamiqueRoutes = require('./routes/pricing-dynamique');
const crmVoyageursRoutes    = require('./routes/crm-voyageurs')
const authDeviceRoutes      = require('./routes/auth-device');
const reportsRoutes         = require('./routes/reports');
const channelsRoutes        = require('./routes/channels');
const { investisseursRouter, portailRouter } = require('./routes/investisseurs');

// Services cron
const { startPolling }           = require('./services/superhote');
const { startSyncManager }       = require('./services/syncManager');
const { startMessageScheduler }  = require('./services/scheduler');
const { startReportsCron }       = require('./services/pdfReports');
const { startIcalCron }          = require('./services/icalSync');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Sécurité ─────────────────────────────────────────────────────────────────
app.use(helmet({
  // API pure (pas de HTML servi) — CSP désactivée pour ne pas bloquer les clients JSON
  contentSecurityPolicy: false,
  // Désactivé : pas d'iframe cross-origin côté API
  crossOriginEmbedderPolicy: false,
  // HSTS : forcer HTTPS pendant 1 an + sous-domaines
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// CORS — uniquement les origines explicitement autorisées (plus de wildcard *.vercel.app)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ADMIN_URL,
  process.env.FRONTEND_OWNER_URL,
  process.env.FRONTEND_URL,
  'https://staypilot.cc',
  'https://www.staypilot.cc',
  'https://frontend-admin-neon-nine.vercel.app',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Requêtes sans origin (Postman, curl, server-to-server internes)
    if (!origin) return cb(null, true);
    // Uniquement les origines explicitement listées — AUCUN wildcard
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Origine non autorisée bloquée : ${origin}`);
    cb(new Error(`CORS: origine non autorisée`));
  },
  credentials: true,
  exposedHeaders: ['X-Invoice-Number', 'X-Invoice-Id'],
}));

// ── Rate limiting global ──────────────────────────────────────────────────────
// Actif dans TOUS les environnements (pas de skip basé sur NODE_ENV)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,              // 200 req/min par IP (global)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans une minute.' },
});
app.use(globalLimiter);

// Limiteurs spécifiques pour les routes coûteuses (email, SMS, IA)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 5,                // 5 req/min par IP sur les routes sensibles
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite d\'envoi atteinte. Réessayez dans une minute.' },
});

// ── Stripe webhook — DOIT être enregistré AVANT express.json() ────────────────
// Stripe exige le body brut (Buffer) pour vérifier la signature HMAC.
// Le router stripeWebhook applique express.raw() en interne sur son POST '/'.
app.use('/webhook/stripe', stripeWebhookRoutes);

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    client: process.env.CLIENT_NAME || 'StayPilot',
    ts: new Date().toISOString(),
  });
});

// ── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/logements',    logementsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/messages',     messagesRoutes);
app.use('/api/templates',    templatesRoutes);
app.use('/api/revenues',     revenuesRoutes);
app.use('/api/documents',    documentsRoutes);
app.use('/api/proprietaires',  proprietairesRoutes);
app.use('/api/notifications',  notificationsRoutes);
app.use('/api/owner-messages', ownerMessagesRoutes);
app.use('/api/avis',           avisRoutes);
app.use('/api/menage',         menageRoutes);
app.use('/api/livrets',        livretsRoutes);
app.use('/api/maintenances',   maintenancesRoutes);
app.use('/api/sync',           syncRoutes);
app.use('/api/contact',          contactRoutes); // Formulaire demande de démo landing page
app.use('/api/pricing-dynamique', pricingDynamiqueRoutes);
app.use('/api/crm-voyageurs',     crmVoyageursRoutes)
app.use('/api/reports',          reportsRoutes);
app.use('/api/channels',         channelsRoutes);
app.use('/api/investisseurs',    investisseursRouter);
app.use('/api/portail',          portailRouter);
// Double auth — pas de middleware authenticate (appelé avant la session)
app.use('/api/auth',              strictLimiter, authDeviceRoutes);

// Routes coûteuses avec rate limit strict (email, SMS, IA)
app.use('/api/invoices/:id/send',           strictLimiter);
app.use('/api/invoices/send-direct',        strictLimiter);
app.use('/api/simulation/test-sms',         strictLimiter);
app.use('/api/simulation/test-email',       strictLimiter);
app.use('/api/simulation/test-ia',          strictLimiter);
// Formulaire de démo public — limité pour éviter le spam email
app.post('/api/contact',                    strictLimiter);
// Génération IA sur les avis — appel Anthropic coûteux
app.post('/api/avis/:id/generate-response', strictLimiter);
// Création de livrets — génère un slug et insère en base
app.post('/api/livrets',                    strictLimiter);
app.use('/api/invoices',                    invoicesRoutes);
app.use('/api/simulation',                  simulationRoutes);

app.use('/webhook',            webhookRoutes);    // n8n/Twilio/Superhote (protégés par webhookAuth)
app.use('/webhook',            cmWebhooks);       // Smoobu/Hostaway/Lodgify push webhooks

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route introuvable : ${req.method} ${req.path}` });
});

// ── Erreurs centralisées ──────────────────────────────────────────────────────
// En production : message générique + référence traçable (jamais d'info interne)
// En dev : message complet pour faciliter le debug
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  // Générer un ID de référence traçable dans les logs
  const errorRef = `ERR-${Date.now().toString(36).toUpperCase()}`;

  if (process.env.NODE_ENV === 'production') {
    // Logger l'erreur complète côté serveur avec la référence
    console.error(`[ERROR] ${errorRef} ${req.method} ${req.path}`, err.message, err.stack);
    // Retourner un message générique au client — aucune info interne exposée
    const isClientError = status >= 400 && status < 500;
    res.status(status).json({
      success: false,
      error: isClientError ? err.message : 'Une erreur interne est survenue.',
      ref: isClientError ? undefined : errorRef,
    });
  } else {
    // En développement : message complet pour faciliter le debug
    console.error(`[ERROR] ${req.method} ${req.path}`, err.message);
    res.status(status).json({ success: false, error: err.message || 'Erreur interne' });
  }
});

// ── Validation des variables d'environnement critiques ───────────────────────
function validateEnv() {
  const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NODE_ENV'];
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[ENV] Variables d'environnement manquantes : ${missing.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production') {
    const PROD_REQUIRED = ['FRONTEND_ADMIN_URL', 'FRONTEND_OWNER_URL', 'WEBHOOK_SECRET'];
    const missingProd = PROD_REQUIRED.filter((key) => !process.env[key]);
    if (missingProd.length > 0) {
      console.warn(`[ENV] ⚠ Variables de production manquantes : ${missingProd.join(', ')}`);
    }
    // Rappel RLS Supabase (SEC-10)
    console.warn('[SECURITY] ℹ Vérifier que le Row Level Security (RLS) est activé sur toutes les tables Supabase.');
    console.warn('[SECURITY] ℹ Supabase Dashboard → Authentication → Policies.');
  }
}

// ── Démarrage ─────────────────────────────────────────────────────────────────
validateEnv();

app.listen(PORT, () => {
  console.log(`\n✅ StayPilot backend démarré sur le port ${PORT}`);
  console.log(`   Client : ${process.env.CLIENT_NAME || '(non configuré — remplir .env)'}`);
  console.log(`   Env    : ${process.env.NODE_ENV || 'development'}\n`);

  if (process.env.ENABLE_POLLING !== 'false') {
    startPolling();        // Superhote (legacy)
    startSyncManager();    // Smoobu + Hostaway + Lodgify
    startIcalCron();       // Channel Manager iCal (toutes les heures)
  }
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startMessageScheduler();
  }
  startReportsCron();
});

module.exports = app;
