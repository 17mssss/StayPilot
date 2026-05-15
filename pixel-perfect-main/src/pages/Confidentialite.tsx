import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-semibold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : mai 2026 — Conforme RGPD</p>

        <div className="space-y-8 text-foreground/90 leading-relaxed text-sm">

          <section>
            <h2 className="text-lg font-medium mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles collectées via StayPilot est StayPilot SAS, joignable à
              l'adresse :{' '}
              <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">2. Données collectées</h2>
            <p className="mb-2">Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse email, mot de passe (hashé)</li>
              <li><strong>Données de facturation :</strong> adresse de facturation, derniers chiffres de carte bancaire (via Stripe, nous ne stockons pas les données de carte)</li>
              <li><strong>Données d'usage :</strong> logements créés, réservations, missions de ménage, messages, paramètres de configuration</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur, identifiant d'appareil de confiance (device trust)</li>
              <li><strong>Données des voyageurs :</strong> nom, email et téléphone des voyageurs saisis par l'utilisateur dans le CRM</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">3. Finalités du traitement</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Fourniture et amélioration du service StayPilot</li>
              <li>Gestion de l'authentification et de la sécurité des comptes</li>
              <li>Traitement des paiements et gestion de l'abonnement</li>
              <li>Envoi d'emails transactionnels (confirmation, OTP, reset de mot de passe)</li>
              <li>Support client et communication relative au service</li>
              <li>Respect des obligations légales et comptables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">4. Base légale</h2>
            <p>
              Le traitement est fondé sur l'exécution du contrat (art. 6.1.b RGPD) pour les données nécessaires à la
              fourniture du service, et sur notre intérêt légitime (art. 6.1.f RGPD) pour les données de sécurité et
              d'amélioration du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">5. Sous-traitants</h2>
            <p className="mb-2">Vos données peuvent être partagées avec les sous-traitants suivants :</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Sous-traitant</th>
                  <th className="text-left py-2 pr-4 font-medium">Rôle</th>
                  <th className="text-left py-2 font-medium">Localisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Base de données & authentification</td><td className="py-2">UE / USA (EU region)</td></tr>
                <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Paiement</td><td className="py-2">USA (clauses contractuelles types)</td></tr>
                <tr><td className="py-2 pr-4">SendGrid (Twilio)</td><td className="py-2 pr-4">Emails transactionnels</td><td className="py-2">USA (clauses contractuelles types)</td></tr>
                <tr><td className="py-2 pr-4">Railway</td><td className="py-2 pr-4">Hébergement backend</td><td className="py-2">USA</td></tr>
                <tr><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hébergement frontend</td><td className="py-2">USA (clauses contractuelles types)</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">6. Durée de conservation</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Données de compte actif : pendant toute la durée de l'abonnement</li>
              <li>Après résiliation : 3 ans pour les données comptables (obligation légale), 1 an pour les données d'usage</li>
              <li>Logs de sécurité : 6 mois</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">7. Vos droits</h2>
            <p className="mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Droit d'accès</strong> (art. 15) : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> (art. 16) : corriger des données inexactes</li>
              <li><strong>Droit à l'effacement</strong> (art. 17) : supprimer vos données («&nbsp;droit à l'oubli&nbsp;»)</li>
              <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition</strong> (art. 21) : s'opposer à certains traitements</li>
              <li><strong>Droit à la limitation</strong> (art. 18) : limiter le traitement</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à :{' '}
              <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a>.
              Vous pouvez également introduire une réclamation auprès de la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">CNIL</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">8. Cookies</h2>
            <p>
              StayPilot utilise uniquement des cookies strictement nécessaires au fonctionnement du service
              (authentification, préférences d'interface). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">9. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
              chiffrement HTTPS (TLS 1.3), authentification double facteur disponible, mots de passe hashés (bcrypt via
              Supabase Auth), accès aux données limité au personnel autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">10. Modifications</h2>
            <p>
              Nous nous réservons le droit de modifier cette politique à tout moment. Les utilisateurs seront informés par
              email en cas de modification substantielle. La version en vigueur est toujours accessible sur cette page.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
