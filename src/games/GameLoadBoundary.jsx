import { Component } from 'react';
import { messageChargementJeu, tenterRechargementSecours } from './chargementJeu.js';
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
    this.state = { erreur: null, rechargementAuto: false };
    this.recharger = this.recharger.bind(this);
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    // La cause exacte reste dans la console pour le diagnostic.
    // eslint-disable-next-line no-console
    console.error('[jeu] le chargement a échoué', erreur, info?.componentStack);
    // Le cas courant n'est pas une panne : le site vient d'être redéployé et
    // l'ancien nom du morceau n'existe plus. Une page neuve suffit — on la
    // recharge tout seul, une fois, au lieu d'afficher une carte d'erreur.
    // `securite` : couture de test (fenêtre et mémoire injectées) ; en
    // production, la prop est absente et les globaux prennent le relais.
    const parti = tenterRechargementSecours({ erreur, ...(this.props.securite || {}) });
    if (parti) this.setState({ rechargementAuto: true });
  }

  recharger() {
    try {
      window.location.reload();
    } catch {
      /* pas de DOM (rendu de test) : rien à recharger */
    }
  }

  render() {
    const { erreur, rechargementAuto } = this.state;
    if (!erreur) return this.props.children;
    const jeu = this.props.jeu || 'Le jeu';
    // Le rechargement est déjà parti : la page va disparaître. On le dit
    // franchement plutôt que de laisser croire à un plantage — et le bouton
    // reste là au cas où la navigation serait bloquée (WebView figée).
    if (rechargementAuto) {
      return (
        <div className="charge-erreur" role="status" aria-live="polite">
          <div className="charge-erreur__carte">
            <p className="charge-erreur__surtitre">Let’s Play · arcade</p>
            <h1 className="charge-erreur__titre">{jeu} se met à jour…</h1>
            <p className="charge-erreur__texte">
              Une nouvelle version du jeu vient d’être publiée : on recharge la page
              avec les bons fichiers. Tes decks, ta collection et ta progression ne
              bougent pas.
            </p>
            <div className="charge-erreur__actions">
              <button type="button" className="charge-erreur__btn" onClick={this.recharger}>
                Recharger maintenant
              </button>
            </div>
            <p className="charge-erreur__note">
              Si rien ne se passe au bout de quelques secondes, appuie sur le bouton.
            </p>
          </div>
        </div>
      );
    }
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
            Le jeu a déjà retenté le téléchargement trois fois, puis rechargé la page
            une fois tout seul : si ce message revient, c’est le serveur ou le réseau.
            Force alors le rechargement sans cache :{' '}
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
