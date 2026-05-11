# 🚀 Guide Chemin 1 — Livraison manuelle d'un client StayPilot

> **Pour qui ?** Toi, quand un client achète StayPilot avant que la livraison soit automatisée.
> **Durée totale :** ~8 minutes par nouveau client.
> **Ce qu'il te faut :** Accès Stripe Dashboard, accès Supabase, une adresse email pro.

---

## Vue d'ensemble du flux

```
Client visite la landing page
      ↓
Il clique sur "Démarrer" → paye via Stripe (déjà intégré)
      ↓
Tu reçois un email de confirmation Stripe
      ↓
Tu crées son compte dans Supabase (3 min)
      ↓
Tu lui envoies ses accès par email (2 min)
      ↓
Il se connecte → vérifie son appareil (OTP) → accès à l'app ✅
```

---

## ÉTAPE 1 — Vérifier les notifications Stripe

> Les liens de paiement sont **déjà sur ta landing page** — rien à créer.
> Tu dois juste t'assurer de recevoir les alertes quand quelqu'un paye.

Dashboard Stripe → **Settings** → **Email notifications** → vérifier que ces cases sont cochées :
- ✅ **Successful payments**
- ✅ **Failed payments**
- ✅ **Subscription started**

Si ce n'est pas encore fait, active-les maintenant — c'est ton signal d'action à chaque vente.

---

## ÉTAPE 2 — Quand un client paye

### 2.1 Email Stripe reçu

Quand Stripe t'envoie `"Payment succeeded"`, note :
- ✅ L'email du client
- ✅ Le plan acheté (Starter ou Pro)
- ✅ Le montant et la date

### 2.2 Vérifier le paiement dans Stripe

Dashboard → **Payments** → vérifie que le paiement est bien en statut `Succeeded` (pas `Pending` ni `Failed`).

> ⚠️ **Ne crée jamais un compte avant que le paiement soit confirmé `Succeeded`.**

---

## ÉTAPE 3 — Créer le compte client dans Supabase

### 3.1 Se connecter à Supabase

Rends-toi sur [supabase.com](https://supabase.com) → ton projet StayPilot → **Authentication**.

### 3.2 Créer l'utilisateur

1. **Authentication** → **Users** → bouton **"Invite user"** (ou **"Add user"**)
2. Remplir :
   - **Email :** l'email du client (exactement comme dans Stripe)
   - **Password :** générer un mot de passe temporaire fort (voir note ci-dessous)
3. Cliquer **Create user**
4. Noter l'**UUID** de l'utilisateur créé (visible dans la liste)

> 💡 **Générer un mot de passe temporaire fort :** utilise un générateur comme `pwgen` ou une combinaison du type `Saison-Année-4chiffres` ex: `Printemps2026-7842`. Le client devra le changer à la première connexion (tu peux le lui demander par email).

### 3.3 Assigner le bon plan dans la base

1. Aller dans **Table Editor** → table `profiles`
2. Trouver la ligne avec l'**user_id** de ton nouveau client (l'UUID noté à l'étape 3.2)
3. Mettre à jour le champ `plan` selon ce qu'il a acheté :
   - Starter → `starter`
   - Pro → `pro`
   - Business → `business`
4. Cliquer **Save**

> ⚠️ **Sans cette étape, le client aura accès gratuit uniquement.** C'est l'étape la plus importante.

### 3.4 Optionnel — Ajouter son nom

Dans la même ligne de `profiles`, tu peux remplir :
- `first_name` : prénom du client
- `last_name` : nom du client

---

## ÉTAPE 4 — Envoyer les accès au client

Envoie l'email suivant (adapte selon le plan acheté) :

---

**Objet :** ✅ Votre accès StayPilot est prêt !

```
Bonjour [Prénom],

Votre abonnement StayPilot [Starter / Pro] est confirmé. 🎉

Voici vos identifiants de connexion :

🔗 Lien d'accès : https://[votre-url-vercel].vercel.app
📧 Email       : [email du client]
🔑 Mot de passe: [mot de passe temporaire]

👉 Connexion sécurisée : lors de votre première connexion,
   un code à 6 chiffres vous sera envoyé sur cet email
   pour vérifier votre appareil. C'est normal et ne se
   produit qu'une seule fois par appareil.

Je vous recommande de changer votre mot de passe après
votre première connexion (Paramètres → Mon compte).

N'hésitez pas à me contacter si vous avez des questions.

À votre service,
[Ton prénom]
StayPilot
```

---

> 💡 **Astuce :** garde un template de cet email dans Notion, Google Docs ou Apple Notes. Tu le copies/colles à chaque nouveau client en changeant juste les 3 informations.

---

## ÉTAPE 5 — Suivi et récurrence Stripe

### 5.1 Stripe gère les renouvellements automatiquement

Une fois l'abonnement créé, Stripe :
- Prélève automatiquement chaque mois
- T'envoie un email si un paiement échoue
- Envoie un email de reçu au client

**Tu n'as rien à faire chaque mois** — seulement si un paiement échoue.

### 5.2 Si un paiement mensuel échoue

Dashboard Stripe → **Subscriptions** → voir les subscriptions en `Past due`.

Options :
1. Contacter le client par email pour mettre à jour sa carte
2. Stripe relance automatiquement 3 fois (configurable)
3. Si aucun paiement après les relances : annuler manuellement la subscription + désactiver le compte (mettre `plan` à `free` dans Supabase)

---

## ÉTAPE 6 — Si un client veut annuler

1. Dashboard Stripe → **Subscriptions** → trouver le client → **Cancel subscription**
   - Option recommandée : **"Cancel at period end"** (il garde l'accès jusqu'à la fin du mois payé)
2. Mettre à jour Supabase : `profiles.plan` → `free`
3. Envoyer un email de confirmation d'annulation

---

## Checklist complète par client

Colle cette checklist dans Notion/Excel et coche à chaque nouveau client :

```
□ Paiement Stripe confirmé (Succeeded)
□ Compte créé dans Supabase (Authentication → Users)
□ Plan assigné dans profiles (starter / pro / business)
□ Prénom/Nom rempli (optionnel mais sympa)
□ Email d'accès envoyé au client
□ Client confirmé avoir reçu l'email et pu se connecter
```

---

## Récapitulatif des liens utiles

| Ressource | URL |
|-----------|-----|
| Dashboard Stripe | https://dashboard.stripe.com |
| Supabase (ton projet) | https://app.supabase.com |
| Landing page (liens de paiement intégrés) | https://staypilot.cc |
| App StayPilot (production) | https://[ton-url].vercel.app |

---

## ⏱️ Temps estimé par client

| Étape | Durée |
|-------|-------|
| Vérifier le paiement Stripe | 2 min |
| Créer le compte Supabase | 3 min |
| Assigner le plan | 1 min |
| Envoyer l'email d'accès | 2 min |
| **Total** | **~8 minutes** |

---

## Quand passer au Chemin 2 (automatique) ?

Dès que la livraison manuelle commence à peser — typiquement à partir de **10-15 clients actifs**. À ce stade, tu feras développer :
- Une page `/pricing` avec boutons Stripe Checkout
- Un webhook backend qui crée automatiquement les comptes
- Des emails de bienvenue automatiques (Resend ou SendGrid)

**Mais pour les premières ventes : ne sur-développe pas. Vends d'abord.**
