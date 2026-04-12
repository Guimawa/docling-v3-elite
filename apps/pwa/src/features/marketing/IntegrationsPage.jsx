import { Link } from 'react-router-dom'

/**
 * Page produit — intégrations & exports (roadmap webhooks / compta).
 * Répond au gap « intégrations » de l’audit 360 (visibilité acheteur / AP).
 */
export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="font-heading text-3xl text-text-primary">Intégrations & exports</h1>
      <p className="text-sm leading-relaxed text-text-secondary">
        Docling expose une <strong className="text-text-primary">API REST</strong> (authentification par session,
        cookies httpOnly) pour le scan, le catalogue, l’historique et la communauté. Export CSV disponible depuis le
        catalogue ; export JSON RGPD depuis les réglages.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-text-secondary">
        <li>Catalogue et validation s’appuient sur les mêmes endpoints documentés côté client.</li>
        <li>
          Feuille de route : webhooks (facture validée), connecteurs comptabilité — contactez-nous via la page{' '}
          <Link to="/aide" className="font-medium text-primary underline-offset-2 hover:underline">
            Aide
          </Link>
          .
        </li>
      </ul>
    </div>
  )
}
