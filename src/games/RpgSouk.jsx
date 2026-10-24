/**
 * Le Souk de Bab El — l'écran de la bourse et des quêtes du jour.
 *
 * C'est le sixième onglet du menu (dossier `13-souk-credits-quetes-boosters.md`,
 * §7). Il répond à quatre questions, dans cet ordre :
 *
 *   1. **combien j'ai** — le solde ◈, la série de jours, et le compte à rebours
 *      du cycle (« le cycle se referme dans 7 h 12 ») ;
 *   2. **ce qui m'attend** — les trois quêtes du jour, une barre de progression
 *      chacune, leur récompense, et le bouton **Réclamer** — désactivé tant que
 *      l'objectif n'est pas atteint, et jamais muet sur ce qu'il reste à faire ;
 *   3. **ce que j'achète** — le comptoir, juste sous les quêtes : un seul
 *      paquet mélangé (toutes les couleurs ouvertes), son prix doré et
 *      l'appel du coffret ;
 *   4. **le Cachet du cycle** et celui de la semaine, dont les sept jours se
 *      lisent en petites cartes cachetées au fil de la série.
 *
 * Le composant est **purement présentationnel** : la persistance, la fusion de
 * compte et l'encaissement vivent dans `useSablierBourse.js`, appelé par la
 * page. Il ne connaît que des états normalisés (`rpgQuetes.js`,
 * `rpgCredits.js`) et rend toujours quelque chose, quel que soit l'état reçu :
 * un Souk vide doit dire pourquoi il est vide, pas casser l'écran.
 */

import { useEffect, useRef, useState } from 'react';
import './rpg-souk.css';
import { GAINS, creditsLisible, exemplairesDuPortefeuille, paquetsAvantMythique } from './rpgCredits.js';
import {
  JOURS_DE_LA_SERIE, cachetDeLaSemaineDisponible, cachetDisponible,
  etapesDeLaSerie, joursAvantLeCachetDeLaSemaine, secondesAvantMinuit, vueDeLaQuete,
} from './rpgQuetes.js';
import { COFFRET, TAUX, etatRayons, rayonParId } from './rpgBoosters.js';
import { cardById, cardTypeLine } from './rpgCards.js';
import { SOUK_DIRECT_REGLES, vueCarteDeEtal } from './rpgSoukDirect.js';
import RpgBoosterOuverture from './RpgBoosterOuverture.jsx';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import RpgCardCopyBadge from './RpgCardCopyBadge.jsx';

/** Les paliers, tels que le joueur les lit (le module les nomme en interne). */
const PALIERS = Object.freeze({ facile: 'Facile', moyenne: 'Moyenne', difficile: 'Difficile' });

