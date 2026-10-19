/**
 * La cérémonie d'ouverture — les cinq cartes d'un paquet, retournées une à une.
 *
 * C'est le seul moment du Souk qui doit faire plaisir : les cartes se
 * retournent l'une après l'autre — trois communes ou inhabituelles, la **rare
 * garantie**, puis la cinquième carte, celle qui peut être mythique —, chaque
 * carte tamponnée **NOUVELLE** ou « déjà possédée → +45 ◈ », puis le total
 * encaissé et le bouton **« Tout ranger dans la collection »**.
 *
 * Elle est montée par l'écran du Souk, jamais par la page : l'achat, lui, a
 * déjà eu lieu (`useSablierBourse.js` a débité le solde et rangé les cartes
 * avant d'afficher quoi que ce soit). Fermer l'onglet en plein retournement ne
 * coûte donc rien — et « Tout ranger » ne fait que refermer la cérémonie.
 *
 * Tactile d'abord : **Passer** révèle tout, et un appui sur une carte révèle la
 * suivante si l'on veut aller plus vite que le rythme. `prefers-reduced-motion`
 * remplace le retournement par une apparition franche.
 */

import { useEffect, useState } from 'react';
import './rpg-souk.css';
import { cardById, cardCost, cardFrameClass, cardRarityInfo, cardTypeLine } from './rpgCards.js';
import { rayonParId } from './rpgBoosters.js';
import { creditsLisible } from './rpgCredits.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import { PastillesCarte } from './effetIcons.jsx';

/** Une carte, face visible : son art, son nom, sa rareté, et ce qu'elle a rendu. */
function CarteRevelee({ detail, cardArt, index }) {
  const carte = detail.carte ?? cardById(detail.id);
  if (!carte) return null;
  const rarete = cardRarityInfo(carte);
  return (
    <li
      className={`rpg-souk__carte ${cardFrameClass(carte)}${detail.doublon ? ' is-doublon' : ' is-nouvelle'}`}
      data-souk-carte={carte.id}
      data-souk-carte-etat={detail.doublon ? 'doublon' : 'nouvelle'}
      data-souk-carte-remboursement={detail.remboursement}
      style={{ '--rang': index }}
    >
      <div className="rpg-souk__carte-art">
        <img src={cardArt(carte)} alt={`Illustration de ${carte.name}`} width="176" height="238" />
      </div>
      <div className="rpg-souk__carte-corps">
        <span className="rpg-souk__carte-rarete" data-souk-carte-rarete={rarete.key}>{rarete.label}</span>
        <h4>{carte.name}</h4>
        <p>{cardTypeLine(carte)}</p>
        <PastillesCarte carte={carte} className="rpg-souk__carte-pastilles" />
        <p className="rpg-souk__carte-cout" aria-label={`Coût : ${cardCost(carte)} mana`}>{cardCost(carte)} mana</p>
      </div>
      <p className="rpg-souk__carte-tampon" data-souk-carte-tampon={detail.doublon ? 'doublon' : 'nouvelle'}>
        {detail.doublon ? (
          <>
            Déjà possédée · +{detail.remboursement} <RpgCreditIcon />
            <span className="sr-only">crédits</span>
          </>
        ) : 'Nouvelle'}
      </p>
    </li>
  );
}

