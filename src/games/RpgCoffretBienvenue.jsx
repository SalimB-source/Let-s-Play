/**
 * L'écran des **coffrets de bienvenue** — le tout premier choix du joueur.
 *
 * Il ne s'ouvre qu'une fois, et seulement pour un joueur neuf
 * (`coffretBienvenueNecessaire`, `rpgCoffretBienvenue.js`) : trois coffrets de
 * couleurs différentes, un seul choix, définitif.
 *
 * La cérémonie se joue en trois actes :
 *
 *   0. **le coffret s'ouvre** — la boîte choisie monte au centre, le sceau de
 *      cire se fend, le couvercle bascule et la lumière jaillit (`--ouverture`) ;
 *   1. **le socle** — les communes et les inhabituelles de la couleur ;
 *   2. **les trois rares** — une seule de chacune ;
 *   3. **la mythique** — seule sur scène, celle qui donne son nom au coffret.
 *
 * Chaque carte entre avec un retard croissant (`--rang`), un rideau de lumière
 * couvre le passage d'une vague à l'autre, et `prefers-reduced-motion` présente
 * tout d'un coup — sans ouverture animée. Le composant est autonome : il lit et
 * écrit l'offre lui-même, et prévient son hôte par `onOuvrir(coffret)` pour que
 * la collection et le deck du coffret soient pris en compte sans recharger.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './rpg-coffret-bienvenue.css';
import { cardArt } from './rpgCardArt.js';
import { ElementEmblem } from './rpgEmblemes.jsx';
import { cardById, cardRarityInfo } from './rpgCards.js';
import { chargerProgressionHistoire } from './rpgStory.js';
import { chargerAcquis, chargerCollectionDistante } from './rpgCollection.js';
import {
  COFFRETS_IDENTITE,
  chargerOffreBienvenue,
  choisirCoffret,
  coffretBienvenueNecessaire,
  coffretChoisi,
  mythiqueVitrineDuCoffret,
  offreBienvenue,
  sauverOffreBienvenue,
  vaguesDuCoffret,
} from './rpgCoffretBienvenue.js';

const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };

/** Combien de temps la boîte met à s'ouvrir avant que la première vague n'entre. */
const DUREE_OUVERTURE = 1900;
/** Le temps du rideau de lumière entre deux vagues. */
const DUREE_RIDEAU = 460;

/** Vrai quand le système demande moins d'animations. */
function mouvementReduit() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const POUSSIERE = 16;

/**
 * L'illustration d'une carte, dans le coffret.
 *
 * Trois précautions, apprises à la dure :
 *
 *   - **rien de paresseux** (`loading="lazy"`) : dans un calque `position:
 *     fixed`, un navigateur peut ne jamais déclencher le chargement d'une image
 *     « différée » — la zone restait noire alors que la carte s'affichait ;
 *   - **une reprise** : si l'URL versionnée (`?v=…`) échoue — cache, proxy —,
 *     l'image retente une fois sans la version, plutôt que de laisser un trou ;
 *   - **une plaque de repli** : si la peinture manque vraiment, la place garde
 *     le nom de la carte, jamais un rectangle vide.
 */
