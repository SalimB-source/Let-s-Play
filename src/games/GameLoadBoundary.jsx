import { Component } from 'react';
import { messageChargementJeu } from './chargementJeu.js';
import './game-load-boundary.css';

/**
 * Le filet du Sablier — src/games/GameLoadBoundary.jsx
 * ----------------------------------------------------
 * Sans lui, un morceau du jeu qui n'arrive pas (connexion coupée, redéploiement
 * pendant que la page était ouverte, extension qui bloque `/assets/`) rejette
 * dans `lazy()` et React **démonte toute la page** : le joueur ne voit qu'un
 * écran noir, sans un mot d'explication — c'est exactement le symptôme
 * « le Sablier ne se lance pas ».
 *
 * Ici, l'erreur est retenue et remplacée par un écran qui dit ce qui s'est
 * passé et propose de recharger la page. Le rechargement est aussi la bonne
 * réponse au cas le plus courant : l'ancien nom du morceau n'existe plus sur
 * le serveur après un déploiement, et une page fraîche repart sur les bons
 * fichiers.
 *
 * Le composant reste un garde-fou : quand tout va bien, il rend ses enfants
 * tels quels, sans enveloppe ni style.
 */
export default class GameLoadBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
    this.recharger = this.recharger.bind(this);
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    // La cause exacte reste dans la console pour le diagnostic.
    // eslint-disable-next-line no-console
    console.error('[jeu] le chargement a échoué', erreur, info?.componentStack);
  }

  recharger() {
    try {
      window.location.reload();
    } catch {
      /* pas de DOM (rendu de test) : rien à recharger */
    }
  }

  render() {
    const { erreur } = this.state;
    if (!erreur) return this.props.children;
    const jeu = this.props.jeu || 'Le jeu';
    return (
      <div className="charge-erreur" role="alert">
        <div className="charge-erreur__carte">
          <p className="charge-erreur__surtitre">Let’s Play · arcade</p>
          <h1 className="charge-erreur__titre">{jeu} n’a pas pu se charger</h1>
          <p className="charge-erreur__texte">{messageChargementJeu(erreur)}</p>
          <p className="charge-erreur__texte">
            Rien n’est perdu : decks, collection et progression restent enregistrés
            sur cet appareil et sur ton compte.
          </p>
          <div className="charge-erreur__actions">
            <button type="button" className="charge-erreur__btn" onClick={this.recharger}>
              Recharger la page
            </button>
          </div>
          <p className="charge-erreur__note">
            Si le message revient, force le rechargement sans cache :{' '}
            <kbd>Ctrl</kbd> + <kbd>Maj</kbd> + <kbd>R</kbd> (sur Mac,{' '}
            <kbd>Cmd</kbd> + <kbd>Maj</kbd> + <kbd>R</kbd>).
          </p>
          <details className="charge-erreur__details">
            <summary>Détail technique</summary>
            <pre>{String(erreur?.stack || erreur?.message || erreur)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
