/**
 * La bourse du Souk : les crédits ◈, les quêtes du jour **et le profil** d'un joueur.
 *
 * Frère de `useDecksSablier.js`, avec les mêmes règles de la maison :
 *
 *   - **le stockage local est la copie de travail** — le jeu se joue hors ligne,
 *     `letsplay_sablier_bourse_v1`, `letsplay_sablier_quetes_v1` et
 *     `letsplay_sablier_profil_v1` portent l'état, la table du compte le suit ;
 *   - **rien ne redescend** : la fusion est monotone (`fusionnerPortefeuilles`,
 *     `fusionnerQuetes`), un solde ne disparaît pas parce qu'un appareil est en
 *     retard ;
 *   - **défensif hors provider** : sans compte connecté, tout vit en local et
 *     `statutSync` reste `'local'`.
 *
 * Le hook ne connaît **que des événements normalisés** (`rpgEvenementsDuel.js`) :
 * les gestes du duel lui arrivent par `noterEvenementDuel`, ce qui rend la règle
 * testable sans monter un composant React.
 *
 * ## L'XP et le paquet du palier
 *
 * Chaque geste verse aussi de l'XP (`rpgProfil.js`), et **chaque niveau gagné
 * ouvre un booster au hasard** — un vrai paquet du comptoir, offert : aucun
 * crédit n'est débité, la pitié avance, les doublons remboursent. Le hook ne
 * recalcule jamais la dette : `boostersDus(profil)` la déduit du niveau et des
 * paquets déjà offerts, donc un palier franchi pendant qu'une cérémonie est à
 * l'écran (ou avant que le comptoir puisse tirer) **attend** au lieu de se
 * perdre, et `reglerPaliers` le règle au prochain moment libre.
 *
 * ## Le jour
 *
 * `ouvrirJournee` est appelé au montage, et de nouveau **chaque fois que
 * l'onglet redevient visible** : une session laissée ouverte toute la nuit doit
 * voir les quêtes du lendemain. La règle du dossier 13 (D6) tient — le jour ne
 * recule jamais, même si l'horloge de l'appareil recule.
 *
 * ## L'écriture au compte
 *
 * Les deux hooks (`useDecksSablier` et celui-ci) poussent **le même état
 * entier** : chacun relit le stockage local de l'autre au moment d'écrire, et
 * `fusionnerEtatsSablier` est le seul point de fusion. Aucun ne peut donc
 * écraser la moitié de l'autre.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import {
  chargerPortefeuille,
  crediterCredits,
  fusionnerPortefeuilles,
  normaliserPortefeuille,
  reclamerRecompenseTutoriel,
  sauverPortefeuille,
} from './rpgCredits.js';
import {
  chargerEtatQuetes,
  chargerGraine,
  fusionnerQuetes,
  normaliserEtatQuetes,
  ouvrirJournee,
  reclamerCachetDeLaSemaine,
  reclamerCachetDuCycle,
  reclamerQuete,
  sauverEtatQuetes,
} from './rpgQuetes.js';
import { appliquerEvenementDuel, compterReclamations } from './rpgEvenementsDuel.js';
import { ouvrirBooster, ouvrirBoosterOffert, ouvrirCoffret, rayonsOuverts } from './rpgBoosters.js';
import {
  XP,
  boostersDus,
  chargerProfil,
  choisirAvatar,
  choisirCadre,
  choisirEmbleme,
  choisirPlateau,
  choisirTitre,
  fusionnerProfils,
  gagnerXp,
  marquerBoosterOffert,
  niveauDeXp,
  normaliserProfil,
  progressionDuProfil,
  renommerProfil,
  sauverProfil,
} from './rpgProfil.js';
// Les gains de la piste : ce qui est **porté** se choisit ici, ce qui est
// **gagné** se calcule là-bas, depuis le niveau — donc depuis l'XP.
import { cadrePortable, titrePortable } from './rpgProfilGains.js';
import { tirerParmi } from './rpgHasard.js';
import { chargerAcquis, chargerCollectionDistante, collectionJoueur } from './rpgCollection.js';
import { chargerDecksMaison, chargerSupprimesMaison, fusionnerEtatsSablier } from './rpgDeckBuilder.js';
import { chargerProgressionHistoire, sauverProgressionHistoire } from './rpgStory.js';
import { chargerEtatSablier, sauverEtatSablier } from './rpgSablierRemote.js';

/** L'état local complet, tel qu'il vit sur l'appareil — les deux moitiés. */
function etatLocalComplet() {
  return {
    decks: chargerDecksMaison(),
    supprimes: chargerSupprimesMaison(),
    collection: chargerCollectionDistante(),
    acquis: chargerAcquis(),
    bourse: chargerPortefeuille(),
    quetes: chargerEtatQuetes(),
    histoire: chargerProgressionHistoire(),
    profil: chargerProfil(),
  };
}

