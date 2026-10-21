import './rpg-pvp.css';
import RpgDuelPage from './RpgDuelPage.jsx';

/**
 * Le plateau du Sablier en ligne — `src/games/RpgPvpBoard.jsx`
 * ------------------------------------------------------------
 * Monte la vraie table de duel plein écran (`RpgDuelPage`) branchée sur la vue
 * filtrée renvoyée par l'arbitre (`api/sablier-duel.js`) :
 *
 *   - Plateaux fendus, musique dynamique, cartes en éventail 3D, animations
 *     d'invocation / attaque / magie / pioche / soins, flèches de blocage et
 *     volet de mulligan identiques au duel solo et au mode Histoire.
 *   - Le joueur est toujours assis côté `joueur` (en bas) ; son adversaire est
 *     toujours côté `sorcier` (en haut), main et paquet cachés (`mainCount`,
 *     `deckCount`).
 *   - Chaque geste du joueur part comme une **intention** vers le serveur via
 *     `onIntention`, puis se réconcilie sur l'état autoritaire `vue`.
 */
export default function RpgPvpBoard({
  vue,
  siege = 'joueur',
  code = '',
  statut = 'en_cours',
  mode = 'live',
  echeance = null,
  seq = 0,
  noms = null,
  decks = null,
  gagnantId = null,
  finRaison = null,
  resultat = null,
  erreur = null,
  occupe = false,
  onIntention,
  onRafraichir,
  onAbandon,
  onQuitter,
}) {
  return (
    <RpgDuelPage
      pvp={{
        vue,
        siege,
        code,
        statut,
        mode,
        echeance,
        seq,
        noms: vue?.noms ?? noms,
        decks: vue?.decks ?? decks,
        gagnantId,
        finRaison: finRaison ?? vue?.fin?.raison ?? null,
        resultat,
        erreur,
        occupe,
        onIntention,
        onRafraichir,
        onAbandon,
        onQuitter,
      }}
    />
  );
}
