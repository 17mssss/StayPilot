# Déploiement StayPilot — Guide complet

## Prérequis

- **VPS Hetzner CX21** minimum (2 vCPU, 4 Go RAM, 40 Go SSD)
- Nom de domaine pointant sur l'IP du VPS (enregistrement A)
- Accès SSH root

---

## 1. Installation du serveur

```bash
ssh root@TON_IP

# Mise à jour
apt update && apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Docker Compose
apt install docker-compose -y

# Vérification
docker --version
docker-compose --version
```

---

## 2. Cloner le projet

```bash
mkdir /opt/staypilot && cd /opt/staypilot
git clone https://github.com/TON_ORG/staypilot.git .
# OU copier les fichiers manuellement via scp
```

---

## 3. Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

### Section à remplir OBLIGATOIREMENT :

```env
# ============================================================
# À REMPLIR POUR CHAQUE CLIENT
# ============================================================
DOMAIN=app.maconciergerie.fr       # ton domaine
SUPERHOTE_API_KEY=                 # Superhote → Paramètres → API
TWILIO_PHONE_NUMBER=+33XXXXXXXXX   # Twilio → Phone Numbers
CLIENT_NAME=Ma Conciergerie        # Nom affiché dans les PDFs
CLIENT_COMMISSION_RATE=20          # Taux de commission en %
```

### Section infrastructure (partagée entre clients) :

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
SENDGRID_API_KEY=SG.xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
```

---

## 4. Certificats SSL (Let's Encrypt)

```bash
apt install certbot -y

# Arrêter temporairement nginx si actif
# Générer le certificat
certbot certonly --standalone -d ton-domaine.com

# Copier les certificats
mkdir -p /opt/staypilot/certs
cp /etc/letsencrypt/live/ton-domaine.com/fullchain.pem /opt/staypilot/certs/
cp /etc/letsencrypt/live/ton-domaine.com/privkey.pem   /opt/staypilot/certs/
chmod 644 /opt/staypilot/certs/*.pem
```

---

## 5. Build des frontends

```bash
# Frontend Admin
cd /opt/staypilot/frontend-admin
npm install
VITE_API_URL=https://ton-domaine.com VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=xxx npm run build

# Frontend Owner
cd /opt/staypilot/frontend-owner
npm install
VITE_API_URL=https://ton-domaine.com VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=xxx npm run build
```

---

## 6. Démarrer les services

```bash
cd /opt/staypilot
docker-compose up -d --build

# Vérifier que tout tourne
docker-compose ps
docker-compose logs backend --tail=50
```

### Vérification rapide :
```bash
curl https://ton-domaine.com/health
# Réponse attendue : {"status":"ok","client":"Ma Conciergerie",...}
```

---

## 7. Configurer Supabase

Dans **app.supabase.com → ton projet → SQL Editor**, exécuter :

```sql
-- Clients (conciergeries)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nom text,
  plan text default 'free',
  created_at timestamp default now()
);

-- Logements
create table if not exists logements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  nom text,
  superhote_property_key text,
  superhote_api_key text,
  canaux jsonb default '{"sms": false, "email": true, "whatsapp": false}',
  autopilote boolean default false,
  created_at timestamp default now()
);

-- Réservations
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  logement_id uuid references logements(id),
  superhote_id text unique,
  voyageur_nom text,
  voyageur_email text,
  voyageur_telephone text,
  checkin date,
  checkout date,
  statut text default 'confirmee',
  created_at timestamp default now()
);

-- Templates de messages
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  nom text,
  declencheur text,
  canal text,
  sujet text,
  contenu text,
  delai_heures int default 0,
  actif boolean default true,
  created_at timestamp default now()
);

-- Messages (inbox)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references reservations(id),
  direction text,
  canal text,
  contenu text,
  statut text default 'envoye',
  genere_par_ia boolean default false,
  valide boolean default true,
  created_at timestamp default now()
);

-- Factures
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  invoice_number text unique not null,
  type text default 'commission',
  status text default 'generated',
  recipient_data jsonb,
  rows_data jsonb,
  total_ht decimal(10,2),
  tva_amount decimal(10,2),
  total_ttc decimal(10,2),
  pdf_url text,
  pdf_data text,
  sent_to text,
  sent_at timestamp,
  created_at timestamp default now()
);

-- Logs de synchronisation
create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  logement_id uuid references logements(id),
  action text,
  statut text,
  details jsonb,
  created_at timestamp default now()
);

-- Créer un client test
insert into clients (email, nom, plan) values ('admin@maconciergerie.fr', 'Ma Conciergerie', 'pro')
on conflict (email) do nothing;
```

Ensuite dans **Authentication → Users**, créer l'utilisateur admin avec la même adresse email.

---

## 8. Import des workflows n8n

1. Accéder à `https://ton-domaine.com/n8n/`
2. Login : `N8N_USER` / `N8N_PASSWORD` du `.env`
3. Menu (☰) → **Import from file** → importer les 3 fichiers :
   - `n8n-workflows/workflow-1-polling-superhote.json`
   - `n8n-workflows/workflow-2-scheduler-messages.json`
   - `n8n-workflows/workflow-3-webhook-messages-entrants.json`

---

## 9. Ajouter les credentials n8n

Dans **n8n → Credentials** (icône clé) :

### "Superhote API" (Header Auth)
- Name: `Superhote API`
- Header Name: `X-Api-Key`
- Header Value: `[SUPERHOTE_API_KEY du .env]`

### "Backend Internal" (Header Auth)
- Name: `Backend Internal`
- Header Name: `Authorization`
- Header Value: `Bearer [JWT_INTERNE — peut être vide en dev]`

---

## 10. Activer les workflows

Dans chaque workflow, cliquer sur le toggle **"Active"** en haut à droite.

---

## 11. Configurer Twilio (réception SMS)

Dans **console.twilio.com → Phone Numbers → ton numéro** :
- **SMS Webhook URL** : `https://ton-domaine.com/webhook/twilio/sms`
- **Méthode** : POST

---

## 12. Test de bout en bout

```bash
# 1. Health check
curl https://ton-domaine.com/health

# 2. Login (via l'app admin)
# Aller sur https://ton-domaine.com/admin

# 3. Déclencher le polling manuellement
curl -X POST https://ton-domaine.com/api/messages/trigger-scheduler \
  -H "Authorization: Bearer TOKEN"

# 4. Vérifier les logs
docker-compose logs backend -f
docker-compose logs n8n -f
```

---

## Renouvellement SSL automatique

```bash
crontab -e
# Ajouter :
0 3 * * 0 certbot renew --quiet && \
  cp /etc/letsencrypt/live/ton-domaine.com/*.pem /opt/staypilot/certs/ && \
  docker-compose -f /opt/staypilot/docker-compose.yml restart nginx
```

---

## ✅ Résumé — Activation d'un nouveau client

```
1. cp .env.example .env
2. Remplir la section "À REMPLIR POUR CHAQUE CLIENT"
3. docker-compose up -d --build
4. Importer les 3 workflows n8n
5. Ajouter credentials "Superhote API" dans n8n
6. Activer les 3 workflows
7. ✅ Client opérationnel
```
