/**
 * POST /webhook/stripe
 *
 * Handler Stripe séparé, enregistré dans index.js AVANT express.json()
 * pour que le body brut (Buffer) soit disponible lors de la vérification
 * de signature HMAC (stripe.webhooks.constructEvent).
 *
 * Événements gérés :
 *   - checkout.session.completed       → active le plan après paiement
 *   - customer.subscription.updated    → change de plan (upgrade/downgrade)
 *   - customer.subscription.deleted    → résiliation → retour au plan starter
 */

const express = require('express');
const Stripe = require('stripe');
const supabase = require('../config/supabase');

const router = express.Router();

// ── Mapping Price ID → Plan ────────────────────────────────────────────────────
const PRICE_TO_PLAN = {
  // Test mode (clés actuelles)
  'price_1TUNPbPB8ApxuPQ4ujdrhMT9': 'starter',
  'price_1TUNPcPB8ApxuPQ4HckjvF83': 'pro',
  'price_1TUNPdPB8ApxuPQ4EDz1CFBu': 'business',
};

// Injection des price IDs live via variables d'env (à renseigner quand Stripe active le compte)
if (process.env.STRIPE_PRICE_STARTER)  PRICE_TO_PLAN[process.env.STRIPE_PRICE_STARTER]  = 'starter';
if (process.env.STRIPE_PRICE_PRO)      PRICE_TO_PLAN[process.env.STRIPE_PRICE_PRO]      = 'pro';
if (process.env.STRIPE_PRICE_BUSINESS) PRICE_TO_PLAN[process.env.STRIPE_PRICE_BUSINESS] = 'business';

/**
 * Met à jour le plan d'un utilisateur dans Supabase
 * @param {string} email  - email du client Stripe
 * @param {string} planId - 'starter' | 'pro' | 'business'
 */
async function updateUserPlan(email, planId) {
  // 1. Trouver l'utilisateur via l'Admin API Supabase
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;

  const user = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.warn(`[STRIPE WEBHOOK] Utilisateur introuvable pour l'email : ${email}`);
    return;
  }

  // 2. Mettre à jour user_metadata.plan (auth.users)
  const { error: metaErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, plan: planId },
  });
  if (metaErr) throw metaErr;

  // 3. Mettre à jour la table profiles (fail silencieux si elle n'existe pas encore)
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: user.id, plan: planId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (profileErr && profileErr.code !== '42P01') {
    // 42P01 = table does not exist → on ignore silencieusement
    console.warn('[STRIPE WEBHOOK] Erreur upsert profiles:', profileErr.message);
  }

  console.log(`[STRIPE WEBHOOK] ✅ Plan de ${email} → ${planId}`);
}

/**
 * POST /   (monté en tant que /webhook/stripe dans index.js)
 *
 * express.raw() ici est CRITIQUE : il remplace express.json() pour cette route
 * afin de conserver le body brut nécessaire à stripe.webhooks.constructEvent().
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[STRIPE WEBHOOK] ⚠ STRIPE_WEBHOOK_SECRET non configuré — vérifiez Railway.');
    return res.status(500).json({ error: 'Configuration manquante : STRIPE_WEBHOOK_SECRET' });
  }

  // ── Vérification de la signature ─────────────────────────────────────────────
  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Signature invalide :', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[STRIPE WEBHOOK] Événement reçu : ${event.type}`);

  // ── Traitement des événements ─────────────────────────────────────────────────
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    switch (event.type) {

      /* ------------------------------------------------------------------ */
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;

        // Les line_items ne sont pas toujours inclus dans le payload → expand si besoin
        let priceId = session.line_items?.data?.[0]?.price?.id;
        if (!priceId && session.id) {
          const expanded = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
          priceId = expanded.line_items?.data?.[0]?.price?.id;
        }

        const plan = PRICE_TO_PLAN[priceId] || 'starter';
        console.log(`[STRIPE WEBHOOK] checkout.session.completed — email=${email}, priceId=${priceId}, plan=${plan}`);

        if (email) await updateUserPlan(email, plan);
        break;
      }

      /* ------------------------------------------------------------------ */
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId] || 'starter';

        const customer = await stripe.customers.retrieve(sub.customer);
        const email = customer?.email;

        console.log(`[STRIPE WEBHOOK] subscription.updated — email=${email}, priceId=${priceId}, plan=${plan}`);
        if (email) await updateUserPlan(email, plan);
        break;
      }

      /* ------------------------------------------------------------------ */
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const email = customer?.email;

        console.log(`[STRIPE WEBHOOK] subscription.deleted — email=${email} → retour starter`);
        if (email) await updateUserPlan(email, 'starter');
        break;
      }

      /* ------------------------------------------------------------------ */
      default:
        // Événement non géré — on acquitte sans erreur
        break;
    }

    // Stripe considère un 2xx comme réception réussie
    res.json({ received: true, type: event.type });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Erreur traitement :', err.message, err.stack);
    // On répond 200 pour éviter que Stripe renouvelle en boucle (sauf erreurs fatales)
    res.json({ received: true, warning: err.message });
  }
});

module.exports = router;
