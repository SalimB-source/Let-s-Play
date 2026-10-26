/**
 * L'écran des **coffrets de bienvenue** — le tout premier choix du joueur.
 *
 * Il ne s'ouvre qu'une fois, et seulement pour un joueur neuf
 * (`coffretBienvenueNecessaire`, `rpgCoffretBienvenue.js`) : trois coffrets de
 * couleurs différentes, un seul choix, définitif.
 *
 * La cérémonie se joue ensuite **par vagues successives** :
 *
 *   1. **le socle** — les communes et les inhabituelles de la couleur ;
 *   2. **les trois rares** — une seule de chacune ;
 *   3. **la mythique** — seule sur scène, celle qui donne son nom au coffret.
 *
 * Chaque carte entre avec un retard croissant (`--rang`), et
 * `prefers-reduced-motion` les présente toutes d'un coup. Le composant est
 * autonome : il lit et écrit l'offre lui-même, et prévient son hôte par
 * `onOuvrir(coffret)` pour que la collection et le deck du coffret soient pris
 * en compte sans recharger la page.
 */

import { useEffect, useMemo, useState } from 'react';
import './rpg-coffret-bienvenue.css';
import { cardArt } from './rpgCardArt.js';
import { cardById, cardFrameClass, cardRarityInfo } from './rpgCards.js';
import { chargerProgressionHistoire } from './rpgStory.js';
import { chargerAcquis, chargerCollectionDistante } from './rpgCollection.js';
import {
  COFFRETS_IDENTITE,
  chargerOffreBienvenue,
  choisirCoffret,
  coffretBienvenueNecessaire,
  coffretChoisi,
  offreBienvenue,
  sauverOffreBienvenue,
  vaguesDuCoffret,
} from './rpgCoffretBienvenue.js';

const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };

/** Vrai quand le système demande moins d'animations. */
function mouvementReduit() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Une carte du coffret, en volume — la même grammaire que la cérémonie du Souk. */
function CarteDuCoffret({ ligne, rang }) {
  const { carte, exemplaires } = ligne;
  const rarete = cardRarityInfo(carte);
  return (
    <article
      className={`rpg-coffret__carte ${cardFrameClass(carte)}`}
      data-rpg-coffret-carte={carte.id}
      data-rpg-coffret-rarete={rarete.key}
      style={{ '--rang': rang }}
      aria-label={`${carte.name}, ${rarete.label} — ${exemplaires} exemplaire${exemplaires > 1 ? 's' : ''}`}
    >
      <div className="rpg-coffret__carte-art">
        <img src={cardArt(carte)} alt="" width="176" height="220" loading="lazy" />
      </div>
      <div className="rpg-coffret__carte-texte">
        <p className="rpg-coffret__carte-nom">{carte.name}</p>
        <p className="rpg-coffret__carte-rarete">
          {rarete.label}
          {exemplaires > 1 ? <span className="rpg-coffret__copies">×{exemplaires}</span> : null}
        </p>
      </div>
    </article>
  );
}

/** Un coffret fermé, sur l'étagère du choix. */
function BoiteCoffret({ coffret, onChoisir, actif }) {
  const identite = COFFRETS_IDENTITE[coffret.couleur] ?? {};
  return (
    <button
      type="button"
      className={`rpg-coffret__boite rpg-coffret__boite--${coffret.couleur}${actif ? ' is-active' : ''}`}
      onClick={() => onChoisir(coffret.id)}
      data-rpg-coffret-boite={coffret.couleur}
      aria-label={`Ouvrir ${coffret.nom} — ${identite.sousTitre ?? ''} : une mythique, trois rares et vingt-six autres cartes`}
    >
      <span className="rpg-coffret__boite-ruban" aria-hidden="true" />
      <span className="rpg-coffret__boite-couleur">{ELEMENT_LABELS[coffret.couleur] ?? coffret.couleur}</span>
      <span className="rpg-coffret__boite-nom">{coffret.nom}</span>
      <span className="rpg-coffret__boite-sous">{identite.sousTitre}</span>
      <span className="rpg-coffret__boite-contenu">
        <strong>30 cartes</strong>
        <span>1 mythique · 3 rares</span>
      </span>
    </button>
  );
}

