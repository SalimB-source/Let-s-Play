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

import RpgBrumeMythique from './RpgBrumeMythique.jsx';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import './rpg-coffret-bienvenue.css';
import { cardArt } from './rpgCardArt.js';
import { ElementEmblem } from './rpgEmblemes.jsx';
import { DeckBox, inclinerBoitier, redresserBoitier } from './RpgDeckBox.jsx';
import { cardRarityInfo } from './rpgCards.js';
import { chargerProgressionHistoire } from './rpgStory.js';
import { chargerAcquis, chargerCollectionDistante } from './rpgCollection.js';
import { chargerPortefeuille } from './rpgCredits.js';
import { chargerProfil } from './rpgProfil.js';
import { chargerDecksMaison } from './rpgDeckBuilder.js';
import { RPG_DECK_DEPART_ID } from './rpgDeckDeDepart.js';
import { AuthContext } from '../auth/AuthContext.jsx';
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

/**
 * Une carte du coffret, **à plat** : la peinture, son anneau, son nom et sa
 * rareté dessous, et une lueur qui change de teinte et d'intensité avec la
 * rareté. Aucune perspective, aucune rotation ni tranche : la peinture garde
 * ses couleurs et la mythique reçoit une brume dorée translucide, en plus du
 * halo derrière elle.
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
      {/* La scène porte la lueur (`::before`), qui reste derrière la carte. */}
      <div className="rpg-coffret__carte-scene">
        <div className="rpg-coffret__carte-corps">
          <div className="rpg-coffret__carte-face">
            <div className="rpg-coffret__carte-art">
              <IllustrationCarte carte={carte} />
              <RpgBrumeMythique carte={carte} />
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
 * Le coffret, **sous la forme d'un boîtier de deck** — le même objet que
 * l'étagère de l'onglet Deck (`DeckBox`, `rpg-deckbox.css`) : six faces, une
 * laque cerclée de laiton, l'illustration en plein art, la plaque du nom, les
 * emblèmes de la couleur et le compte des cartes.
 *
 * Pourquoi réutiliser ce boîtier plutôt que d'en dessiner un autre : c'est
 * exactement ce que le coffret devient une fois ouvert — le deck de la maison.
 * Le joueur ne voit donc pas deux objets, mais le même, avant et après ; et
 * tout le travail de 3D (balancement, inclinaison au curseur, ombre, reflets)
 * est déjà écrit, réglé et partagé.
 */
function deckDuCoffret(coffret, vitrine) {
  return {
    id: coffret.id,
    name: coffret.nom,
    // La couleur est **déclarée**, pas déduite des cartes : un coffret reste
    // mono-couleur même si une carte incolore se glisse dans son socle.
    element: coffret.couleur,
    elements: [coffret.couleur],
    boxArt: vitrine?.id,
    cardIds: coffret.cardIds,
  };
}

/** Un coffret sur l'étagère du choix : le boîtier, sa légende, et son bouton. */
function BoiteCoffret({ coffret, onChoisir, rang = 0 }) {
  const identite = COFFRETS_IDENTITE[coffret.couleur] ?? {};
  // La **mythique de vitrine** de la couleur, pas celle qui sera tirée : le
  // boîtier donne envie sans vendre la surprise de la troisième vague.
  const vitrine = mythiqueVitrineDuCoffret(coffret);
  return (
    <button
      type="button"
      className={`rpg-coffret__boite rpg-coffret__boite--${coffret.couleur}`}
      autoFocus={rang === 0}
      onClick={() => onChoisir(coffret.id)}
      onPointerMove={inclinerBoitier}
      onPointerLeave={redresserBoitier}
      data-rpg-coffret-boite={coffret.couleur}
      data-rpg-coffret-vitrine={vitrine?.id}
      aria-label={`Ouvrir ${coffret.nom} — ${identite.sousTitre ?? ''} : une mythique, trois rares et vingt-six autres cartes`}
    >
      <DeckBox deck={deckDuCoffret(coffret, vitrine)} index={rang} size="shelf" />
      <span className="rpg-coffret__boite-texte">
        <span className="rpg-coffret__boite-couleur">
          <span className="rpg-coffret__boite-embleme" aria-hidden="true">
            <ElementEmblem element={coffret.couleur} />
          </span>
          {ELEMENT_LABELS[coffret.couleur] ?? coffret.couleur}
        </span>
        <strong className="rpg-coffret__boite-nom">{coffret.nom}</strong>
        <em className="rpg-coffret__boite-sous">{identite.sousTitre}</em>
        <span className="rpg-coffret__boite-meta">30 cartes · 1 mythique · 3 rares</span>
        <span className="rpg-coffret__boite-ouvrir" aria-hidden="true">Ouvrir →</span>
      </span>
    </button>
  );
}

/**
 * La cérémonie d'ouverture : **le même boîtier que celui du choix**, en train
 * de s'ouvrir. Le fermoir saute, le couvercle bascule sur son arête arrière, la
 * lumière monte du fond — puis le rideau des cartes.
 *
 * La lumière, les rayons et les éclats restent **hors** du boîtier (2D, derrière
 * lui) : une nappe floutée posée dans une scène `preserve-3d` traverserait les
 * faces au lieu de les éclairer.
 */
