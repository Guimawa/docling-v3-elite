/**
 * Fond d’ambiance : mesh conique + blobs organiques animés (couleurs par data-theme).
 * Décoratif uniquement — masqué ou figé si prefers-reduced-motion.
 */
export default function AppAmbientBackground() {
  return (
    <div className="app-ambient" aria-hidden="true">
      <div className="app-ambient__mesh" />
      <div className="app-ambient__blob app-ambient__blob--1" />
      <div className="app-ambient__blob app-ambient__blob--2" />
      <div className="app-ambient__blob app-ambient__blob--3" />
    </div>
  )
}