export default function RpgBoosterOuverture({ ouverture, cardArt, onFermer, onPlaySfx }) {
  const cartes = Array.isArray(ouverture?.cartes) ? ouverture.cartes : [];
  // Un coffret fait cinquante cartes : on ne les retourne pas une à une, on les
  // pose. Le paquet, lui, se savoure.
  const une_a_une = cartes.length > 0 && cartes.length <= 6;
  const [revelees, setRevelees] = useState(() => (une_a_une ? 0 : cartes.length));
  const rayon = rayonParId(ouverture?.rayonId);
  const titre = ouverture.coffret
    ? 'Le Coffret du Souk'
    : (rayon?.titre ?? 'Le paquet du Souk');

  // Le rythme de la cérémonie : une carte toutes les 620 ms.
  useEffect(() => {
    if (!une_a_une || revelees >= cartes.length) return undefined;
    const battement = setTimeout(() => setRevelees((compte) => compte + 1), 620);
    return () => clearTimeout(battement);
  }, [une_a_une, revelees, cartes.length]);

  // Le son suit la révélation : la pioche pour une carte, la victoire pour une
  // mythique — et rien pour les cartes qui ne sont pas encore retournées.
  useEffect(() => {
    if (!revelees) return;
    const derniere = cartes[revelees - 1];
    if (!derniere) return;
    const mythique = (derniere.carte ?? cardById(derniere.id))?.rarity === 'mythique';
    onPlaySfx?.(mythique ? 'victoire' : 'pioche');
  }, [revelees, cartes, onPlaySfx]);

  if (!ouverture) return null;
  const toutRevele = revelees >= cartes.length;
  const total = ouverture.remboursement ?? 0;

  /** Passer l'animation, ou la sauter d'un appui sur le fond. */
  const toutReveler = () => {
    if (!toutRevele) onPlaySfx?.('select');
    setRevelees(cartes.length);
  };

  return (
    <div className="rpg-souk__ceremonie" data-souk-ceremonie data-souk-ceremonie-paquet={ouverture.paquets ?? 1}>
      <div className="rpg-souk__ceremonie-nappe" aria-hidden="true" />
      <section className="rpg-souk__ceremonie-corps" aria-label="Ouverture du booster">
        <header className="rpg-souk__ceremonie-tete">
          <span className="rpg-mode-menu__eyebrow">
            {ouverture.coffret ? `LE COFFRET · ${ouverture.paquets} PAQUETS` : 'LE PAQUET · 5 CARTES'}
          </span>
          <h2>{titre}</h2>
          <p>
            {ouverture.coffret
              ? <> {creditsLisible(ouverture.prix)} <RpgCreditIcon /> — dix paquets, une mythique assurée.</>
              : <> {creditsLisible(ouverture.prix)} <RpgCreditIcon /> — cinq cartes, une rare garantie, la mythique en dernière.</>}
          </p>
        </header>

        <ul className="rpg-souk__ceremonie-cartes" data-souk-ceremonie-revelees={revelees}>
          {cartes.map((detail, index) => (
            index < revelees
              ? <CarteRevelee key={`${detail.id}-${index}`} detail={detail} cardArt={cardArt} index={index} />
              : (
                <li key={`${detail.id}-${index}`} className="rpg-souk__carte is-dos" data-souk-carte-dos={index} aria-hidden="true">
                  <span className="rpg-souk__carte-dos-rune">⌛</span>
                </li>
              )
          ))}
        </ul>

        <footer className="rpg-souk__ceremonie-pied">
          <p className="rpg-souk__ceremonie-bilan" role="status" data-souk-ceremonie-bilan={ouverture.nouvelles ?? 0}>
            {toutRevele ? (
              <>
                {ouverture.nouvelles ?? 0} nouvelle{(ouverture.nouvelles ?? 0) > 1 ? 's' : ''}
                {total ? <> {'·'} {total} <RpgCreditIcon /> rendus par les doublons</> : ''}
              </>
            ) : `${revelees} / ${cartes.length} retournées`}
          </p>
          {!toutRevele && (
            <button type="button" className="rpg-menu-button" data-souk-ceremonie-passer onClick={toutReveler}>
              Passer
            </button>
          )}
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-souk-ceremonie-ranger
            disabled={!toutRevele}
            title={toutRevele ? 'Les cartes sont déjà dans votre collection' : 'Laissez les cartes se retourner'}
            onClick={() => { onPlaySfx?.('menu'); onFermer?.(); }}
          >
            Tout ranger dans la collection
          </button>
        </footer>
      </section>
    </div>
  );
}