// Une réclamation paie avec la même règle que tout le reste : `crediterCredits`,
// jamais un ajustement écrit sur place. L'arithmétique des ◈ vit dans un seul
// module, et c'est celui qui a ses tests.

/**
 * L'état d'entrée : ce que l'appareil porte, la journée du moment ouverte.
 * `progression` sert aux quêtes qui exigent une garde — « ouvrir le comptoir »
 * ne se tire pas tant que le Souk est fermé.
 */
function etatInitial(progression, compteId = null) {
  const bourse = chargerPortefeuille();
  const journee = ouvrirJournee({ etat: chargerEtatQuetes(), graine: chargerGraine(compteId), progression });
  sauverEtatQuetes(journee.etat);
  return { bourse, quetes: journee.etat, profil: chargerProfil() };
}

/** Statuts de synchronisation : `'local'`, `'attente'`, `'synchronise'`, `'horsligne'`. */
export function useSablierBourse({ progression = null, rng = Math.random, onCartesRangees = null } = {}) {
  const authContext = useContext(AuthContext);
  // Un profil de démonstration n'est pas un compte : rien à synchroniser, et
  // il reste sur les clés invité de l'appareil.
  const compteId = authContext && !authContext.isDemo ? (authContext.user?.id ?? null) : null;
  const [etat, setEtat] = useState(() => etatInitial(progression, compteId));
  const [statutSync, setStatutSync] = useState('local');
  // L'état courant, lisible depuis les rappels sans les recréer à chaque rendu.
  const etatRef = useRef(etat);
  etatRef.current = etat;
  // La progression non plus : un achat ouvert en pleine campagne doit lire les
  // marches du moment, pas celles du premier rendu.
  const progressionRef = useRef(progression);
  progressionRef.current = progression;
  // La cérémonie d'ouverture en cours — `null` hors d'un achat. Elle vit dans
  // l'état React mais **pas** dans le stockage : elle n'a rien à survivre à un
  // rechargement, et les cartes, elles, sont déjà encaissées.
  const [ouverture, setOuverture] = useState(null);
  // La cérémonie en cours, lisible sans attendre le rendu : une montée de niveau
  // qui tombe pendant qu'un paquet acheté se retourne **attend** sa fermeture
  // plutôt que d'empiler deux cérémonies l'une sur l'autre.
  const ouvertureRef = useRef(null);
  const rngRef = useRef(rng);
  rngRef.current = rng;
  // Le palier en cours d'annonce — `null` hors d'une montée de niveau. La dette
  // de paquets, elle, vit dans le profil : elle ne dépend jamais de cet état.
  const [monteeNiveau, setMonteeNiveau] = useState(null);
  const monteeRef = useRef(null);
  // La dernière dette qu'on a essayé de régler **sans** pouvoir tirer un paquet :
  // annoncée une fois, pas répétée à chaque geste tant que rien n'a changé.
  const essaiPaliersRef = useRef(null);
  // Le jeton de la cérémonie : un compteur, pas `Date.now()` — deux paquets dus
  // se règlent dans le même tick (fermer l'un ouvre l'autre), et la page passe
  // `key={montee.token}` pour que chaque cérémonie rejoue depuis le sachet.
  const tokenPalierRef = useRef(0);

  // Changement de joueur (session restaurée, connexion, déconnexion, autre
  // compte sur la même machine) : le solde et les quêtes en mémoire
  // appartenaient au précédent. On relit la copie du joueur courant — la clé
  // de stockage porte son compte (voir `lib/progressionScope.js`) — avant
  // toute écriture, pour ne jamais verser l'état d'un joueur à un autre.
  useEffect(() => {
    const journee = ouvrirJournee({
      etat: chargerEtatQuetes(),
      graine: chargerGraine(compteId),
      progression: progressionRef.current,
    });
    const relu = { bourse: chargerPortefeuille(), quetes: journee.etat, profil: chargerProfil() };
    sauverEtatQuetes(journee.etat);
    etatRef.current = relu;
    setEtat(relu);
  }, [compteId]);

  /**
   * Écrit le trio (bourse, quêtes, profil) : stockage d'abord, écran ensuite,
   * compte en dernier. Le profil absent reprend celui déjà en mémoire — un
   * geste qui ne touche qu'au solde n'a pas à le rapporter.
   *
   * `etatRef` suit **l'écriture**, pas le rendu : la victoire note
   * `duel-gagne` puis `etage-deblaye` dans le même tick, et sans cela le second
   * relirait l'état d'avant le premier — le gain du duel serait écrasé par son
   * propre voisin.
   */
  const appliquer = useCallback((bourse, quetes, profil) => {
    const suivant = { bourse, quetes, profil: profil === undefined ? etatRef.current.profil : profil };
    etatRef.current = suivant;
    sauverPortefeuille(suivant.bourse);
    sauverEtatQuetes(suivant.quetes);
    sauverProfil(suivant.profil);
    setEtat(suivant);
  }, []);

  /** Pousse l'état entier au compte — les deux moitiés, jamais une seule. */
  const pousser = useCallback(() => {
    if (!compteId) return null;
    const fusion = fusionnerEtatsSablier({ local: etatLocalComplet() });
    sauverEtatSablier(compteId, fusion.etat);
    return fusion.etat;
  }, [compteId]);

  // Le jour se referme tout seul : au retour sur l'onglet, la journée courante
  // est réouverte (nouveau tirage, compteurs à zéro) — la série, elle, continue.
  // Les quêtes non terminées échues après 24 h sont retirées au passage, et une
  // minuterie le vérifie pendant que l'onglet reste ouvert.
  useEffect(() => {
    const verifier = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const journee = ouvrirJournee({ etat: etatRef.current.quetes, graine: chargerGraine(compteId), progression });
      if (!journee.nouveau && !journee.retirees?.length) return;
      appliquer(etatRef.current.bourse, journee.etat);
      pousser();
    };
    document?.addEventListener?.('visibilitychange', verifier);
    const minuterie = typeof setInterval === 'function' ? setInterval(verifier, 60000) : null;
    return () => {
      document?.removeEventListener?.('visibilitychange', verifier);
      if (minuterie) clearInterval(minuterie);
    };
  }, [progression, appliquer, pousser, compteId]);

  // À la connexion (et à chaque retour de connexion), la fusion compte ↔ appareil.
  useEffect(() => {
    if (!compteId) {
      setStatutSync('local');
      return undefined;
    }
    let vivant = true;
    setStatutSync('attente');
    (async () => {
      const { state, source } = await chargerEtatSablier(compteId);
      if (!vivant) return;
      if (source === 'unavailable') {
        setStatutSync('horsligne');
        return;
      }
      if (!state) {
        // Compte sans copie serveur (première connexion sur cet appareil) : sa
        // copie locale devient la référence du compte, une seule fois. Le
        // statut ne ment pas : si l'écriture échoue (table absente, droits
        // manquants), l'écran annonce « hors ligne » plutôt que « synchronisé ».
        const local = etatLocalComplet();
        appliquer(local.bourse, local.quetes, local.profil);
        const enregistre = await sauverEtatSablier(compteId, local);
        if (!vivant) return;
        setStatutSync(enregistre ? 'synchronise' : 'horsligne');
        return;
      }
      // Le compte et l'appareil, moitié par moitié : l'économie n'écrase jamais
      // les decks, ni l'inverse — `fusionnerEtatsSablier` les range ensemble.
      // Les deux côtés sont relus sur le stockage du joueur courant, jamais sur
      // une valeur en mémoire héritée d'un autre compte.
      const fusion = fusionnerEtatsSablier({ local: etatLocalComplet(), distant: state });
      const bourse = fusionnerPortefeuilles(chargerPortefeuille(), fusion.etat.bourse).portefeuille;
      const quetes = fusionnerQuetes(chargerEtatQuetes(), fusion.etat.quetes).etat;
      // Le profil se fusionne chez lui : l'XP au maximum, donc un palier gagné
      // hors ligne ne redescend jamais au retour du compte.
      const profil = fusionnerProfils(chargerProfil(), fusion.etat.profil).profil;
      if (!vivant) return;
      appliquer(bourse, quetes, profil);
      sauverProgressionHistoire(fusion.etat.histoire);
      setStatutSync('synchronise');
      sauverEtatSablier(compteId, { ...fusion.etat, bourse, quetes, profil });
    })();
    return () => { vivant = false; };
  }, [compteId, appliquer]);

  /**
   * Règle la dette des paliers : **un booster offert par niveau gagné**, tiré
   * au hasard parmi les paquets du comptoir.
   *
   * Trois garde-fous, tous décidés par le profil et non par l'état React :
   *
   *   - la dette se **calcule** (`boostersDus`) : un palier franchi pendant
   *     qu'une cérémonie est à l'écran, ou avant que le comptoir puisse tirer,
   *     attend son tour au lieu de disparaître ;
   *   - jamais deux cérémonies en même temps : si un paquet acheté se retourne
   *     encore, ou si un palier est déjà annoncé, on rend `null` et la dette
   *     reste ;
   *   - plusieurs niveaux d'un coup ouvrent plusieurs paquets, et une seule
   *     cérémonie les montre — comme le coffret.
   *
   * Le paquet offert est un vrai paquet (`ouvrirBoosterOffert`) : aucun crédit
   * débité, mais la pitié avance et les doublons remboursent.
   */
  const reglerPaliers = useCallback(() => {
    if (ouvertureRef.current || monteeRef.current) return null;
    const avant = etatRef.current;
    const dus = boostersDus(avant.profil);
    if (!dus) return null;

    const collection = collectionJoueur({
      acquis: chargerAcquis(),
      distante: chargerCollectionDistante(),
      souk: avant.bourse.cartes,
    });
    const rayons = rayonsOuverts(progressionRef.current, collection);
    let portefeuille = avant.bourse;
    let profil = avant.profil;
    const paquets = [];
    const rayonsTires = [];
    for (let index = 0; index < dus && rayons.length; index += 1) {
      // « Au hasard » veut dire au hasard : le rayon est tiré à chaque paquet,
      // pas choisi une fois pour toute la montée.
      const rayon = tirerParmi(rayons, rngRef.current);
      const offert = ouvrirBoosterOffert({
        portefeuille,
        rayonId: rayon?.rayon?.id ?? null,
        progression: progressionRef.current,
        collection,
        rng: rngRef.current,
      });
      if (!offert.ok) break;
      portefeuille = offert.portefeuille;
      profil = marquerBoosterOffert(profil);
      paquets.push(offert.tirage);
      rayonsTires.push(rayon?.rayon?.id ?? null);
    }
    if (paquets.length) {
      essaiPaliersRef.current = null;
      // Les cartes sont écrites sur l'appareil **avant** la cérémonie, comme
      // pour un achat : fermer l'onglet en plein retournement ne coûte rien.
      appliquer(portefeuille, avant.quetes, profil);
      pousser();
      onCartesRangees?.();
    } else if (essaiPaliersRef.current === dus) {
      // Déjà annoncé pour cette même dette : on ne répète pas. La dette attend
      // son heure, elle ne se perd pas.
      return null;
    } else {
      essaiPaliersRef.current = dus;
    }
    const cartes = paquets.flatMap((paquet) => paquet.details ?? []);
    const barre = progressionDuProfil(profil);
    const montee = {
      token: (tokenPalierRef.current += 1),
      niveaux: paquets.length || dus,
      vers: barre.niveau,
      xp: barre.xp,
      dus: boostersDus(profil),
      // Aucune ouverture possible (comptoir fermé, vivier vide) : la cérémonie
      // est absente et l'écran annonce le palier seul — la dette attend.
      ouverture: paquets.length ? {
        offert: true,
        niveaux: paquets.length,
        vers: barre.niveau,
        rang: barre.niveau,
        rayonId: rayonsTires[0],
        coffret: false,
        paquets: paquets.length,
        prix: 0,
        cartes,
        remboursement: paquets.reduce((somme, paquet) => somme + (paquet.remboursement ?? 0), 0),
        nouvelles: cartes.filter((carte) => !carte.doublon).length,
        mythique: paquets.some((paquet) => paquet.mythique),
      } : null,
    };
    monteeRef.current = montee;
    setMonteeNiveau(montee);
    return montee;
  }, [appliquer, pousser, onCartesRangees]);

  // La progression bouge (une victoire ouvre un étage, une tour tombe) : la
  // dette d'un palier franchi plus tôt se règle dès que le comptoir le peut.
  useEffect(() => { reglerPaliers(); }, [progression, reglerPaliers]);

  /**
   * Applique un événement du duel : le solde s'il paie, les quêtes du jour
   * toujours, **et la barre d'XP** (`rpgProfil.js`). Rend `{ gain, butin, xp,
   * niveaux, evenement, reconnu }` — `gain` est ce que le duel peut annoncer
   * (butin compris), `butin` isole le butin de la tour terminée, `xp` ce que la
   * barre vient d'avaler, `niveaux` combien de paliers ont sonné (chacun ouvre
   * un booster, réglé ici même), et `reconnu` dit si le geste fait partie du
   * contrat.
   */
  const noterEvenementDuel = useCallback((evenement) => {
    const avant = etatRef.current;
    const suite = appliquerEvenementDuel(avant, evenement);
    if (!suite.reconnu) return { gain: 0, butin: 0, xp: 0, niveaux: 0, evenement: null, reconnu: false };
    // Les trois modules rendent leur entrée **telle quelle** quand rien ne
    // bouge : la comparaison de références suffit donc, et un geste sans effet
    // (poser un terrain quand aucune quête ne l'écoute) ne fait pas re-rendre
    // l'écran.
    if (suite.bourse !== avant.bourse || suite.quetes !== avant.quetes || suite.profil !== avant.profil) {
      appliquer(
        normaliserPortefeuille(suite.bourse),
        normaliserEtatQuetes(suite.quetes),
        normaliserProfil(suite.profil),
      );
      pousser();
    }
    // Un palier a sonné : le paquet offert s'ouvre tout de suite, sauf si une
    // cérémonie occupe déjà l'écran — la dette attend sa fermeture.
    if (suite.niveaux > 0 || boostersDus(suite.profil) > 0) reglerPaliers();
    return {
      gain: suite.gain,
      butin: suite.butin ?? 0,
      xp: suite.xp ?? 0,
      niveaux: suite.niveaux ?? 0,
      evenement: suite.evenement,
      reconnu: true,
    };
  }, [appliquer, pousser, reglerPaliers]);

  /**
   * Verse l'XP d'un gain qui ne passe pas par le contrat d'événements : une
   * quête réclamée, un Cachet, une leçon. La barre monte, les paliers sonnent,
   * et la dette de paquets se règle dans la foulée — exactement comme au duel.
   */
  const verserXp = useCallback((bourse, quetes, profil, montant, { motif = 'autre', stats = null } = {}) => {
    const palier = gagnerXp(profil, montant, { motif, stats });
    appliquer(bourse, quetes, normaliserProfil(palier.profil));
    pousser();
    if (palier.niveauxGagnes > 0 || boostersDus(palier.profil) > 0) reglerPaliers();
    return palier;
  }, [appliquer, pousser, reglerPaliers]);

  /**
   * Réclame une quête terminée : les ◈ entrent dans la bourse, la quête est
   * marquée prise (on ne la paie pas deux fois), et l'XP monte la barre. Rend le
   * montant encaissé, ou `0` si la réclamation n'était pas due.
   */
  const reclamerUneQuete = useCallback((queteId) => {
    const avant = etatRef.current;
    const resultat = reclamerQuete(avant.quetes, queteId);
    if (!resultat.ok) return 0;
    verserXp(
      crediterCredits(avant.bourse, resultat.credits).portefeuille,
      resultat.etat,
      avant.profil,
      XP.queteReclamee,
      { motif: 'quete', stats: { quetesReclamees: 1 } },
    );
    return resultat.credits;
  }, [verserXp]);

  /**
   * Achète et ouvre un paquet (ou un coffret de dix) : les crédits sont
   * débités, les cinq cartes rejoignent le portefeuille, les doublons sont
   * remboursés, la pitié avance — et « Ouvrir le comptoir » avance d'un cran.
   *
   * La **collection** que voit le tirage est celle de l'appareil au complet :
   * dotation, acquis gelés, apports du compte et cartes déjà achetées au Souk.
   * C'est ce qui évite de re-vendre une carte que le joueur possède déjà.
   *
   * Rend `{ ok, raison, prix, tirage }`. Un refus (rayon fermé, solde
   * insuffisant) ne touche à rien — et il est dit en clair à l'écran.
   */
  const acheter = useCallback((rayonId, { coffret = false } = {}) => {
    const avant = etatRef.current;
    const collection = collectionJoueur({
      acquis: chargerAcquis(),
      distante: chargerCollectionDistante(),
      souk: avant.bourse.cartes,
    });
    const ouvreur = coffret ? ouvrirCoffret : ouvrirBooster;
    const achat = ouvreur({
      portefeuille: avant.bourse,
      rayonId,
      progression: progressionRef.current,
      collection,
      rng: rngRef.current,
    });
    if (!achat.ok) return { ok: false, raison: achat.raison, prix: achat.prix, tirage: null };
    // Le reste de la boucle : l'ouverture est un geste du contrat d'événements,
    // donc les quêtes du jour la voient comme n'importe quel autre geste.
    // L'ouverture est un geste du contrat : elle fait avancer les quêtes **et**
    // la barre d'XP. Le profil vient de l'état courant — l'événement ne le
    // recrée jamais, il le monte.
    const suite = appliquerEvenementDuel(
      { bourse: achat.portefeuille, quetes: avant.quetes, profil: avant.profil },
      { type: 'booster-ouvert', rayonId },
    );
    appliquer(suite.bourse, suite.quetes, suite.profil);
    // Le paquet et le coffret ne rendent pas la même forme : le paquet rend un
    // tirage, le coffret une liste de paquets. La cérémonie, elle, reçoit
    // toujours la même : les cartes, une par une, et ce qu'elles ont rendu.
    const paquets = coffret ? achat.paquets : [achat.tirage];
    const cartes = paquets.flatMap((paquet) => paquet.details ?? []);
    // Les cartes sont écrites sur l'appareil **avant** la cérémonie : fermer
    // l'onglet au milieu d'un retournement ne doit rien coûter au joueur.
    ouvertureRef.current = {
      rayonId,
      coffret,
      paquets: paquets.length,
      prix: achat.prix,
      cartes,
      remboursement: paquets.reduce((somme, paquet) => somme + (paquet.remboursement ?? 0), 0),
      nouvelles: cartes.filter((carte) => !carte.doublon).length,
      mythique: paquets.some((paquet) => paquet.mythique),
    };
    setOuverture(ouvertureRef.current);
    pousser();
    onCartesRangees?.();
    return { ok: true, raison: null, prix: achat.prix, tirage: achat.tirage };
  }, [appliquer, pousser, onCartesRangees]);

  /** Le paquet : cinq cartes, le prix du rayon. */
  const acheterBooster = useCallback((rayonId) => acheter(rayonId, { coffret: false }), [acheter]);

  /** Le coffret : dix paquets du comptoir, une mythique assurée. */
  const acheterCoffret = useCallback((rayonId) => acheter(rayonId, { coffret: true }), [acheter]);

  /**
   * Referme la cérémonie d'ouverture. Le portefeuille est déjà écrit et déjà
   * poussé au compte : ici, on rend la main — et l'on règle aussitôt les paliers
   * qui attendaient leur tour derrière cette cérémonie (un paquet ouvert rapporte
   * de l'XP, il peut donc faire monter un niveau).
   */
  const fermerOuverture = useCallback(() => {
    ouvertureRef.current = null;
    setOuverture(null);
    reglerPaliers();
  }, [reglerPaliers]);

  /** Referme l'annonce d'un palier, puis règle ce qui reste dû. */
  const fermerMonteeNiveau = useCallback(() => {
    monteeRef.current = null;
    setMonteeNiveau(null);
    reglerPaliers();
  }, [reglerPaliers]);

  /**
   * Le Cachet de la semaine : sept jours d'affilée. La série est relue **avant**
   * la garde de jour, comme au montage : c'est elle qui dit si le Cachet est dû,
   * et une série qui se termine aujourd'hui ne doit pas être perdue parce que
   * la journée a été rouverte entre-temps.
   */
  const reclamerLeCachetDeLaSemaine = useCallback(() => {
    const avant = etatRef.current;
    const serie = ouvrirJournee({
      etat: avant.quetes, graine: chargerGraine(compteId), progression: progressionRef.current,
    }).etat.serie;
    const resultat = reclamerCachetDeLaSemaine({ etat: avant.quetes, serie });
    if (!resultat.ok) return 0;
    verserXp(
      crediterCredits(avant.bourse, resultat.credits).portefeuille,
      resultat.etat,
      avant.profil,
      XP.cachetDeLaSemaine,
      { motif: 'semaine', stats: { cachets: 1 } },
    );
    return resultat.credits;
  }, [verserXp, compteId]);

  /** La récompense d'un tutoriel : versée une seule fois, puis retenue dans
   *  `bourse.tutoriels` (la fusion entre appareils en fait l'union). Rend le
   *  gain réellement encaissé, `0` si la leçon était déjà payée. */
  const reclamerTutoriel = useCallback((tutorielId, montant) => {
    const avant = etatRef.current;
    const resultat = reclamerRecompenseTutoriel(avant.bourse, tutorielId, montant);
    if (!resultat.ok) return 0;
    verserXp(resultat.portefeuille, avant.quetes, avant.profil, XP.lecon, { motif: 'lecon', stats: { lecons: 1 } });
    return resultat.gain;
  }, [verserXp]);

  /** Le Cachet du cycle : +80 ◈ une fois les trois quêtes du jour réclamées. */
  const reclamerLeCachet = useCallback(() => {
    const avant = etatRef.current;
    const resultat = reclamerCachetDuCycle(avant.quetes);
    if (!resultat.ok) return 0;
    verserXp(
      crediterCredits(avant.bourse, resultat.credits).portefeuille,
      resultat.etat,
      avant.profil,
      XP.cachetDuCycle,
      { motif: 'cachet', stats: { cachets: 1 } },
    );
    return resultat.credits;
  }, [verserXp]);

  /** Renomme la carte de profil. Rend `true` si le nom a changé. */
  const renommerLeProfil = useCallback((pseudo) => {
    const avant = etatRef.current;
    const suivant = renommerProfil(avant.profil, pseudo);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  /** Change l'emblème de la carte. Rend `true` si l'emblème a changé. */
  const choisirUnEmbleme = useCallback((emblemeId) => {
    const avant = etatRef.current;
    const suivant = choisirEmbleme(avant.profil, emblemeId);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  /**
   * Choisit le visage de la carte de profil — un personnage du récit
   * (`rpgAvatars.js`), ou `null` pour revenir au glyphe de l'emblème. Rend
   * `true` si le visage a changé.
   */
  const choisirUnAvatar = useCallback((avatarId) => {
    const avant = etatRef.current;
    const suivant = choisirAvatar(avant.profil, avatarId);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  /**
   * Choisit le terrain sur lequel le joueur reçoit : sa moitié de table, en
   * duel libre comme en Histoire. `null` rend la main au deck. Rend `true` si
   * la table a changé — la partie en cours garde son terrain, c'est la suivante
   * qui le prend.
   */
  const choisirUnPlateau = useCallback((plateauId) => {
    const avant = etatRef.current;
    const suivant = choisirPlateau(avant.profil, plateauId);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  /**
   * Porte un **cadre** de médaillon gagné sur la piste. `null` revient au cadre
   * du départ. Un cadre que le niveau ne donne pas encore est refusé — une
   * sauvegarde retouchée ne se pare pas de l'Éclipse au niveau 3. Rend `true` si
   * le cadre a changé.
   */
  const choisirUnCadre = useCallback((cadreId) => {
    const avant = etatRef.current;
    if (!cadrePortable(avant.profil, cadreId)) return false;
    const suivant = choisirCadre(avant.profil, cadreId);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  /**
   * Porte un **titre** gagné sur la piste, écrit sous le pseudo. `null` le
   * retire. Même règle que le cadre : ce qui n'est pas gagné ne se porte pas.
   * Rend `true` si le titre a changé.
   */
  const choisirUnTitre = useCallback((titreId) => {
    const avant = etatRef.current;
    if (!titrePortable(avant.profil, titreId)) return false;
    const suivant = choisirTitre(avant.profil, titreId);
    if (suivant === avant.profil) return false;
    appliquer(avant.bourse, avant.quetes, suivant);
    pousser();
    return true;
  }, [appliquer, pousser]);

  const profil = etat.profil;
  return {
    bourse: etat.bourse,
    quetes: etat.quetes,
    profil,
    barreXp: progressionDuProfil(profil),
    boostersEnAttente: boostersDus(profil),
    niveau: niveauDeXp(profil.xp),
    credits: etat.bourse.credits,
    aReclamer: compterReclamations(etat.quetes),
    statutSync,
    noterEvenementDuel,
    reclamerUneQuete,
    reclamerTutoriel,
    reclamerLeCachet,
    reclamerLeCachetDeLaSemaine,
    acheterBooster,
    acheterCoffret,
    fermerOuverture,
    ouverture,
    monteeNiveau,
    fermerMonteeNiveau,
    renommerLeProfil,
    choisirUnEmbleme,
    choisirUnAvatar,
    choisirUnPlateau,
    choisirUnCadre,
    choisirUnTitre,
    pousser,
  };
}
