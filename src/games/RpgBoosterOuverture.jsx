/**
 * La cérémonie d'ouverture — les cinq cartes d'un paquet, retournées une à une.
 *
 * C'est le seul moment du Souk qui doit faire plaisir : les cartes se
 * retournent l'une après l'autre — trois communes ou inhabituelles, la **rare
 * garantie**, puis la cinquième carte, celle qui peut être mythique —, chaque
 * carte tamponnée **NOUVELLE** ou « déjà possédée → +22 ◈ », puis le total
 * encaissé et le bouton **« Tout ranger dans la collection »**.
 *
 * Elle est montée par l'écran du Souk **et par la page** pour le paquet qu'un
 * palier offre (`rpgProfil.js`) : dans les deux cas l'ouverture a déjà eu lieu
 * (`useSablierBourse.js` a rangé les cartes — et, pour un achat, débité le solde
 * — avant d'afficher quoi que ce soit). Fermer l'onglet en plein retournement ne
 * coûte donc rien, et « Tout ranger » ne fait que refermer la cérémonie.
 *
 * Un paquet **offert** (`ouverture.offert`) est le même paquet, sans caisse : le
 * sachet porte le niveau qui vient de sonner au lieu du prix, et la légende dit
 * qu'aucun crédit n'a été dépensé.
 *
 * **Passer** termine la séquence à tout instant. `prefers-reduced-motion`
 * présente immédiatement toutes les cartes, sans sortie ni flottement.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './rpg-souk.css';
import { cardById, cardCost, cardFrameClass, cardRarityInfo, cardTypeLine } from './rpgCards.js';
import { rayonParId } from './rpgBoosters.js';
import { creditsLisible } from './rpgCredits.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import { PastillesCarte } from './effetIcons.jsx';

/** Une gravure vectorielle : pas de dépendance à la police emoji du mobile. */
function RuneSablier() {
  return (
    <svg className="rpg-souk__rune-sablier" viewBox="0 0 48 64" aria-hidden="true" focusable="false">
      <path d="M8 5h32M8 59h32M12 6v8c0 8 8 12 12 18-4 6-12 10-12 18v8M36 6v8c0 8-8 12-12 18 4 6 12 10 12 18v8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m16 17 8 12 8-12ZM15 53l9-12 9 12Z" fill="currentColor" opacity=".8" />
      <path d="M24 33v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Une carte, face visible : son art, son nom, sa rareté, et ce qu'elle a rendu. */
function CarteRevelee({ detail, cardArt, index, visible = true }) {
  const carte = detail.carte ?? cardById(detail.id);
  if (!carte) return null;
  const rarete = cardRarityInfo(carte);
  return (
    <article
      inert={!visible}
      aria-hidden={!visible || undefined}
      className={`rpg-souk__carte ${cardFrameClass(carte)}${detail.doublon ? ' is-doublon' : ' is-nouvelle'}`}
      data-souk-carte={visible ? carte.id : undefined}
      data-souk-carte-etat={detail.doublon ? 'doublon' : 'nouvelle'}
      data-souk-carte-rarete={rarete.key}
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
    </article>
  );
}

export default function RpgBoosterOuverture({ ouverture, cardArt, onFermer, onPlaySfx }) {
  const cartes = Array.isArray(ouverture?.cartes) ? ouverture.cartes : [];
  // Le coffret se lit d'un seul coup ; seul le paquet a une chorégraphie.
  const une_a_une = cartes.length > 0 && cartes.length <= 6;
  const [mouvementReduit, setMouvementReduit] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [phase, setPhase] = useState(() => une_a_une && !mouvementReduit ? 'scelle' : 'termine');
  const [revelees, setRevelees] = useState(() => phase === 'termine' ? cartes.length : 0);
  const [passee, setPassee] = useState(false);
  const sceneRef = useRef(null);
  const paquetRef = useRef(null);
  const rayon = rayonParId(ouverture?.rayonId);
  const offert = Boolean(ouverture?.offert);
  const titre = offert
    ? `Niveau ${ouverture?.vers ?? ouverture?.niveaux ?? ''} — le comptoir offre`
    : ouverture?.coffret
      ? 'Le Coffret du Souk'
      : (rayon?.titre ?? 'Le paquet du Souk');
  const vitrine = cardById(rayon?.vitrine ?? 'ifrit-des-ergs');

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const suivre = () => setMouvementReduit(media.matches);
    suivre();
    media.addEventListener?.('change', suivre);
    return () => media.removeEventListener?.('change', suivre);
  }, []);

  // Timers annulés au démontage, à « Passer » et si le système réduit le mouvement.
  useEffect(() => {
    if (mouvementReduit) {
      setRevelees(cartes.length);
      setPhase('termine');
      return undefined;
    }
    const suivante = { scelle: ['ouverture', 450], ouverture: ['sortie', 600], sortie: ['revelation', 1300] }[phase];
    if (!suivante) return undefined;
    const timer = setTimeout(() => setPhase(suivante[0]), suivante[1]);
    return () => clearTimeout(timer);
  }, [phase, mouvementReduit, cartes.length]);

  useEffect(() => {
    if (phase !== 'revelation') return undefined;
    if (revelees >= cartes.length) {
      // Le dernier retournement finit avant d'activer le rangement.
      const timer = setTimeout(() => setPhase('termine'), 400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevelees((compte) => compte + 1), revelees === 0 ? 30 : 220);
    return () => clearTimeout(timer);
  }, [phase, revelees, cartes.length]);

  // Chaque carte part du vrai centre du sachet, même avec plusieurs lignes
  // sur téléphone. Les wrappers séparent sortie, retournement et flottement.
  useLayoutEffect(() => {
    if (phase !== 'sortie') return undefined;
    const placer = () => {
      const paquet = paquetRef.current?.getBoundingClientRect();
      if (!paquet) return;
      sceneRef.current?.querySelectorAll('.rpg-souk__carte-place').forEach((place) => {
        // offset* reste indépendant de la transformation animée en cours.
        const scene = sceneRef.current.getBoundingClientRect();
        place.style.setProperty('--depart-x', `${paquet.left + paquet.width / 2 - scene.left - place.offsetLeft - place.offsetWidth / 2}px`);
        place.style.setProperty('--depart-y', `${paquet.top + paquet.height * .25 - scene.top - place.offsetTop - place.offsetHeight / 2}px`);
      });
    };
    placer();
    window.addEventListener('resize', placer);
    return () => window.removeEventListener('resize', placer);
  }, [phase]);

  // Le son de l'ouverture : le papier du sachet cède au moment où le sceau se
  // brise, avant que les cartes ne partent.
  useEffect(() => {
    if (phase !== 'ouverture') return;
    onPlaySfx?.('page_turn');
  }, [phase, onPlaySfx]);

  // Le son suit la révélation : le bruit de pioche du paquet pour une carte,
  // la fanfare de victoire pour une mythique — et rien pour les cartes qui ne
  // sont pas encore retournées.
  useEffect(() => {
    if (!revelees) return;
    const derniere = cartes[revelees - 1];
    if (!derniere) return;
    const mythique = (derniere.carte ?? cardById(derniere.id))?.rarity === 'mythique';
    onPlaySfx?.(mythique ? 'victoire' : 'card_draw');
  }, [revelees, cartes, onPlaySfx]);

  if (!ouverture) return null;
  const toutRevele = phase === 'termine';
  const total = ouverture.remboursement ?? 0;

  /** Passer termine immédiatement tous les mouvements d'entrée. */
  const toutReveler = () => {
    if (!toutRevele) onPlaySfx?.('select');
    setPassee(true);
    setRevelees(cartes.length);
    setPhase('termine');
  };

  return (
    <div className={`rpg-souk__ceremonie${une_a_une ? ' is-paquet-anime' : ''}${passee ? ' is-passee' : ''}`} data-souk-ceremonie data-souk-phase={phase} data-souk-ceremonie-paquet={ouverture.paquets ?? 1} data-souk-ceremonie-offert={offert || undefined} data-souk-ceremonie-niveau={offert ? (ouverture.vers ?? null) : undefined}>
      <div className="rpg-souk__ceremonie-nappe" aria-hidden="true" />
      <section className="rpg-souk__ceremonie-corps" aria-label="Ouverture du booster">
        <header className="rpg-souk__ceremonie-tete">
          <span className="rpg-mode-menu__eyebrow" data-souk-ceremonie-offert={offert || undefined}>
            {offert
              ? `LE NIVEAU SONNE · ${ouverture.paquets ?? 1} PAQUET${(ouverture.paquets ?? 1) > 1 ? 'S' : ''} OFFERT${(ouverture.paquets ?? 1) > 1 ? 'S' : ''}`
              : ouverture.coffret ? `LE COFFRET · ${ouverture.paquets} PAQUETS` : 'LE PAQUET · 5 CARTES'}
          </span>
          <h2>{titre}</h2>
          <p>
            {offert
              ? <>Offert par le niveau — aucun crédit dépensé. {ouverture.paquets > 1 ? 'Un paquet par palier franchi.' : 'Cinq cartes, une rare garantie, la mythique en dernière.'}</>
              : ouverture.coffret
                ? <> {creditsLisible(ouverture.prix)} <RpgCreditIcon /> — dix paquets, une mythique assurée.</>
                : <> {creditsLisible(ouverture.prix)} <RpgCreditIcon /> — cinq cartes, une rare garantie, la mythique en dernière.</>}
          </p>
        </header>

        <div className="rpg-souk__ouverture-scene" ref={sceneRef}>
          {une_a_une && phase !== 'termine' && (
            <div className="rpg-souk__sachet-ancre" ref={paquetRef} aria-hidden="true">
              <div className="rpg-souk__sachet">
                <div className="rpg-souk__sachet-lueur" />
                <div className="rpg-souk__sachet-corps">
                  {vitrine && <img src={cardArt(vitrine)} alt="" />}
                  <span className="rpg-souk__sachet-marque">{offert ? `NIVEAU ${ouverture.vers ?? ''}` : 'LE SOUK'}</span>
                  <span className="rpg-souk__sachet-rune"><RuneSablier /></span>
                  <span className="rpg-souk__sachet-legende">CINQ CARTES · UN DESTIN</span>
                </div>
                <div className="rpg-souk__sachet-languette"><span>LET’S PLAY · LE SOUK</span></div>
                <div className="rpg-souk__sachet-eclats">
                  {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--eclat': i }} />)}
                </div>
              </div>
            </div>
          )}
          <ul className="rpg-souk__ceremonie-cartes" data-souk-ceremonie-revelees={revelees}>
            {cartes.map((detail, index) => (
              <li key={`${detail.id}-${index}`} className="rpg-souk__carte-place" style={{ '--rang': index }}>
                <div className="rpg-souk__carte-flotte">
                  <div className={`rpg-souk__carte-retourne${index < revelees ? ' is-revelee' : ''}`}>
                    <CarteRevelee detail={detail} cardArt={cardArt} index={index} visible={index < revelees} />
                    <div className="rpg-souk__carte-verso" data-souk-carte-dos={index >= revelees ? index : undefined} aria-hidden="true">
                      <span className="rpg-souk__carte-verso-cadre">
                        <span>LE SOUK</span><b><RuneSablier /></b><span>LET’S PLAY</span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="rpg-souk__ceremonie-pied">
          <p className="rpg-souk__ceremonie-bilan" role="status" data-souk-ceremonie-bilan={ouverture.nouvelles ?? 0}>
            {toutRevele ? (
              <>
                {ouverture.nouvelles ?? 0} nouvelle{(ouverture.nouvelles ?? 0) > 1 ? 's' : ''}
                {total ? <> {'·'} {total} <RpgCreditIcon /> rendus par les doublons</> : ''}
              </>
            ) : phase === 'scelle' || phase === 'ouverture' ? 'Le sceau se brise…'
              : phase === 'sortie' ? 'Le Souk dévoile ses trésors…' : `${revelees} / ${cartes.length} retournées`}
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
