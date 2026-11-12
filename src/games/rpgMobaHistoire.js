import { MOBA_PLATEAUX } from './rpgMobaPlateaux.js';
import { MOBA_DECKS_TOURS } from './rpgMobaDecks.js';

// Each chapter is an independent MOBA duel: a fresh deck, hand, lanes and life.
// Each interlude shows an unmodified card illustration full-bleed; the portrait
// may depict the chapter's atmosphere rather than its actual opponent. The
// interlude background only extends the scenery.
const etapes = [
  { plateau: 'trois-voies', deckId: 'tour-listes-1', titre: 'Le seuil des trois voies', portrait: 'guetteur-du-beffroi', ambiance: 'braises',
    decor: 'sablier-moba/interlude-premier-seuil.webp', texte: 'Le Guetteur de palier veille depuis le beffroi. Il a vu votre approche : au seuil des trois voies, il vous attend.' },
  { plateau: 'port-des-corsaires', deckId: 'tour-corsaires-1', titre: 'Les quais de la Régence', portrait: 'la-barbe-noire', ambiance: 'embruns',
    decor: 'sablier-moba/interlude-port-corsaires.webp', texte: 'Dans la fumée des quais rôde la silhouette de Barbe Noire. La Mousse des galiotes garde la passe qui mène aux terres intérieures.' },
  { plateau: 'erg-des-ksour', deckId: 'tour-souk-2', titre: 'La porte des ksour', portrait: 'amani-des-ksour', ambiance: 'sable',
    decor: 'sablier-moba/interlude-erg-ksour.webp', texte: 'Le vent soulève le sable autour de la porte. La Gardienne des ksour barre la route des hautes terres.' },
  { plateau: 'lac-gele-viking', deckId: 'tour-fjord-3', titre: 'Le serment du lac gelé', portrait: 'valkyrie-des-glaces', ambiance: 'neige',
    decor: 'sablier-moba/interlude-lac-gele.webp', texte: 'Sur le lac figé, la Valkyrie des glaces garde le passage. Ses ailes se dessinent dans la brume : le prochain duel sera le sien.' },
  { plateau: 'temple-du-nil-egyptien', deckId: 'tour-sablier-5', titre: 'Le passage du Styx', portrait: 'passeur-au-masque-de-chacal', ambiance: 'brume',
    decor: 'sablier-moba/interlude-styx.webp', texte: 'Devant la rivière du Styx, le Passeur au masque de chacal vous attend. Au-delà des eaux noires s’élève le Temple du Nil.' },
];

export const MOBA_HISTOIRE = Object.freeze(etapes.map((etape) => Object.freeze({
  ...etape,
  plateau: MOBA_PLATEAUX.find(({ id }) => id === etape.plateau),
  deck: MOBA_DECKS_TOURS.find(({ id }) => id === etape.deckId),
})));

export function prochainChapitreMoba(index, vainqueur) {
  return vainqueur === 'joueur' ? MOBA_HISTOIRE[index + 1] ?? null : null;
}
