/**
 * Le parcours de création d'un deck maison — l'orchestrateur derrière la
 * crate « Nouveau deck ».
 *
 * Trois vues, une seule promesse :
 *
 *   - `choix` — le seuil (`RpgDeckModeChoice`) : création assistée ou
 *     manuelle. Il n'apparaît qu'en création ; l'édition et la copie d'un
 *     deck existant ouvrent directement l'atelier manuel, puisque le joueur
 *     sait déjà ce qu'il veut retoucher ;
 *   - `assistant` — le wizard idée → couleurs → style (`RpgDeckAssistant`),
 *     qui rend la main à ce wrapper avec `{ couleurs, style, intention }` —
 *     l'`intention` étant la demande dictée dans l'invite de texte, lue par
 *     `rpgDeckIntention.js` ;
 *   - `manuel` — l'atelier minimaliste (`RpgDeckAtelier`). En sortie
 *     d'assistant, il reçoit le deck généré pré-rempli : chaque carte reste
 *     remplaçable avant l'enregistrement.
 *
 * La génération reste un calcul pur et hors ligne (`genererDeckAssiste`,
 * `rpgDeckAuto.js`), borné par la collection et le stock d'exemplaires
 * payés — un deck assisté doit être enregistrable tel quel.
 */

import { useState } from 'react';
import './rpg-deck-atelier.css';
import RpgDeckAtelier from './RpgDeckAtelier.jsx';
import RpgDeckAssistant from './RpgDeckAssistant.jsx';
import RpgDeckModeChoice from './RpgDeckModeChoice.jsx';
import { RPG_DUEL_CARDS, cardColors } from './rpgCards.js';
import { plafondVisible } from './rpgCollection.js';
import { genererDeckAssiste } from './rpgDeckAuto.js';

export function RpgDeckCreation({
  mode = 'nouveau',
  collection = [],
  exemplaires = null,
  surSfx = () => {},
  ...atelierProps
}) {
  // En création neuve, le joueur choisit d'abord son chemin ; en édition ou
  // copie, l'atelier s'ouvre directement sur les cartes du deck.
  const [vue, setVue] = useState(mode === 'nouveau' ? 'choix' : 'manuel');
  const [generation, setGeneration] = useState(null);

  /**
   * L'assistant a renvoyé couleurs + style (+ l'intention lue de l'invite de
   * texte) : le moteur compose dans le stock (pas dans le quota brut), puis
   * l'atelier manuel s'ouvre avec le deck pré-rempli et sa carte emblème.
   */
  const generer = ({ couleurs, style, intention = null }) => {
    const { cardIds, embleme } = genererDeckAssiste({
      couleurs,
      style,
      intention,
      collection,
      catalogue: {
        cartes: RPG_DUEL_CARDS,
        couleursDe: cardColors,
        limiteDe: (carte) => (carte ? plafondVisible(collection, carte.id, exemplaires) : 0),
      },
    });
    setGeneration({ cardIds, boxArt: embleme ?? '' });
    setVue('manuel');
  };

  if (vue === 'choix') {
    return (
      <RpgDeckModeChoice
        onAssiste={() => setVue('assistant')}
        onManuel={() => setVue('manuel')}
        onRetour={atelierProps.onAnnuler}
        surSfx={surSfx}
      />
    );
  }

  if (vue === 'assistant') {
    return (
      <RpgDeckAssistant
        collection={collection}
        exemplaires={exemplaires}
        onGenerer={generer}
        onFermer={() => setVue('choix')}
        surSfx={surSfx}
      />
    );
  }

  return (
    <RpgDeckAtelier
      {...atelierProps}
      collection={collection}
      exemplaires={exemplaires}
      surSfx={surSfx}
      // Une génération assistée pré-remplit l'atelier ; sinon les cartes
      // initiales viennent de la copie / de l'édition (deckInitial).
      cardIdsInitiaux={generation?.cardIds ?? atelierProps.cardIdsInitiaux ?? []}
      boxArtInitial={generation?.boxArt ?? ''}
      // Le remontage garantit un état frais quand on sort de l'assistant.
      key={generation ? `genere-${generation.cardIds.length}` : 'atelier'}
    />
  );
}

export default RpgDeckCreation;
