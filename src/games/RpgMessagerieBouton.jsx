import { useFriends } from '../friends/FriendsContext.jsx';
import { useMessages } from '../messages/MessagesContext.jsx';
import { LetsTalkMark } from '../social/LetsTalkLogo.jsx';
import { exitNativeFullscreen, nativeFullscreenElement } from './gameFullscreen.js';
import './rpg-messagerie.css';

/**
 * Le bouton « Messagerie » du Sablier — `src/games/RpgMessagerieBouton.jsx`
 * -------------------------------------------------------------------------
 * La messagerie Let’s Play (« Let’s Talk ») fait partie du Sablier : c’est par
 * elle que les défis du duel en ligne se lancent et se reçoivent (la carte
 * « Défi du Sablier » de `RpgPvpCarte.jsx`, envoyée par le salon). Or le jeu
 * est une couche plein écran (`rpg-battle.css`, z-index 1500) qui couvrait
 * entièrement la fenêtre sociale (z-index 1250) : dans le jeu, impossible de
 * voir un défi reçu, ou d’aller en lancer un, sans quitter la table.
 *
 * Ce bouton vit donc **dans** les barres du jeu — le menu principal, la barre
 * du duel et le salon en ligne (`variante`) — avec la pastille des non-lus.
 * Son clic ouvre la messagerie comme partout ailleurs sur le site
 * (`openInbox` : la fenêtre sociale sur bureau, la page `/messages` sur
 * mobile) ; `SocialDock` se pose au-dessus du jeu sur les routes du Sablier
 * (voir `social-dock--sablier` dans `src/social/social.css`).
 *
 * Plein écran natif : la fenêtre sociale est rendue hors de la coque du jeu,
 * donc hors du sous-arbre plein écran quand la coque elle-même est
 * l’élément plein écran — le navigateur la reléguerait derrière le plateau,
 * illisible. Dans ce seul cas, le clic rend d’abord le plein écran natif
 * (la couche fixe du jeu reste : la partie ne bouge pas). Si le plein écran
 * porte sur `<html>` (session paysage), la fenêtre sociale est déjà dedans :
 * on n’y touche pas.
 *
 * Sans compte (contexte inerte ou visiteur), le bouton est un simple lien
 * vers la messagerie, qui y propose la connexion — sans routeur, comme le
 * lien « Quitter » du menu : la page se monte aussi hors `<BrowserRouter>`
 * dans les vérifications jsdom, et les contextes sans fournisseur restent
 * inertes (voir les défauts de `MessagesContext` / `FriendsContext`).
 */
export default function RpgMessagerieBouton({ variante = 'menu', onActivate } = {}) {
  const messages = useMessages() ?? {};
  const friends = useFriends() ?? {};
  const nonLus = messages.unreadTotal ?? 0;
  const demandes = friends.pendingCount ?? 0;
  const pastille = nonLus > 0 ? nonLus : demandes;
  const connecte = Boolean(messages.enabled || friends.enabled);

  const details = [
    nonLus > 0 ? `${nonLus} message${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}` : '',
    demandes > 0 ? `${demandes} demande${demandes > 1 ? 's' : ''} d’ami` : '',
  ].filter(Boolean).join(', ');
  const ariaLabel = `Messagerie Let’s Play — lancer ou recevoir un défi du Sablier${details ? ` (${details})` : ''}`;

  const contenu = (
    <>
      <LetsTalkMark className="rpg-messagerie-bouton__mark" typing={nonLus > 0} />
      <span className="rpg-messagerie-bouton__libelle">Messagerie</span>
      {pastille > 0 && (
        <span
          className="rpg-messagerie-bouton__pastille"
          data-rpg-messagerie-non-lus={nonLus}
          data-rpg-messagerie-demandes={demandes}
          aria-hidden="true"
        >
          {pastille}
        </span>
      )}
    </>
  );

  const classes = `rpg-messagerie-bouton rpg-messagerie-bouton--${variante}${pastille > 0 ? ' has-alert' : ''}`;

  // Visiteur : la page de messagerie explique la connexion, comme le fait le
  // lanceur de la fenêtre sociale quand aucun compte n’est là.
  if (!connecte) {
    return (
      <a
        className={classes}
        href={`${import.meta.env.BASE_URL}messages`}
        data-rpg-messagerie={variante}
        title={ariaLabel}
        aria-label={ariaLabel}
        onClick={() => onActivate?.()}
      >
        {contenu}
      </a>
    );
  }

  const ouvrir = () => {
    onActivate?.();
    const pleinEcran = nativeFullscreenElement();
    if (pleinEcran && typeof document !== 'undefined' && pleinEcran !== document.documentElement) {
      void exitNativeFullscreen();
    }
    messages.openInbox?.();
  };

  return (
    <button
      type="button"
      className={classes}
      data-rpg-messagerie={variante}
      title={ariaLabel}
      aria-label={ariaLabel}
      onClick={ouvrir}
    >
      {contenu}
    </button>
  );
}
