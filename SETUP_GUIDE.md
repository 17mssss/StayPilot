# StayPilot — Guide de configuration production

## 1. Stripe Live (prise de paiements réels)

### Étape 1 — Activer votre compte Stripe
1. Allez sur https://dashboard.stripe.com
2. Complétez la vérification de votre identité (obligatoire pour encaisser)
3. Renseignez les coordonnées bancaires pour les virements

### Étape 2 — Créer les produits et abonnements
1. Dashboard Stripe → **Produits** → Nouveau produit
2. Créez 3 produits :
   - StayPilot Starter → Prix récurrent : **59 €/mois**
   - StayPilot Pro → Prix récurrent : **99 €/mois**
   - StayPilot Business → Prix sur devis (ne pas créer de prix automatique)
3. Notez les **Price IDs** (format `price_xxxxxxxx`) pour Starter et Pro

### Étape 3 — Créer les Payment Links Stripe
1. Dashboard Stripe → **Payment Links** → Nouveau
2. Créez un lien pour le plan Starter (Price ID Starter)
3. Créez un lien pour le plan Pro (Price ID Pro)
4. Notez les URLs (format `https://buy.stripe.com/xxxxxxxxx`)

### Étape 4 — Variables d'environnement Railway (backend)
Ajoutez dans Railway → Variables (récupérer les valeurs dans votre dashboard Stripe) :
```
STRIPE_SECRET_KEY=<votre clé secrète live depuis Stripe Dashboard → Développeurs → Clés API>
STRIPE_WEBHOOK_SECRET=<signing secret depuis Stripe Dashboard → Webhooks>
STRIPE_PRICE_STARTER=<price_ID du plan Starter>
STRIPE_PRICE_PRO=<price_ID du plan Pro>
STRIPE_PRICE_BUSINESS=<price_ID du plan Business, si applicable>
```

### Étape 5 — Variables d'environnement Vercel (frontend-admin)
Ajoutez dans Vercel → frontend-admin-neon-nine → Settings → Environment Variables :
```
VITE_STRIPE_LINK_STARTER=https://buy.stripe.com/LIVE_STARTER
VITE_STRIPE_LINK_PRO=https://buy.stripe.com/LIVE_PRO
VITE_STRIPE_LINK_BUSINESS=mailto:contact@staypilot.cc?subject=Plan Business
```

### Étape 6 — Configurer le webhook Stripe
1. Dashboard Stripe → **Développeurs** → Webhooks → Nouveau endpoint
2. URL : `https://staypilot-production-0e49.up.railway.app/webhook/stripe`
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiez le **Signing secret** (whsec_xxx) → Railway `STRIPE_WEBHOOK_SECRET`

---

## 2. Sentry (monitoring erreurs)

### Créer les projets Sentry
1. Allez sur https://sentry.io → Nouveau projet → React
2. Créez 2 projets : `staypilot-admin` et `cleanpilot`
3. Récupérez le **DSN** de chaque projet (format `https://xxx@oXXXX.ingest.sentry.io/XXXXX`)

### Variables Vercel — frontend-admin-neon-nine
```
VITE_SENTRY_DSN=https://xxx@oXXXX.ingest.sentry.io/XXXXX
```

### Variables Vercel — cleanpilot-xi
```
VITE_SENTRY_DSN=https://yyy@oXXXX.ingest.sentry.io/YYYYY
```

---

## 3. Domaine custom CleanPilot (cleanpilot.staypilot.cc)

### Étape 1 — Ajouter le domaine sur Vercel
1. Vercel → Projet `cleanpilot-xi` → Settings → Domains
2. Ajouter : `cleanpilot.staypilot.cc`
3. Vercel vous donnera un enregistrement DNS à ajouter

### Étape 2 — Configurer le DNS
Chez votre registrar (OVH, Namecheap, Cloudflare...), ajoutez :
```
Type    : CNAME
Nom     : cleanpilot
Valeur  : cname.vercel-dns.com
TTL     : 300
```
*(ou la valeur exacte fournie par Vercel à l'étape précédente)*

### Étape 3 — Vérifier
Après propagation DNS (5-30 min), `https://cleanpilot.staypilot.cc` doit afficher CleanPilot.

---

## 4. Domaines custom Admin & Proprio (optionnel)

Même procédure pour :
- `app.staypilot.cc` → Vercel `frontend-admin-neon-nine`
- `proprio.staypilot.cc` → Vercel `frontend-owner`

Variables Railway à mettre à jour :
```
FRONTEND_ADMIN_URL=https://app.staypilot.cc
FRONTEND_OWNER_URL=https://proprio.staypilot.cc
FRONTEND_CLEANPILOT_URL=https://cleanpilot.staypilot.cc
```

---

## 5. SendGrid — Vérifier le domaine expéditeur

1. Dashboard SendGrid → Settings → Sender Authentication
2. Vérifier le domaine `staypilot.cc` (ou créer un sender unique `noreply@staypilot.cc`)
3. Ajoutez les enregistrements DNS fournis par SendGrid chez votre registrar

Variables Railway :
```
SENDGRID_API_KEY=<votre clé depuis app.sendgrid.com → Settings → API Keys>
SENDGRID_FROM_EMAIL=noreply@staypilot.cc
SENDGRID_FROM_NAME=StayPilot
```

---

## Checklist de mise en production

- [ ] Compte Stripe activé (identité vérifiée)
- [ ] Price IDs live configurés dans Railway
- [ ] Webhook Stripe configuré et testé
- [ ] Payment Links live dans Vercel frontend-admin
- [ ] Domaine staypilot.cc pointé vers la landing page
- [ ] Domaine cleanpilot.staypilot.cc pointé vers CleanPilot
- [ ] SendGrid domaine expéditeur vérifié
- [ ] Sentry DSN configuré dans les 2 frontends Vercel
- [ ] Test d'un paiement réel de bout en bout (5€ test Stripe)
- [ ] Test d'email transactionnel (inscription, OTP, reset)