function IllustrationCarte({ carte, className = '' }) {
  const url = cardArt(carte);
  const [src, setSrc] = useState(url);
  const [manquante, setManquante] = useState(false);
  useEffect(() => {
    setSrc(url);
    setManquante(false);
  }, [url]);
  if (manquante || !carte) {
    return (
      <span className={`rpg-coffret__illustration-manquante ${className}`} aria-hidden="true">
        <b>{carte?.name ?? ''}</b>
      </span>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt=""
      width="176"
      height="220"
      decoding="async"
      onError={() => {
        // Une seule reprise, sans la version : l'URL nue est celle du fichier.
        if (src === url && url.includes('?')) setSrc(url.split('?')[0]);
        else setManquante(true);
      }}
    />
  );
}

/** La ronde de poussière dorée qui flotte derrière tous les écrans du coffret. */
function Poussiere() {
  return (
    <span className="rpg-coffret__poussiere" aria-hidden="true">
      {Array.from({ length: POUSSIERE }, (_, i) => (
        <i key={i} style={{ '--grain': i, '--grain-x': `${(i * 37) % 100}%`, '--grain-y': `${(i * 61) % 100}%` }} />
      ))}
    </span>
  );
}

/** Le sceau du Sablier, gravé dans la cire et dans le fond de la scène. */
function RuneSablier() {
  return (
    <svg className="rpg-coffret__rune" viewBox="0 0 48 64" aria-hidden="true" focusable="false">
      <path d="M8 4h32M8 60h32" />
      <path d="M12 6c0 10 24 16 24 26S12 48 12 58" />
      <path d="M36 6c0 10-24 16-24 26s24 16 24 26" />
      <path d="M24 22v20" />
      <circle cx="24" cy="32" r="2.4" />
    </svg>
  );
}

/**
 * Une carte du coffret, **en volume** : une face avant (peinture, nom, rareté),
 * une tranche à droite, et une lueur qui change de teinte et d'intensité avec
 * la rareté. La carte ne rayonne pas par sa peinture — c'est le halo derrière
 * elle qui dit ce qu'elle vaut, du neutre de la commune à l'or de la mythique.
 */
function CarteDuCoffret({ ligne, rang, total, reduit }) {
  const { carte, exemplaires } = ligne;
  const rarete = cardRarityInfo(carte);
  const milieu = (total - 1) / 2;
  // Les cartes partent du centre de la vague : celles du bord s'écartent plus
  // que celles du milieu, comme si elles jaillissaient du coffret.
  const ecart = total > 1 ? (rang - milieu) / Math.max(1, milieu) : 0;
  return (
    <article
      className={`rpg-coffret__carte rpg-coffret__carte--${rarete.key}${reduit ? ' is-reduit' : ''}`}
      data-rpg-coffret-carte={carte.id}
      data-rpg-coffret-rarete={rarete.key}
      style={{
        '--rang': rang,
        '--depart-x': `${(ecart * 26).toFixed(1)}px`,
        '--inclinaison': `${(ecart * 3.4).toFixed(2)}deg`,
        '--retard': `${Math.round(rang * 52)}ms`,
      }}
      aria-label={`${carte.name}, ${rarete.label} — ${exemplaires} exemplaire${exemplaires > 1 ? 's' : ''}`}
    >
      {/* La scène porte la perspective ; la lueur (`::before`) reste dehors,
          dans le plan de la carte. Sans ça, les moitiés inclinées en arrière
          passent en profondeur DERRIÈRE un halo flou — l'illustration se
          retrouve voilée de la couleur de la rareté. */}
      <div className="rpg-coffret__carte-scene">
        <div className="rpg-coffret__carte-corps">
          {/* La tranche part de l'arête droite et recule : c'est elle qui
              donne l'épaisseur, et sa teinte suit la rareté. */}
          <span className="rpg-coffret__carte-tranche" aria-hidden="true" />
          <div className="rpg-coffret__carte-face">
            <div className="rpg-coffret__carte-art">
              <IllustrationCarte carte={carte} />
            </div>
            <div className="rpg-coffret__carte-texte">
              <p className="rpg-coffret__carte-nom">{carte.name}</p>
              <p className="rpg-coffret__carte-rarete">
                {rarete.label}
                {exemplaires > 1 ? <span className="rpg-coffret__copies">×{exemplaires}</span> : null}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Le **volume** du coffret : trois faces peintes, assemblées en 3D.
 *
 *   - la face avant (`--avant`, à `z = 0`) porte la peinture de la mythique, le
 *     sceau de cire, la jauge de cartes, le bloc imprimé et la bande du bas ;
 *   - la tranche droite (`--cote`) naît de l'arête droite, pivote et recule ;
 *   - le dessus (`--dessus`) naît de l'arête haute, bascule et recule.
 *
 * Le même composant sert **deux fois** : sur l'étagère du choix (fermé) et dans
 * la cérémonie d'ouverture (`ouvre`), où c'est le même coffret — mêmes faces,
 * même peinture, même épaisseur. Seul l'état change : le sceau se fend, le
 * couvercle bascule sur sa charnière arrière, la lumière monte.
 */
function VolumeCoffret({ couleur, nom, sousTitre, vitrine = null, ouvre = false }) {
  return (
    <span className={`rpg-coffret__boite-scene${ouvre ? ' rpg-coffret__boite-scene--ouverture' : ''}`}>
      <span className={`rpg-coffret__boite-volume${ouvre ? ' is-ouvert' : ''}`}>
        {/* Les faces cachées d'abord : elles passent derrière la face avant. */}
        <span className="rpg-coffret__boite-face rpg-coffret__boite-face--cote" aria-hidden="true">
          <span className="rpg-coffret__boite-cote-bande" />
          <span className="rpg-coffret__boite-cote-embleme">
            <ElementEmblem element={couleur} />
          </span>
        </span>
        <span className="rpg-coffret__boite-face rpg-coffret__boite-face--dessus" aria-hidden="true">
          <span className="rpg-coffret__boite-dessus-vernis" />
        </span>
        {/* L'intérieur : la bouche de la boîte. Il n'existe que dans la
            cérémonie — fermée, le couvercle le cache de toute façon, mais inutile
            de le peindre trois fois sur l'étagère du choix. */}
        {ouvre ? (
          <span className="rpg-coffret__boite-face rpg-coffret__boite-face--interieur" aria-hidden="true">
            {/* La rune du Sablier, estampée au fond : on ne la découvre qu'une
                fois le couvercle ouvert — c'est la marque du marchand, pas
                celle de la couleur. */}
            <span className="rpg-coffret__boite-interieur-rune"><RuneSablier /></span>
          </span>
        ) : null}
        <span className="rpg-coffret__boite-face rpg-coffret__boite-face--avant">
          <span className="rpg-coffret__boite-vitrine">
            {vitrine ? <IllustrationCarte carte={vitrine} /> : null}
            {/* Le sceau de cire porte l'emblème de la couleur : le coffret dit
                ce qu'il contient avant qu'on lise son nom. */}
            <span className="rpg-coffret__boite-sceau" aria-hidden="true">
              <ElementEmblem element={couleur} />
            </span>
            <span className="rpg-coffret__boite-jauge" aria-hidden="true">
              <b>30</b>
              <small>cartes</small>
            </span>
          </span>
          <span className="rpg-coffret__boite-texte">
            <span className="rpg-coffret__boite-couleur">
              <span className="rpg-coffret__boite-embleme" aria-hidden="true">
                <ElementEmblem element={couleur} />
              </span>
              {ELEMENT_LABELS[couleur] ?? couleur}
            </span>
            <span className="rpg-coffret__boite-nom">{nom}</span>
            <span className="rpg-coffret__boite-sous">{sousTitre}</span>
          </span>
          <span className="rpg-coffret__boite-bande">
            <b>1 mythique</b>
            <span>3 rares · trente cartes</span>
          </span>
        </span>
      </span>
    </span>
  );
}

/** Un coffret sur l'étagère du choix : le volume, dans un bouton. */
function BoiteCoffret({ coffret, onChoisir }) {
  const identite = COFFRETS_IDENTITE[coffret.couleur] ?? {};
  // La **mythique de vitrine** de la couleur, pas celle qui sera tirée : le
  // paquet donne envie sans vendre la surprise de la troisième vague.
  const vitrine = mythiqueVitrineDuCoffret(coffret);
  return (
    <button
      type="button"
      className={`rpg-coffret__boite rpg-coffret__boite--${coffret.couleur}`}
      onClick={() => onChoisir(coffret.id)}
      data-rpg-coffret-boite={coffret.couleur}
      data-rpg-coffret-vitrine={vitrine?.id}
      aria-label={`Ouvrir ${coffret.nom} — ${identite.sousTitre ?? ''} : une mythique, trois rares et vingt-six autres cartes`}
    >
      <VolumeCoffret
        couleur={coffret.couleur}
        nom={coffret.nom}
        sousTitre={identite.sousTitre}
        vitrine={vitrine}
      />
      <span className="rpg-coffret__boite-ouvrir" aria-hidden="true">Ouvrir →</span>
    </button>
  );
}

/**
 * La cérémonie d'ouverture : **le même coffret que celui du choix**, cette fois
 * en train de s'ouvrir. Le sceau de cire se fend, le couvercle bascule sur sa
 * charnière arrière, la lumière monte du fond — puis le rideau des cartes.
 *
 * La lumière et les rayons restent **hors du volume** (2D, derrière lui) : une
 * nappe floutée posée dans une scène `preserve-3d` la traverserait au lieu de
 * l'éclairer.
 */
function CoffretQuiSOuvre({ couleur, nom, vitrine = null }) {
  const identite = COFFRETS_IDENTITE[couleur] ?? {};
  return (
    <div className={`rpg-coffret__scene rpg-coffret__scene--${couleur}`} aria-hidden="true">
      <span className="rpg-coffret__halo" />
      <span className="rpg-coffret__onde">
        <i /><i /><i />
      </span>
      <div className="rpg-coffret__coffre">
        <span className="rpg-coffret__coffre-lumiere" />
        <span className="rpg-coffret__coffre-rayons" />
        <VolumeCoffret
          couleur={couleur}
          nom={nom}
          sousTitre={identite.sousTitre}
          vitrine={vitrine}
          ouvre
        />
        <span className="rpg-coffret__coffre-eclats">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ '--eclat': i, '--angle': `${(i * 360) / 14}deg`, '--portee': `${28 + ((i * 13) % 46)}px` }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export default function RpgCoffretBienvenue({ onOuvrir = null, onPlaySfx = null } = {}) {
  const [offre, setOffre] = useState(null);
  const [etape, setEtape] = useState('choix');
  const [vague, setVague] = useState(0);
  const [rideau, setRideau] = useState(false);
  const [ferme, setFerme] = useState(false);
  const reduit = useMemo(mouvementReduit, []);
  const minuteries = useRef([]);

  // Aucune minuterie ne survit au démontage : la cérémonie ne doit pas rouvrir
  // un écran déjà fermé (ou pire, changer de vague après la sortie).
  const plusTard = (action, delai) => {
    const id = window.setTimeout(action, delai);
    minuteries.current.push(id);
    return id;
  };
  const oublierMinuteries = () => {
    minuteries.current.forEach((id) => window.clearTimeout(id));
    minuteries.current = [];
  };
  useEffect(() => oublierMinuteries, []);

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
  const derniere = vague >= vagues.length - 1;

  const entrerDansLaCeremonie = () => {
    setEtape('ceremonie');
    setVague(0);
    onPlaySfx?.('card_draw');
  };

  const ouvrir = (id) => {
    const maj = choisirCoffret(offre, id);
    sauverOffreBienvenue(maj);
    setOffre(maj);
    const coffret = coffretChoisi(maj);
    if (coffret) onOuvrir?.(coffret);
    onPlaySfx?.('page_turn');
    if (reduit) {
      entrerDansLaCeremonie();
      return;
    }
    setEtape('ouverture');
    setVague(0);
    plusTard(entrerDansLaCeremonie, DUREE_OUVERTURE);
  };

  /** Abréger l'ouverture : on saute directement au socle. */
  const passerOuverture = () => {
    oublierMinuteries();
    onPlaySfx?.('select');
    entrerDansLaCeremonie();
  };

  /** Vague suivante, sous un rideau de lumière. */
  const vagueSuivante = () => {
    if (derniere) {
      setFerme(true);
      return;
    }
    onPlaySfx?.(vagues[vague + 1]?.cartes?.some((ligne) => ligne.carte.rarity === 'mythique') ? 'victoire' : 'card_draw');
    if (reduit) {
      setVague((courant) => courant + 1);
      return;
    }
    setRideau(true);
    plusTard(() => setVague((courant) => courant + 1), DUREE_RIDEAU * 0.45);
    plusTard(() => setRideau(false), DUREE_RIDEAU);
  };

  if (ferme || !offre || (!choisi && etape !== 'choix')) return null;

  if (etape === 'choix') {
    return (
      <div className="rpg-coffret" role="dialog" aria-modal="true" aria-labelledby="rpg-coffret-titre" data-rpg-coffret-phase="choix">
        <Poussiere />
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
              <BoiteCoffret key={coffret.id} coffret={coffret} onChoisir={ouvrir} />
            ))}
          </div>
          <p className="rpg-coffret__note">Le coffret ouvert devient votre collection de départ.</p>
        </div>
      </div>
    );
  }

  // ── Acte 0 : la boîte s'ouvre ─────────────────────────────────────────────
  if (etape === 'ouverture') {
    return (
      <div
        className="rpg-coffret rpg-coffret--ouverture"
        role="dialog"
        aria-modal="true"
        aria-label={`Ouverture de ${choisi.nom}`}
        data-rpg-coffret-phase="ouverture"
        data-rpg-coffret-couleur={choisi.couleur}
      >
        <Poussiere />
        <CoffretQuiSOuvre
          couleur={choisi.couleur}
          nom={choisi.nom}
          vitrine={mythiqueVitrineDuCoffret(choisi)}
        />
        <p className="sr-only" role="status">Le sceau se brise, le coffret s’ouvre.</p>
        <button type="button" className="rpg-coffret__passer" onClick={passerOuverture}>
          Passer
        </button>
        <span className="rpg-coffret__flash" aria-hidden="true" />
      </div>
    );
  }

  if (!vagueCourante) return null;
  const mythiqueEnScene = vagueCourante.cartes.some((ligne) => ligne.carte.rarity === 'mythique');

  return (
    <div
      className="rpg-coffret rpg-coffret--ceremonie"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rpg-coffret-vague-titre"
      data-rpg-coffret-phase="ceremonie"
      data-rpg-coffret-vague={vague}
      data-rpg-coffret-couleur={choisi.couleur}
    >
      <Poussiere />
      <div className="rpg-coffret__panneau">
        <p className="rpg-coffret__sur-titre">{choisi.nom}</p>
        <h1 id="rpg-coffret-vague-titre" className="rpg-coffret__titre" aria-live="polite">
          {vagueCourante.titre}
          <span key={vague} className="rpg-coffret__compte">{vagueCourante.cartes.length}</span>
        </h1>
        <p className="rpg-coffret__chapeau">{vagueCourante.legende}</p>
        <div
          key={vagueCourante.cle}
          className={`rpg-coffret__vague${reduit ? ' is-reduit' : ''}${mythiqueEnScene ? ' is-finale' : ''}`}
          data-rpg-coffret-vague-cartes={vagueCourante.cartes.length}
        >
          {vagueCourante.cartes.map((ligne, index) => (
            <CarteDuCoffret
              key={ligne.id}
              ligne={ligne}
              rang={index}
              total={vagueCourante.cartes.length}
              reduit={reduit}
            />
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
            // Pendant le rideau, la vague est déjà en train de changer : un
            // second clic ferait sauter une vague entière.
            disabled={rideau}
            onClick={vagueSuivante}
          >
            {derniere ? 'Entrer dans Bab El' : `Voir ${vagues[vague + 1]?.titre?.toLowerCase() ?? 'la suite'}`}
          </button>
        </div>
      </div>
      {rideau && <span className="rpg-coffret__rideau" aria-hidden="true" />}
    </div>
  );
}