export default function RpgCoffretBienvenue({ onOuvrir = null } = {}) {
  const [offre, setOffre] = useState(null);
  const [etape, setEtape] = useState('choix');
  const [vague, setVague] = useState(0);
  const [ferme, setFerme] = useState(false);
  const reduit = useMemo(mouvementReduit, []);

  // L'offre se lit au montage : au premier passage elle est tirée puis rangée,
  // pour qu'un rechargement repropose exactement les trois mêmes coffrets.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existante = chargerOffreBienvenue();
    const courante = existante.coffrets.length > 0 ? existante : offreBienvenue();
    if (existante.coffrets.length === 0) sauverOffreBienvenue(courante);
    const necessaire = coffretBienvenueNecessaire({
      offre: courante,
      progression: chargerProgressionHistoire(),
      acquis: chargerAcquis(),
      collection: chargerCollectionDistante(),
    });
    if (!necessaire) {
      setFerme(true);
      return;
    }
    setOffre(courante);
  }, []);

  const choisi = coffretChoisi(offre);
  const vagues = useMemo(() => (choisi ? vaguesDuCoffret(choisi) : []), [choisi]);

  // Les vagues entrent l'une après l'autre : socle, rares, mythique. La dernière
  // s'arrête sur la mythique seule, qui garde le bouton « Entrer ».
  const vagueCourante = vagues[Math.min(vague, Math.max(0, vagues.length - 1))];

  const ouvrir = (id) => {
    const maj = choisirCoffret(offre, id);
    sauverOffreBienvenue(maj);
    setOffre(maj);
    setEtape('ceremonie');
    setVague(0);
    const coffret = coffretChoisi(maj);
    if (coffret) onOuvrir?.(coffret);
  };

  if (ferme || !offre || (!choisi && etape !== 'choix')) return null;

  if (etape === 'choix') {
    return (
      <div className="rpg-coffret" role="dialog" aria-modal="true" aria-labelledby="rpg-coffret-titre">
        <div className="rpg-coffret__panneau">
          <p className="rpg-coffret__sur-titre">Le Sablier de Bab El</p>
          <h1 id="rpg-coffret-titre" className="rpg-coffret__titre">Choisissez votre coffret</h1>
          <p className="rpg-coffret__chapeau">
            Trois coffrets vous sont proposés, un seul sera ouvert — et il ne se rouvrira pas.
            Chacun tient <strong>trente cartes</strong> : une mythique tirée au hasard, trois rares,
            puis les communes et les inhabituelles de sa couleur.
          </p>
          <div className="rpg-coffret__boites">
            {offre.coffrets.map((coffret) => (
              <BoiteCoffret key={coffret.id} coffret={coffret} onChoisir={ouvrir} actif={false} />
            ))}
          </div>
          <p className="rpg-coffret__note">Le coffret ouvert devient votre collection de départ.</p>
        </div>
      </div>
    );
  }

  if (!vagueCourante) return null;
  const derniere = vague >= vagues.length - 1;

  return (
    <div className="rpg-coffret rpg-coffret--ceremonie" role="dialog" aria-modal="true" aria-labelledby="rpg-coffret-vague-titre">
      <div className="rpg-coffret__panneau">
        <p className="rpg-coffret__sur-titre">{choisi.nom}</p>
        <h1 id="rpg-coffret-vague-titre" className="rpg-coffret__titre">
          {vagueCourante.titre}
          <span className="rpg-coffret__compte">{vagueCourante.cartes.length}</span>
        </h1>
        <p className="rpg-coffret__chapeau">{vagueCourante.legende}</p>
        <div className={`rpg-coffret__vague${reduit ? ' is-reduit' : ''}`} key={vagueCourante.cle}>
          {vagueCourante.cartes.map((ligne, index) => (
            <CarteDuCoffret key={ligne.id} ligne={ligne} rang={index} />
          ))}
        </div>
        <div className="rpg-coffret__actions">
          <span className="rpg-coffret__jalons" aria-hidden="true">
            {vagues.map((v, index) => (
              <i key={v.cle} className={index <= vague ? 'is-fait' : ''} />
            ))}
          </span>
          <button
            type="button"
            autoFocus
            className="rpg-btn rpg-btn--primary rpg-coffret__suivant"
            onClick={() => {
              if (derniere) setFerme(true);
              else setVague((courant) => courant + 1);
            }}
          >
            {derniere ? 'Entrer dans Bab El' : `Voir ${vagues[vague + 1]?.titre?.toLowerCase() ?? 'la suite'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
