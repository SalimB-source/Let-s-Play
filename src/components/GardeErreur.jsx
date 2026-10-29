import { Component } from 'react';

/**
 * Le dernier filet — `src/components/GardeErreur.jsx`
 * ===================================================
 * Une erreur non rattrapée pendant le rendu démonte tout l'arbre React : la
 * page devient vide. Sur un ordinateur, on ouvre la console ; sur un téléphone
 * — dans l'APK surtout — il ne reste qu'un écran noir et aucune explication.
 * C'est exactement ce qui s'est produit le 29 octobre.
 *
 * Ce composant enveloppe l'application entière et, à la place du vide, affiche
 * trois choses utiles : ce qui a échoué, la version du moteur d'affichage, et
 * un bouton pour recharger. Rien à installer, aucun outil de développement.
 *
 * Styles en ligne, volontairement : une feuille de style qui n'a pas chargé ne
 * doit pas pouvoir rendre le panneau illisible.
 */
export default class GardeErreur extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, infos) {
    // La console reste le premier endroit où regarder quand on branche un
    // téléphone : le panneau, lui, n'affiche que l'essentiel.
    console.error('[garde-erreur] rendu interrompu :', erreur, infos?.componentStack || '');
  }

  render() {
    const { erreur } = this.state;
    if (!erreur) return this.props.children;

    const message = erreur?.message ? String(erreur.message) : String(erreur);
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';

    return (
      <div
        role="alert"
        style={{
          position: 'fixed', inset: 0, overflow: 'auto', padding: 22,
          background: '#0b0b12', color: '#e8e8f0',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 10px' }}>Une erreur a interrompu la page</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: '#c9c9d6', margin: '0 0 16px' }}>
            Le jeu et le site restent en ligne : rechargez pour repartir de zéro.
            Une partie en cours se reprend depuis le menu.
          </p>
          <pre
            style={{
              fontSize: 13, lineHeight: 1.5, margin: '0 0 16px', padding: '12px 14px',
              borderRadius: 10, background: '#12121c', border: '1px solid #262636',
              color: '#a9a9bb', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
            }}
          >
            {message}
          </pre>
          <button
            type="button"
            onClick={() => { window.location.reload(); }}
            style={{
              fontSize: 16, padding: '12px 20px', borderRadius: 10,
              border: '1px solid #f5c451', background: '#f5c451', color: '#1a1205',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Recharger
          </button>
          <p style={{ fontSize: 11, lineHeight: 1.5, color: '#6f6f82', margin: '18px 0 0', overflowWrap: 'anywhere' }}>
            {ua}
          </p>
        </div>
      </div>
    );
  }
}