/** « 7 h 12 », « 43 min », « moins d'une minute » — le temps qui reste au cycle. */
export function dureeAvantMinuit(secondes) {
  const total = Math.max(0, Math.floor(Number(secondes) || 0));
  if (total < 60) return 'moins d’une minute';
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** « 12 mars, 14 h 05 » — le journal se lit, il ne se déchiffre pas. */
export function quandLisible(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const jour = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const heure = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${jour}, ${heure} h ${minute}`;
}

/** La journée se lit en français, ou se taît si l'état n'a pas de jour. */
function jourLisible(cle) {
  const [annee, mois, jour] = String(cle ?? '').split('-').map(Number);
  if (!annee || !mois || !jour) return null;
  const date = new Date(annee, mois - 1, jour);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Le compte à rebours du cycle, rafraîchi à la minute. Il ne passe pas par une
 * animation : c'est du texte, et il doit rester juste même sur un appareil lent.
 */
function useResteDuCycle() {
  const [secondes, setSecondes] = useState(() => secondesAvantMinuit());
  useEffect(() => {
    const battement = setInterval(() => setSecondes(secondesAvantMinuit()), 30000);
    return () => clearInterval(battement);
  }, []);
  return secondes;
}

/**
 * La ligne de taux du comptoir : ce qu'on y trouve, ce qui est garanti, et la
 * promesse des mythiques. Le chiffre de pitié est celui du portefeuille — il
 * ne se promet que si le vivier garde encore une mythique à donner.
 */
function ligneDeTaux(etat, portefeuille) {
  const chance = Math.round(TAUX.mythique * 100);
  const avant = paquetsAvantMythique(portefeuille, {
    aDesMythiques: etat.mythiques > 0,
    seuil: TAUX.pitie,
  });
  const morceaux = [
    `${TAUX.cartes} cartes`,
    `${TAUX.rareGarantie} rare${TAUX.rareGarantie > 1 ? 's' : ''} garantie${TAUX.rareGarantie > 1 ? 's' : ''}`,
    etat.mythiques
      ? (avant === 0 ? 'mythique au prochain paquet' : `${chance} % de mythique · assurée dans ${avant}`)
      : 'aucune mythique au vivier',
  ];
  return morceaux.join(' · ');
}

/** Le sceau de cire qui s'abat quand un Cachet est encaissé — pur décor. */
function Sceau({ actif }) {
  if (!actif) return null;
  const ETINCELLES = 9;
  return (
    <span className="rpg-souk__sceau" aria-hidden="true">
      <span className="rpg-souk__sceau-onde" />
      <span className="rpg-souk__sceau-corps"><RpgCreditIcon /></span>
      {Array.from({ length: ETINCELLES }).map((_, i) => (
        <span key={i} className="rpg-souk__sceau-etincelle" style={{ '--s': i }} />
      ))}
    </span>
  );
}

/** Le message du comptoir fermé : le Souk ouvre à la première victoire. */
function raisonFermeture(etat) {
  if (etat.ouvert) return null;
  return 'Fermé — le Souk ouvrira à votre première victoire.';
}

/** Une quête du jour : son palier, sa barre, sa récompense, son bouton. */
function CarteQuete({ id, etatQuetes, onReclamer, onPlaySfx, onCelebrate }) {
  // La vue partagée des quêtes : c'est aussi celle du panneau de l'onglet
  // Jouer, donc les deux écrans disent forcément la même chose.
  const tout = vueDeLaQuete(etatQuetes, id);
  if (!tout) return null;
  const { quete, progres, reclamee, terminee, etat, pourcent, reste } = tout;
  const reclamer = (event) => {
    const gagne = onReclamer?.(id);
    onPlaySfx?.(gagne ? 'bell' : 'erreur');
    if (gagne) onCelebrate?.(quete.recompense, event.currentTarget);
  };
  return (
    <li className={`rpg-souk__quete is-${etat}`} data-souk-quete={id} data-souk-quete-etat={etat}>
      <header className="rpg-souk__quete-tete">
        <span className="rpg-souk__palier">{PALIERS[quete.palier] ?? quete.palier}</span>
        <h4>{quete.titre}</h4>
      </header>
      <p className="rpg-souk__quete-texte">{quete.texte}</p>
      <div
        className="rpg-souk__jauge"
        role="progressbar"
        aria-label={`${quete.titre} : ${progres} sur ${quete.objectif}`}
        aria-valuenow={progres}
        aria-valuemin={0}
        aria-valuemax={quete.objectif}
        data-souk-progres={`${progres}/${quete.objectif}`}
      >
        <span className="rpg-souk__jauge-remplie" style={{ width: `${pourcent}%` }} aria-hidden="true" />
        <span className="rpg-souk__jauge-texte">{progres} / {quete.objectif}</span>
      </div>
      <footer className="rpg-souk__quete-pied">
        <span className="rpg-souk__recompense">
          +{quete.recompense} <RpgCreditIcon />
          <span className="sr-only">crédits</span>
        </span>
        {reclamee ? (
          <span className="rpg-souk__pris">Réclamée</span>
        ) : (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-souk-reclamer={id}
            disabled={!terminee}
            title={terminee ? `Encaisser ${quete.recompense} crédits` : `Il reste ${reste} à faire`}
            onClick={reclamer}
          >
            Réclamer{terminee ? (
              <>
                {' '}{quete.recompense} <RpgCreditIcon />
                <span className="sr-only">crédits</span>
              </>
            ) : ''}
          </button>
        )}
      </footer>
      {!reclamee && !terminee && (
        <p className="rpg-souk__quete-note" data-souk-reste={reste}>
          {reste === 1 ? 'Encore 1 et c’est dans la poche.' : `Encore ${reste}.`}
        </p>
      )}
    </li>
  );
}

/**
 * Le paquet du Souk, en volume : un sachet scellé au laiton du comptoir, avec
 * ses deux sertissages, sa rune et son reflet qui glisse dessus.
 *
 * Le paquet **est** le bouton d'achat — c'est l'objet qu'on clique, pas une
 * ligne de commande à côté de lui. La scène 3D est décorative (`aria-hidden`),
 * le bouton porte un nom lisible (« Ouvrir le paquet du Souk · 140 crédits »)
 * et se désactive avec son motif quand l'achat est refusé.
 */
function PaquetDuRayon({ rayon, index, ferme, prix, refus, onOuvrir, cardArt }) {
  const cible = rayon.couleur ? `le paquet ${rayon.nom}` : `le paquet du ${rayon.nom}`;
  const nom = `Ouvrir ${cible} · ${prix} crédits`;
  // La vitrine montre une mythique du vivier : c'est l'appât du paquet, pas un
  // droit de tirage. Le paquet mélangé montre celle du Djinn du Souk.
  const mythiqueId = rayon.vitrine ?? null;
  return (
    <button
      type="button"
      className={`rpg-souk__paquet${ferme ? ' is-ferme' : ''}`}
      data-souk-ouvrir={rayon.id}
      data-souk-paquet={rayon.couleur ?? 'souk'}
      disabled={Boolean(refus)}
      title={refus ?? nom}
      aria-label={nom}
      onClick={() => { onOuvrir?.(rayon.id); }}
    >
      <span className="rpg-souk__paquet-ombre" aria-hidden="true" />
      <span className="rpg-souk__paquet-scene" style={{ '--i': index }} aria-hidden="true">
        <span className="rpg-souk__paquet-sway">
          <span className="rpg-souk__paquet-corps">
            <span className="rpg-souk__paquet-face rpg-souk__paquet-face--dos" />
            <span className="rpg-souk__paquet-face rpg-souk__paquet-face--tranche" />
            <span className="rpg-souk__paquet-face rpg-souk__paquet-face--dessus" />
            <span className="rpg-souk__paquet-face rpg-souk__paquet-face--dessous" />
            <span className={`rpg-souk__paquet-face rpg-souk__paquet-face--avant${mythiqueId ? ' has-carte' : ''}`}>
              {mythiqueId && cardArt && (
                <img className="rpg-souk__paquet-carte" src={cardArt(mythiqueId)} alt={`Illustration de la carte mythique ${cardById(mythiqueId)?.name ?? 'du Souk'}`} loading="lazy" />
              )}
              <span className="rpg-souk__paquet-sertissage" />
              {mythiqueId && <span className="rpg-souk__paquet-voile" aria-hidden="true" />}
              <span className="rpg-souk__paquet-rune">⌛</span>
              <span className="rpg-souk__paquet-nom">{rayon.nom}</span>
              <span className="rpg-souk__paquet-meta">
                {TAUX.cartes} cartes
                <em>{TAUX.rareGarantie} rare{TAUX.rareGarantie > 1 ? 's' : ''} garantie{TAUX.rareGarantie > 1 ? 's' : ''}</em>
              </span>
              <span className="rpg-souk__paquet-sertissage" />
              {mythiqueId && <span className="rpg-souk__paquet-mythique-tag" aria-hidden="true">Mythique</span>}
            </span>
          </span>
        </span>
      </span>
      {/* L'étiquette de prix est la seule chose que le paquet dit à voix
          haute : « Acheter · 140 ». Elle grossit, se dore et respire dès que
          l'achat est possible — c'est l'appel du comptoir, pas une ligne de
          plus sous le paquet. Le texte reste exactement le même (le smoke le
          lit mot pour mot) : les effets sont des pseudo-éléments. */}
      <span className="rpg-souk__paquet-prix" data-souk-prix={prix}>
        <span className="rpg-souk__prix-geste">Acheter</span>
        {' '}
        <span className="rpg-souk__prix-sep" aria-hidden="true">·</span>
        {' '}
        <span className="rpg-souk__prix-valeur">
          {creditsLisible(prix)} <RpgCreditIcon />
        </span>
      </span>
    </button>
  );
}

/** L'ordinal d'une copie, tel qu'il se lit sur une pastille de comptoir. */
function copieLisible(nombre) {
  return nombre <= 1 ? '1ᵉʳ' : `${nombre}ᵉ`;
}

/**
 * Une carte de l'étal quotidien : sa face, son stock et son prix à l'unité.
 *
 * L'état de la carte ne se devine pas ici — il se lit dans la règle pure
 * (`vueCarteDeEtal`) : « disponible » veut dire qu'**il manque une copie**, la
 * première ou la seconde ; « complet » veut dire que le quota du deck est
 * atteint et qu'il n'y a plus rien à acheter. Un joueur qui possède une carte
 * en un seul exemplaire ne voit donc plus « déjà obtenue » : il voit le
 * deuxième exemplaire en vente, ou la raison pour laquelle il n'est pas en vente.
 */
function CarteDeLEtal({
  id, collection, exemplaires, acheteAujourdhui, credits, cardArt, onAcheter,
}) {
  const carte = cardById(id);
  if (!carte) return null;
  const vue = vueCarteDeEtal({ id, collection, exemplaires, acheteAujourdhui, credits });
  if (!vue) return null;
  const {
    rarete, prix, etat, manquante, acquis, limite, reste, manque,
  } = vue;
  const unique = limite <= 1;
  const copie = `${copieLisible(acquis)} exemplaire${acquis > 1 ? 's' : ''}`;
  const titre = etat === 'achetee'
    ? `${carte.name} · ${copie} en collection — la copie suivante sera en vente quand la carte reparaîtra à l’étal`
    : etat === 'complet'
      ? unique
        ? `${carte.name} est une carte unique dans un deck : un exemplaire suffit et ${carte.name} en compte un`
        : `${carte.name} est au complet : ${acquis} exemplaires sur ${limite}, le quota du deck`
      : etat === 'sans-solde'
        ? `Il manque ${creditsLisible(manque)} crédits`
        : manquante
          ? `Acheter le ${copieLisible(acquis + 1)} exemplaire de ${carte.name} pour ${creditsLisible(prix)} crédits`
          : `Acheter le ${copieLisible(acquis + 1)} exemplaire de ${carte.name} pour ${creditsLisible(prix)} crédits — votre collection le compterait ${acquis + 1} sur ${limite}`;
  const note = etat === 'achetee'
    ? `Achetée aujourd'hui · ${acquis}/${limite}`
    : etat === 'complet'
      ? unique ? 'Unique au deck · déjà en collection' : `Quota du deck atteint · ${acquis}/${limite}`
      : manquante
        ? 'Carte absente de votre collection'
        : `Il vous manque le ${copieLisible(acquis + 1)} exemplaire · ${acquis}/${limite}`;
  return (
    <li
      className={`rpg-souk__direct-carte is-${rarete.key} is-${etat}`}
      data-card-id={carte.id}
      data-souk-direct-carte={carte.id}
      data-souk-direct-etat={etat}
      data-souk-direct-rarete={rarete.key}
      data-souk-direct-prix={prix}
      title={`${carte.name} — clic droit pour ouvrir la fiche`}
    >
      <div className="rpg-souk__direct-art">
        <img src={cardArt?.(carte)} alt={`Illustration de ${carte.name}`} loading="lazy" />
        <span className="rpg-souk__direct-rarete">{rarete.label}</span>
        <RpgCardCopyBadge
          nombre={acquis}
          limite={limite}
          className="rpg-souk__direct-copies"
        />
      </div>
      <div className="rpg-souk__direct-corps">
        <h4>{carte.name}</h4>
        <p>{cardTypeLine(carte)}</p>
        <p className="rpg-souk__direct-stock" data-souk-direct-stock={etat} data-souk-direct-reste={reste}>
          {note}
        </p>
      </div>
      <button
        type="button"
        className="rpg-menu-button rpg-souk__direct-acheter"
        data-souk-direct-acheter={carte.id}
        disabled={etat !== 'disponible'}
        title={titre}
        aria-label={titre}
        onClick={() => onAcheter?.(carte.id)}
      >
        {etat === 'achetee' ? 'Achetée aujourd’hui' : etat === 'complet' ? (unique ? 'Déjà en collection' : `Complet · ${acquis}/${limite}`) : (
          <>
            {manquante ? 'Acheter' : `Acheter le ${copieLisible(acquis + 1)}`} · {creditsLisible(prix)} <RpgCreditIcon />
            <span className="sr-only">
              {`crédits, ${manquante ? 'le premier exemplaire qui vous manque' : `le ${copieLisible(acquis + 1)} exemplaire sur ${limite}`}`}
            </span>
          </>
        )}
      </button>
      {etat === 'sans-solde' && (
        <p className="rpg-souk__direct-refus">Il manque {creditsLisible(manque)} <RpgCreditIcon /></p>
      )}
    </li>
  );
}

export default function RpgSouk({
  quetes = null,
  credits = 0,
  aReclamer = 0,
  statutSync = 'local',
  portefeuille = null,
  progression = null,
  collection = null,
  ouverture = null,
  onReclamerQuete,
  onReclamerCachet,
  onReclamerSemaine,
  onOuvrirBooster,
  onOuvrirCoffret,
  onAcheterCarteDirecte,
  onRafraichirEtal,
  onFermerOuverture,
  onExit,
  onPlaySfx,
  cardArt,
}) {
  const restant = useResteDuCycle();
  const soldeRef = useRef(null);
  const cachetBtnRef = useRef(null);
  const semaineBtnRef = useRef(null);
  const burstSeq = useRef(0);
  const reduceMotion = useRef(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [bursts, setBursts] = useState([]);
  const [soldePop, setSoldePop] = useState(false);
  const [cachetSlam, setCachetSlam] = useState(false);
  const [semaineSlam, setSemaineSlam] = useState(false);
  const [etalMessage, setEtalMessage] = useState(null);

  /** La fête d'une récompense : des pièces du bouton jusqu'au solde, et le
      solde qui fait un pop. Rien ne s'anime si l'utilisateur a demandé le
      mouvement réduit — le montant se met à jour tout seul. */
  const celebrate = (amount, sourceEl) => {
    if (reduceMotion.current || !sourceEl || !soldeRef.current) return;
    const a = sourceEl.getBoundingClientRect();
    const b = soldeRef.current.getBoundingClientRect();
    const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    const to = { x: b.left + b.width * 0.32, y: b.top + b.height / 2 };
    const id = ++burstSeq.current;
    setBursts((prev) => [...prev, { id, from, to, amount }]);
    setSoldePop(true);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((x) => x.id !== id));
    }, 1000);
    window.setTimeout(() => setSoldePop(false), 560);
  };
  const jour = jourLisible(quetes?.jour);
  const liste = Array.isArray(quetes?.quetes) ? quetes.quetes : [];
  const prises = liste.filter((id) => vueDeLaQuete(quetes, id)?.reclamee).length;
  const cachet = cachetDisponible(quetes) ? 'disponible' : quetes?.cachet ? 'pris' : 'attente';
  // Le comptoir : un seul paquet, toutes les couleurs ouvertes. `etatRayons`
  // est une lecture pure — elle ne réserve rien et ne débite rien.
  const rayons = etatRayons(progression, collection);
  const ouverts = rayons.filter((etat) => etat.ouvert).length;
  const semaine = cachetDeLaSemaineDisponible(quetes) ? 'disponible' : quetes?.semaine ? 'pris' : 'attente';
  // Les sept cartes de la série : les jours déjà passés portent leur cachet,
  // les autres attendent. La règle vit dans `rpgQuetes.js`.
  const joursDeLaSerie = etapesDeLaSerie(quetes);
  const journal = Array.isArray(portefeuille?.journal) ? portefeuille.journal : [];
  const jouees = portefeuille?.ouvertures ?? 0;
  const etal = portefeuille?.etal ?? { jour: quetes?.jour ?? null, cartes: [], achetees: [], rafraichissements: 0 };
  const offresDirect = Array.isArray(etal.cartes) ? etal.cartes : [];
  // Deux lectures distinctes, et c'est voulu : `collectionDirect` répond à
  // « est-ce que je la possède ? » (donc : puis-je la jouer), le compteur
  // d'`exemplaires` répond à « combien de copies ai-je payées ? » (donc :
  // l'étal a-t-il encore une copie à me vendre). L'écran ne fait que les relire.
  const collectionDirect = Array.isArray(collection) ? collection : (portefeuille?.cartes ?? []);
  // Le lecteur unique (`exemplairesDuPortefeuille`) re-normalise le compteur :
  // une sauvegarde retouchée qui prétendrait « 3/2 » ne remplira pas la pastille.
  const exemplairesDirect = exemplairesDuPortefeuille(portefeuille);
  const cartesCompletes = offresDirect.filter((id) => vueCarteDeEtal({
    id, collection: collectionDirect, exemplaires: exemplairesDirect, credits,
  })?.complet).length;
  const rafraichissementUtilise = etal.rafraichissements >= SOUK_DIRECT_REGLES.rafraichissementsParJour;
  const sync = statutSync === 'synchronise'
    ? '☁ Synchronisé avec votre compte'
    : statutSync === 'attente'
      ? '☁ Synchronisation du compte…'
      : statutSync === 'horsligne'
        ? '☁ Compte non rejoint : la bourse reste sur cet appareil'
        : 'Bourse gardée sur cet appareil';

  const reclamerCachet = () => {
    const gagne = onReclamerCachet?.();
    onPlaySfx?.(gagne ? 'victoire' : 'erreur');
    if (gagne && !cachetSlam) {
      celebrate(GAINS.cachetDuCycle, cachetBtnRef.current);
      setCachetSlam(true);
      window.setTimeout(() => setCachetSlam(false), 700);
    }
  };

  const acheterDansEtal = (cardId) => {
    const resultat = onAcheterCarteDirecte?.(cardId);
    if (resultat?.ok) {
      const { acquis = 1, limite = 1, complet = false } = resultat;
      const stock = limite > 1 ? `${acquis}/${limite} exemplaires` : `${acquis} exemplaire`;
      setEtalMessage({
        ok: true,
        texte: resultat.carte.name
          ? `${resultat.carte.name} rejoint votre collection — ${stock}${complet ? ', la carte est au quota du deck.' : '.'}`
          : `Un exemplaire de plus — ${stock}.`,
      });
      onPlaySfx?.(resultat.carte?.rarity === 'mythique' ? 'victoire' : 'card_draw');
      return;
    }
    const messages = {
      'deja-achetee': 'Cette carte a déjà été achetée dans cet étal aujourd’hui. Revenez quand elle y reparaîtra pour la copie suivante.',
      'quota-atteint': 'Votre collection a déjà tous les exemplaires que le deck autorise pour cette carte.',
      // Raison d'une sauvegarde antérieure à la règle du stock : le message
      // reste traduit pour ne jamais afficher un code en clair.
      'deja-possedee': 'Cette carte est déjà dans votre collection.',
      'solde-insuffisant': 'Votre bourse ne contient pas assez de crédits.',
      'hors-etal': 'Cette carte ne fait plus partie de la sélection du jour.',
    };
    setEtalMessage({ ok: false, texte: messages[resultat?.raison] ?? 'L’achat n’est pas disponible pour le moment.' });
    onPlaySfx?.('erreur');
  };

  const rafraichirEtal = () => {
    const resultat = onRafraichirEtal?.();
    if (resultat?.ok) {
      setEtalMessage({ ok: true, texte: 'Le marchand propose cinq nouvelles cartes. À demain pour le prochain rafraîchissement.' });
      onPlaySfx?.('page_turn');
      return;
    }
    setEtalMessage({ ok: false, texte: 'Le rafraîchissement du jour a déjà été utilisé.' });
    onPlaySfx?.('erreur');
  };

  return (
    <main className="rpg-souk" aria-label="Le Souk de Bab El" data-souk>
      {ouverture && (
        <RpgBoosterOuverture
          ouverture={ouverture}
          cardArt={cardArt}
          onFermer={onFermerOuverture}
          onPlaySfx={onPlaySfx}
        />
      )}
      <header className="rpg-souk__header">
        <div className="rpg-souk__titre">
          <span className="rpg-mode-menu__eyebrow">LE SABLIER · LE SOUK DE BAB EL</span>
          <h2>Le Souk</h2>
          <p>Les étals paient en crédits ce que les Tours paient en histoires. Vos cartes s’y achètent désormais.</p>
          <p className="rpg-souk__sync" role="status">{sync}</p>
        </div>
        <div className="rpg-souk__bourse">
          <p className={`rpg-souk__solde${soldePop ? ' is-pop' : ''}`} ref={soldeRef} data-souk-solde={credits} aria-label={`Bourse : ${credits} crédits`}>
            <span className="rpg-souk__solde-signe" aria-hidden="true"><RpgCreditIcon anime /></span>
            <strong>{creditsLisible(credits)}</strong>
            <em>crédits</em>
          </p>
          <p className="rpg-souk__cycle" data-souk-cycle={restant}>
            Le cycle se referme dans <strong>{dureeAvantMinuit(restant)}</strong>
          </p>
          <p className="rpg-souk__serie">
            {quetes?.serie > 1 ? `${quetes.serie} jours d’affilée` : 'Premier jour du cycle'}
          </p>
        </div>
        <button type="button" className="rpg-menu-button rpg-souk__retour" data-souk-retour onClick={() => { onPlaySfx?.('menu'); onExit?.(); }}>
          <span aria-hidden="true">←</span> Menu
        </button>
      </header>

      {aReclamer > 0 && (
        <p className="rpg-souk__attente" role="status" data-souk-attente={aReclamer}>
          <RpgCreditIcon />{' '}
          {aReclamer === 1 ? 'Une récompense vous attend' : `${aReclamer} récompenses vous attendent`} — elles sont plus bas.
        </p>
      )}

      <section className="rpg-souk__section" aria-labelledby="souk-quetes-titre">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-quetes-titre">Les quêtes du jour</h3>
          <p>{jour ? `Journée du ${jour}` : 'La journée s’ouvre au premier duel.'}</p>
        </div>
        {liste.length ? (
          <ul className="rpg-souk__quetes" data-souk-quetes={liste.length}>
            {liste.map((id) => (
              <CarteQuete key={id} id={id} etatQuetes={quetes} onReclamer={onReclamerQuete} onPlaySfx={onPlaySfx} onCelebrate={celebrate} />
            ))}
          </ul>
        ) : (
          <p className="rpg-souk__vide" data-souk-quetes="vide">
            Le marchand prépare la journée. Elle s’ouvrira au prochain retour dans le jeu.
          </p>
        )}
      </section>

      <section className="rpg-souk__section rpg-souk__section--rayons" aria-labelledby="souk-rayons-titre">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-rayons-titre">Les boosters</h3>
          <p data-souk-rayons={ouverts > 0 ? 'ouvert' : 'ferme'}>
            {ouverts > 0
              ? 'Toutes les couleurs entrées dans la ville, mélangées au hasard'
              : 'Le comptoir ouvrira à votre première victoire'}
          </p>
        </div>
        <ul className="rpg-souk__rayons" data-souk-rayons-nombre={rayons.length}>
          {rayons.map((etat, index) => {
            const ferme = raisonFermeture(etat);
            const assez = credits >= etat.prix;
            const manque = creditsLisible(etat.prix - credits);
            const refus = ferme ?? (assez ? null : `Il manque ${creditsLisible(etat.prix - credits)} crédits.`);
            return (
              <li
                key={etat.rayon.id}
                className={`rpg-souk__rayon rpg-souk__rayon--${etat.rayon.couleur ?? 'souk'}${etat.ouvert ? '' : ' is-ferme'}${etat.complet ? ' is-complet' : ''}`}
                data-souk-rayon={etat.rayon.id}
                data-souk-rayon-etat={ferme ? 'ferme' : refus ? 'sans-solde' : 'ouvert'}
              >
                <header>
                  <h4>{etat.rayon.titre ?? etat.rayon.nom}</h4>
                  <span className="rpg-souk__rayon-etat" aria-hidden="true">
                    {etat.ouvert ? 'Ouvert' : 'Fermé'}
                  </span>
                </header>
                <p className="rpg-souk__rayon-texte">{etat.rayon.texte}</p>
                <PaquetDuRayon
                  rayon={etat.rayon}
                  index={index}
                  ferme={Boolean(ferme)}
                  prix={etat.prix}
                  refus={refus}
                  cardArt={cardArt}
                  onOuvrir={onOuvrirBooster}
                />
                <p className="rpg-souk__rayon-taux" data-souk-rayon-taux>{ligneDeTaux(etat, portefeuille)}</p>
                <p className="rpg-souk__rayon-reste" data-souk-rayon-reste={etat.nouvelles}>
                  {etat.complet
                    ? `Aucune des ${etat.taille} cartes du vivier ne vous manque — les doublons y paient encore.`
                    : `${etat.nouvelles} carte${etat.nouvelles > 1 ? 's' : ''} sur ${etat.taille} vous manque${etat.nouvelles > 1 ? 'nt' : ''} encore.`}
                </p>
                <footer>
                  {refus && (
                    <p className="rpg-souk__rayon-refus" data-souk-rayon-refus>
                      {ferme ? refus : <>Il manque {manque} <RpgCreditIcon /></>}
                    </p>
                  )}
                  {etat.ouvert && etat.mythiques > 0 && (
                    <button
                      type="button"
                      className="rpg-menu-button rpg-souk__coffret"
                      data-souk-coffret={etat.rayon.id}
                      disabled={Boolean(ferme) || credits < etat.prixCoffret}
                      title={credits < etat.prixCoffret
                        ? `Le coffret coûte ${etat.prixCoffret} crédits`
                        : `Dix paquets pour ${etat.prixCoffret} crédits — une mythique assurée`}
                      onClick={() => { onOuvrirCoffret?.(etat.rayon.id); }}
                    >
                      Coffret · {creditsLisible(etat.prixCoffret)} <RpgCreditIcon />
                      <span className="rpg-souk__rayon-remise">−{Math.round(COFFRET.remise * 100)} %</span>
                    </button>
                  )}
                </footer>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="rpg-souk__section rpg-souk__direct"
        aria-labelledby="souk-direct-titre"
        data-souk-direct
        data-souk-direct-jour={etal.jour ?? undefined}
        data-souk-direct-rafraichissements={etal.rafraichissements ?? 0}
      >
        <div className="rpg-souk__section-tete">
          <div>
            <h3 id="souk-direct-titre">Les cartes à l’unité</h3>
            <p>
              {SOUK_DIRECT_REGLES.cartesParJour} cartes chaque jour · Rare {SOUK_DIRECT_REGLES.prix.rare} <RpgCreditIcon /> · Mythique {SOUK_DIRECT_REGLES.prix.mythique} <RpgCreditIcon />
            </p>
          </div>
          <button
            type="button"
            className="rpg-menu-button rpg-souk__direct-rafraichir"
            data-souk-direct-rafraichir
            disabled={rafraichissementUtilise || offresDirect.length !== SOUK_DIRECT_REGLES.cartesParJour}
            title={rafraichissementUtilise ? 'Sélection déjà rafraîchie : revenez demain' : 'Remplacer les cinq cartes — une seule fois aujourd’hui'}
            onClick={rafraichirEtal}
          >
            {rafraichissementUtilise ? 'Rafraîchissement utilisé' : 'Rafraîchir la sélection'}
          </button>
        </div>
        <p className="rpg-souk__direct-resume">
          Choisissez exactement ce qu’il vous manque. Chaque achat ajoute <strong>un exemplaire</strong>, jusqu’au quota du deck — {SOUK_DIRECT_REGLES.prix.rare} <RpgCreditIcon /> la première copie d’une rare, {SOUK_DIRECT_REGLES.prix.rare} <RpgCreditIcon /> sa seconde, et une mythique reste unique.
        </p>
        {cartesCompletes > 0 && (
          <p className="rpg-souk__direct-complet" data-souk-direct-complet={cartesCompletes} role="status">
            {cartesCompletes === offresDirect.length
              ? 'Aucune copie à vendre aujourd’hui : les cinq cartes sont au quota. Le rafraîchir en amène cinq autres.'
              : `${cartesCompletes} carte${cartesCompletes > 1 ? 's' : ''} du jour${cartesCompletes > 1 ? ' sont' : ' est'} déjà au quota du deck — rien de plus à payer sur ${cartesCompletes > 1 ? 'lesquelles' : 'laquelle'}.`}
          </p>
        )}
        {offresDirect.length ? (
          <ul className="rpg-souk__direct-cartes" data-souk-direct-cartes={offresDirect.length}>
            {offresDirect.map((id) => (
              <CarteDeLEtal
                key={`${etal.jour}-${etal.rafraichissements}-${id}`}
                id={id}
                collection={collectionDirect}
                exemplaires={exemplairesDirect}
                acheteAujourdhui={etal.achetees?.includes(id) ?? false}
                credits={credits}
                cardArt={cardArt}
                onAcheter={acheterDansEtal}
              />
            ))}
          </ul>
        ) : (
          <p className="rpg-souk__vide" data-souk-direct-vide>Le marchand prépare les cinq cartes du jour.</p>
        )}
        {etalMessage && (
          <p className={`rpg-souk__direct-message${etalMessage.ok ? ' is-ok' : ' is-erreur'}`} role="status" data-souk-direct-message>
            {etalMessage.texte}
          </p>
        )}
        <footer className="rpg-souk__direct-pied">
          <span>{rafraichissementUtilise ? 'Nouvelle sélection et rafraîchissement disponibles demain.' : 'Un rafraîchissement gratuit reste disponible aujourd’hui.'}</span>
          <span>Clic droit ou appui long sur une carte pour l’agrandir.</span>
        </footer>
      </section>

      <section className="rpg-souk__cachet" data-souk-cachet={cachet}>
        <Sceau actif={cachetSlam} />
        <div className="rpg-souk__cachet-texte">
          <span className="rpg-mode-menu__eyebrow">LE CACHET DU CYCLE</span>
          <h3>Les trois quêtes du jour, réclamées d’affilée</h3>
          <p>
            {cachet === 'disponible'
              ? 'Votre journée est pleine : le Cachet est à vous.'
              : cachet === 'pris'
                ? 'Cachet du jour encaissé. Revenez demain pour le suivant.'
                : `${prises} / 3 réclamées — le Cachet s’ouvre quand les trois y sont passées.`}
          </p>
        </div>
        {cachet === 'disponible' ? (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-souk-cachet-reclamer
            ref={cachetBtnRef}
            onClick={reclamerCachet}
          >
            Réclamer le Cachet · +{GAINS.cachetDuCycle} <RpgCreditIcon />
          </button>
        ) : (
          <span className="rpg-souk__pris">{cachet === 'pris' ? 'Cachet réclamé' : 'Cachet scellé'}</span>
        )}
      </section>

      <section
        className={`rpg-souk__semaine is-${semaine}`}
        data-souk-semaine={semaine}
        data-souk-serie={quetes?.serie ?? 0}
        aria-labelledby="souk-semaine-titre"
      >
        <Sceau actif={semaineSlam} />
        <div className="rpg-souk__semaine-tete">
          <div className="rpg-souk__cachet-texte">
            <span className="rpg-mode-menu__eyebrow">LE CACHET DE LA SEMAINE</span>
            <h3 id="souk-semaine-titre">Sept jours d’affilée</h3>
            <p>
              {semaine === 'disponible'
                ? `Votre série tient depuis ${JOURS_DE_LA_SERIE} jours : le Cachet est ouvert.`
                : semaine === 'pris'
                  ? 'Cachet de la semaine encaissé. La série continue.'
                  : `Votre série : ${quetes?.serie ?? 0} jour${(quetes?.serie ?? 0) > 1 ? 's' : ''} — encore ${joursAvantLeCachetDeLaSemaine(quetes)} avant le Cachet.`}
            </p>
          </div>
          {semaine === 'disponible' ? (
            <button
              type="button"
              className="rpg-menu-button rpg-menu-button--primary"
              data-souk-semaine-reclamer
              ref={semaineBtnRef}
              onClick={() => {
                const gagne = onReclamerSemaine?.();
                onPlaySfx?.(gagne ? 'victoire' : 'erreur');
                if (gagne && !semaineSlam) {
                  celebrate(GAINS.cachetDeLaSemaine, semaineBtnRef.current);
                  setSemaineSlam(true);
                  window.setTimeout(() => setSemaineSlam(false), 700);
                }
              }}
            >
              Réclamer le Cachet de la semaine · +{GAINS.cachetDeLaSemaine} <RpgCreditIcon />
            </button>
          ) : (
            <span className="rpg-souk__pris">{semaine === 'pris' ? 'Cachet de la semaine réclamé' : `${quetes?.serie ?? 0} / ${JOURS_DE_LA_SERIE} jours`}</span>
          )}
        </div>
        {/* Les sept jours de la série, en petites cartes : chacune reçoit son
            cachet dès que la série l'a passé. La septième porte le Cachet —
            c'est elle que la série vise, et son montant est écrit dessus. */}
        <ol className="rpg-souk__jours" aria-label="Les sept jours de la série">
          {joursDeLaSerie.map((etape) => (
            <li
              key={etape.jour}
              className={`rpg-souk__jour${etape.atteint ? ' is-atteint' : ''}${etape.aujourdhui ? ' is-aujourdhui' : ''}${etape.jour === JOURS_DE_LA_SERIE ? ' is-cachet' : ''}`}
              data-souk-semaine-jour={etape.jour}
              data-souk-semaine-jour-etat={etape.atteint ? 'atteint' : 'attente'}
              aria-label={`Jour ${etape.jour} sur ${JOURS_DE_LA_SERIE} — ${etape.atteint ? 'cachet obtenu' : 'pas encore atteint'}`}
            >
              <span className="rpg-souk__jour-libelle" aria-hidden="true">
                Jour {etape.jour}
                {etape.aujourdhui && <em className="rpg-souk__jour-auj">auj.</em>}
              </span>
              <span className="rpg-souk__jour-medaille" aria-hidden="true">
                <span className="rpg-souk__jour-num">{etape.jour}</span>
                <span className="rpg-souk__jour-sceau" />
              </span>
              {etape.jour === JOURS_DE_LA_SERIE && (
                <span className="rpg-souk__jour-gain" aria-hidden="true">
                  +{GAINS.cachetDeLaSemaine} <RpgCreditIcon />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="rpg-souk__section" aria-labelledby="souk-journal-titre">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-journal-titre">Les dernières ouvertures</h3>
          <p data-souk-journal={journal.length}>
            {jouees > 0 ? `${jouees} paquet${jouees > 1 ? 's' : ''} depuis le début` : 'aucun paquet ouvert'}
          </p>
        </div>
        {journal.length ? (
          <ul className="rpg-souk__journal">
            {journal.map((entree) => {
              const rayon = rayonParId(entree.rayonId);
              return (
                <li key={`${entree.le}-${entree.rayonId}-${entree.cartes.join('-')}`} data-souk-journal-ligne={entree.rayonId} data-souk-journal-mythe={entree.mythique}>
                  <span className="rpg-souk__journal-rayon">{rayon?.nom ?? entree.rayonId}</span>
                  <span className="rpg-souk__journal-date">{quandLisible(entree.le)}</span>
                  <span className="rpg-souk__journal-cartes">
                    {entree.cartes.map((id) => cardById(id)?.name ?? id).join(' · ')}
                  </span>
                  <span className="rpg-souk__journal-notes">
                    {entree.coffret ? 'coffret' : 'paquet'}
                    {entree.mythique ? ' · mythique' : ''}
                    {entree.remboursement ? (
                      <> {'·'} +{entree.remboursement} <RpgCreditIcon /></>
                    ) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rpg-souk__vide" data-souk-journal-vide>
            Rien encore : le premier paquet ouvert s’inscrira ici, cartes comprises.
          </p>
        )}
      </section>

      {bursts.map((b) => {
        const dx = b.to.x - b.from.x;
        const dy = b.to.y - b.from.y;
        return (
          <span key={b.id} className="rpg-souk__burst" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => {
              const ang = (i / 7) * Math.PI * 2;
              const rayon = 9 + (i % 3) * 7;
              const sx = Math.cos(ang) * rayon;
              const sy = Math.sin(ang) * rayon - 10;
              return (
                <span
                  key={i}
                  className="rpg-souk__coin"
                  style={{
                    '--bx': `${b.from.x}px`,
                    '--by': `${b.from.y}px`,
                    '--dx': `${dx}px`,
                    '--dy': `${dy}px`,
                    '--sx': `${sx}px`,
                    '--sy': `${sy}px`,
                    '--n': i,
                  }}
                />
              );
            })}
            <span className="rpg-souk__gain" style={{ '--bx': `${b.from.x}px`, '--by': `${b.from.y}px` }}>
              +{b.amount} <RpgCreditIcon />
            </span>
          </span>
        );
      })}
    </main>
  );
}
