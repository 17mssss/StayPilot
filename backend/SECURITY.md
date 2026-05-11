# StayPilot Backend — Security Documentation

## Mesures de sécurité en place

### Authentification & Autorisation
- **JWT Supabase** : chaque requête authentifiée valide le token via `supabase.auth.getUser(token)`. Aucun bypass en production ou développement.
- **`client_id` isolation** : toutes les requêtes de lecture/écriture filtrent par `client_id = req.clientId` pour empêcher l'accès aux données d'un autre client.
- **Logs de sécurité auth** : chaque échec d'authentification est loggué avec `IP`, `méthode`, `path` et le préfixe du token (8 chars), sans exposer le token complet.

### Rate Limiting
- **Global** : 200 req/min par IP sur toutes les routes.
- **Strict (5 req/min)** appliqué sur :
  - `POST /api/contact` — formulaire de démo public (anti-spam email)
  - `POST /api/avis/:id/generate-response` — appel API Anthropic
  - `POST /api/livrets` — création livret
  - `POST /api/invoices/:id/send` — envoi de factures par email
  - `POST /api/invoices/send-direct`
  - `POST /api/simulation/test-sms`
  - `POST /api/simulation/test-email`
  - `POST /api/simulation/test-ia`

### Headers HTTP de sécurité (Helmet)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS 1 an)
- `Content-Security-Policy` : désactivé intentionnellement (API JSON, pas de HTML servi)
- `Cross-Origin-Embedder-Policy` : désactivé intentionnellement

### CORS
- Liste blanche explicite des origines autorisées (pas de wildcard).
- Toute origine non listée est bloquée et loggée.
- Variables d'environnement : `FRONTEND_ADMIN_URL`, `FRONTEND_OWNER_URL`, `FRONTEND_URL`.

### Validation des inputs
- **Zod** : schémas de validation sur toutes les routes POST/PATCH critiques (logements, messages, templates, avis, livrets, reservations).
- **Limites de longueur** sur tous les champs texte :
  - Noms : max 100 caractères
  - Messages / corps de templates : max 5 000 caractères
  - Emails : max 254 caractères
  - Sujets email : max 200 caractères
  - Réponses admin (avis) : max 2 000 caractères
- **Format email** validé par regex dans `contact.js`.
- **Enums** pour les canaux (`sms`, `email`, `whatsapp`) et plateformes avis.

### Protection XSS (contact.js)
- Tous les champs injectés dans le HTML de l'email (`name`, `email`, `phone`, `message`) sont passés par `escapeHtml()` avant insertion dans le template.

### Validation UUID des paramètres d'URL
- Helper `validateUUID(id)` (regex RFC 4122) exporté depuis `middleware/auth.js`.
- Appliqué sur tous les endpoints `/:id` dans : `logements`, `messages`, `templates`, `avis`, `livrets`.
- Retourne `400 ID invalide` pour tout paramètre mal formé, empêchant les injections de paramètres.

### Protection Stripe Webhook
- Le body brut (Buffer) est préservé pour la vérification de signature HMAC Stripe.
- Le router Stripe est enregistré avant `express.json()`.

### Gestion des erreurs
- En production : message générique retourné au client + référence traçable (`ERR-XXXXX`) dans les logs. Aucune information interne (stack trace, message d'erreur interne) n'est exposée.
- En développement : message d'erreur complet pour faciliter le debug.

### Validation au démarrage
- Vérification des variables d'environnement critiques au démarrage (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NODE_ENV`).
- Avertissement explicite en production si `FRONTEND_ADMIN_URL`, `FRONTEND_OWNER_URL`, `WEBHOOK_SECRET` sont absents.
- Rappel Supabase RLS au démarrage en production.

---

## Variables d'environnement requises

### Obligatoires
| Variable | Description |
|---|---|
| `NODE_ENV` | `production` ou `development` |
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase (anon key) |

### Obligatoires en production
| Variable | Description |
|---|---|
| `FRONTEND_ADMIN_URL` | URL du frontend admin (ex: `https://app.staypilot.cc`) |
| `FRONTEND_OWNER_URL` | URL du frontend propriétaire |
| `WEBHOOK_SECRET` | Secret partagé pour les webhooks n8n/Twilio |
| `SMTP_USER` | Identifiant SMTP IONOS |
| `SMTP_PASSWORD` | Mot de passe SMTP IONOS |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret de vérification des webhooks Stripe |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (Claude) |

### Optionnelles
| Variable | Description |
|---|---|
| `FRONTEND_URL` | URL supplémentaire autorisée en CORS |
| `PORT` | Port d'écoute (défaut: 3001) |
| `CLIENT_NAME` | Nom du client affiché au démarrage |
| `ENABLE_POLLING` | `false` pour désactiver le polling Superhote/CM |
| `ENABLE_SCHEDULER` | `false` pour désactiver le scheduler de messages |

---

## Ce qui reste à faire (TODO sécurité)

### Priorité haute
- [ ] **RLS Supabase** : vérifier et activer le Row Level Security sur toutes les tables (`logements`, `reservations`, `messages`, `templates`, `avis`, `livrets`, `maintenances`, `invoices`). Supabase Dashboard → Authentication → Policies.
- [ ] **Service Role Key** : si des opérations admin utilisent la `service_role` key, s'assurer qu'elle n'est pas exposée côté client et que les routes concernées sont protégées.
- [ ] **Rotation des secrets** : mettre en place une rotation régulière de `WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, et `ANTHROPIC_API_KEY`.

### Priorité moyenne
- [ ] **Audit logs** : centraliser les logs de sécurité (auth failures, rate limit hits) dans un service dédié (ex: Datadog, Logtail) plutôt que `console.warn`.
- [ ] **Validation UUID dans les autres routes** : étendre `validateUUID` aux routes `reservations`, `invoices`, `maintenances`, `menage`, `documents`, `owner-messages`.
- [ ] **Limit upload body** : réduire le body limit `2mb` à la taille réelle nécessaire par route si possible.
- [ ] **Sanitisation XSS généralisée** : pour les routes qui envoient des emails autres que contact (invoices, messages email), vérifier la sanitisation des données voyageur issues de la base.

### Priorité basse
- [ ] **CSP pour le frontend** : si le frontend sert du HTML (SSR), activer Content-Security-Policy avec une whitelist d'origines.
- [ ] **Tests de sécurité automatisés** : intégrer OWASP ZAP ou un scan de dépendances (`npm audit`) dans la CI/CD.
- [ ] **Expiration des sessions** : vérifier la durée de vie des JWT Supabase et forcer la ré-authentification selon la politique de sécurité souhaitée.