function CoffretQuiSOuvre({ coffret, vitrine = null }) {
  const identite = COFFRETS_IDENTITE[coffret.couleur] ?? {};
  return (
    <div className={`rpg-coffret__scene rpg-coffret__scene--${coffret.couleur}`} aria-hidden="true">
      <span className="rpg-coffret__halo" />
      <span className="rpg-coffret__onde">
        <i /><i /><i />
      </span>
      <div className="rpg-coffret__coffre">
        <span className="rpg-coffret__coffre-lumiere" />
        <span className="rpg-coffret__coffre-rayons" />
        <DeckBox deck={deckDuCoffret(coffret, vitrine)} size="shelf" />
        <span className="rpg-coffret__coffre-eclats">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ '--eclat': i, '--angle': `${(i * 360) / 14}deg`, '--portee': `${28 + ((i * 13) % 46)}px` }} />
          ))}
        </span>
        <span className="rpg-coffret__coffre-titre">{coffret.nom}</span>
        <span className="rpg-coffret__coffre-sous">{identite.sousTitre}</span>
      </div>
    </div>
  );
}

export default function RpgCoffretBienvenue({ onOuvrir = null, onPlaySfx = null, pret = true, onEtatChange = null } = {}) {
  const [offre, setOffre] = useState(null);
  // `undefined` signifie qu'aucun verdict n'a encore été calculé ; `null` est
  // au contraire le propriétaire invité (partagé avec les profils de démo).
  const [proprietaireOffre, setProprietaireOffre] = useState(undefined);
  const [etape, setEtape] = useState('choix');
  const [vague, setVague] = useState(0);
  const [rideau, setRideau] = useState(false);
  const [ferme, setFerme] = useState(false);
  const reduit = useMemo(mouvementReduit, []);
  const minuteries = useRef([]);
  // La portée du stockage dépend du compte : l'écran attend que la session soit
  // résolue avant de lire quoi que ce soit, et se rejoue si le compte change
  // (connexion faite après le montage, passage d'un profil de démonstration à
  // un vrai compte). Sans cela, l'écran décidait « invité » puis ne se
  // réévaluait plus jamais.
  // `useContext` plutôt que `useAuth` : l'écran tourne aussi hors fournisseur
  // (démo du coffret, vérifications), où il n'y a simplement pas de compte.
  const auth = useContext(AuthContext);
  const compteId = auth?.isDemo ? null : (auth?.user?.id ?? null);
  const sessionPrete = !auth?.loading;

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

  // L'offre se lit **une fois la session résolue** : au premier passage elle
  // est tirée puis rangée sous la clé du compte, pour qu'un rechargement
  // repropose exactement les trois mêmes coffrets.
  //
  // Le verdict lit les données de progression du joueur courant après leur
  // synchronisation. La reprise locale prévue pour un véritable invité est
  // respectée ; aucune offre d'un autre compte n'est réutilisée.
  useEffect(() => {
    // Changer de compte interrompt aussi une éventuelle animation de l'ancien :
    // aucun rideau ou minuterie ne doit agir sur le nouveau choix.
    oublierMinuteries();
    setEtape('choix');
    setVague(0);
    setRideau(false);
    if (typeof window === 'undefined' || !sessionPrete || !pret) {
      setProprietaireOffre(undefined);
      return;
    }
    const existante = chargerOffreBienvenue();
    const courante = existante.coffrets.length > 0 ? existante : offreBienvenue();
    const necessaire = coffretBienvenueNecessaire({
      offre: courante,
      progression: chargerProgressionHistoire(),
      acquis: chargerAcquis({ reprise: false }),
      collection: chargerCollectionDistante({ reprise: false }),
      bourse: chargerPortefeuille(),
      profil: chargerProfil(),
      aDeckPersonnel: chargerDecksMaison().some((deck) => deck.id !== RPG_DECK_DEPART_ID),
    });
    if (necessaire && existante.coffrets.length === 0) sauverOffreBienvenue(courante);
    setProprietaireOffre(compteId);
    setFerme(!necessaire);
    setOffre(necessaire ? courante : null);
  }, [compteId, sessionPrete, pret]);

  const choisi = coffretChoisi(offre);
  const vagues = useMemo(() => (choisi ? vaguesDuCoffret(choisi) : []), [choisi]);
  const enAttente = !sessionPrete || !pret || proprietaireOffre !== compteId;
  const bloqueAccueil = enAttente || Boolean(!ferme && offre && (choisi || etape === 'choix'));
  useEffect(() => { onEtatChange?.(bloqueAccueil); }, [bloqueAccueil, onEtatChange]);
  useEffect(() => () => { onEtatChange?.(false); }, [onEtatChange]);

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
    if (enAttente) return;
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

  if (enAttente) {
    return (
      <div className="rpg-coffret rpg-coffret--attente" role="status" aria-live="polite" aria-busy="true" data-rpg-coffret-attente>
        <div className="rpg-coffret__panneau">
          <p className="rpg-coffret__sur-titre">Le Sablier de Bab El</p>
          <p className="rpg-coffret__titre">Préparation de votre accueil…</p>
          <p className="rpg-coffret__chapeau">Nous retrouvons votre progression avant de vous laisser jouer.</p>
        </div>
      </div>
    );
  }
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
            {offre.coffrets.map((coffret, rang) => (
              <BoiteCoffret key={coffret.id} coffret={coffret} onChoisir={ouvrir} rang={rang} />
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
        <CoffretQuiSOuvre coffret={choisi} vitrine={mythiqueVitrineDuCoffret(choisi)} />
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
