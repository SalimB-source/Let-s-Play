import { estDefenseur } from './rpgDefenseur.js';
/** Combat individuel du duel classique et PvP, indépendant des voies du MOBA. */
import { cardColors, duelCardById } from './rpgCards.js';
import { RPG_MANA_ESSAI_CHAMP_MAX, RPG_MANA_ESSAI_MAIN_MAX, RPG_MODE_MANA_ESSAI } from './rpgManaEssai.js';
import { rpgAppliquerBannieresAttaque, rpgAvecCompteurEntitesIsole, rpgEstProtegee, rpgPeutAttaquer, rpgPeutPayer, rpgReglerHasard, rpgResoudreDestructionCiblee, rpgResoudreEchangeIndividuelClassique, rpgVainqueur } from './rpgDuel.js';

const camps = ['joueur', 'sorcier'];
const autre = (cote) => cote === 'joueur' ? 'sorcier' : 'joueur';
const creature = (entite) => Boolean(entite && duelCardById(entite.carteId) && duelCardById(entite.carteId).kind !== 'site');
const soloClassique = (duel, cote) => Boolean(duel && !duel.moba && camps.includes(cote));

function accessible(attaquant, cible, ciblee) {
  if (!creature(cible) || rpgEstProtegee(cible, cardColors(duelCardById(attaquant.carteId)))) return false;
  return ciblee || (!cible.infiltration && (attaquant.envol || !cible.envol));
}

/** Mêmes priorités que le MOBA, sans restriction de voie. */
export function rpgCiblesIndividuellesClassique(duel, cote, attaquantId) {
  if (!soloClassique(duel, cote)) return { cibles: [], directe: false };
  const attaquant = duel[cote]?.creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant)) return { cibles: [], directe: false };
  const ciblee = Boolean(attaquant.coupRapide);
  const possibles = (duel[autre(cote)]?.creatures ?? []).filter((e) => accessible(attaquant, e, ciblee));
  const prioritaires = attaquant.infiltration ? [] : possibles.filter(estDefenseur);
  if (prioritaires.length) return { cibles: prioritaires.map((e) => e.id), directe: false };
  return {
    cibles: possibles.map((e) => e.id),
    directe: true,
  };
}

/** La cible annoncée reste fixée : l'arrivée d'un Défenseur ne la redirige pas. */
export function rpgCibleIndividuelleClassiqueEncoreLegale(duel, cote, attaquantId, cibleId, cibleeAnnoncee) {
  if (!soloClassique(duel, cote) || rpgVainqueur(duel)) return false;
  const attaquant = duel[cote]?.creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant) || (cibleeAnnoncee && !attaquant.coupRapide)) return false;
  if (cibleId === null) return true;
  return accessible(attaquant, duel[autre(cote)]?.creatures.find((e) => e.id === cibleId), Boolean(cibleeAnnoncee));
}

/** Déclare une attaque et ouvre la réponse adverse sans choisir de bloqueur. */
export function rpgDeclarerAttaqueIndividuelleClassique(duel, cote, attaquantId, cibleId = null) {
  if (!soloClassique(duel, cote)) return { ok: false, raison: 'mode' };
  if (rpgVainqueur(duel)) return { ok: false, raison: 'partie-terminee' };
  if (duel.tour !== cote) return { ok: false, raison: 'pas-votre-tour' };
  if (duel.phase !== 'principale' || duel.fenetreReponse || duel.combatDeclare || duel.finDeTour
    || duel.annonce || duel.renfortChoixEnAttente || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente || duel.boualemEnAttente
    || duel[cote].manaChoixEnAttente) return { ok: false, raison: 'timing' };
  const attaquant = duel[cote].creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant) || !rpgPeutAttaquer(attaquant)) return { ok: false, raison: 'pas-pret' };
  const choix = rpgCiblesIndividuellesClassique(duel, cote, attaquantId);
  if (cibleId === null ? !choix.directe : !choix.cibles.includes(cibleId)) return { ok: false, raison: 'cible' };
  // Une reprise après Embuscade est la même attaque : sa bannière a déjà
  // déclenché à l'annonce initiale et ne doit pas grandir une seconde fois.
  const bannieresAppliquees = attaquant.repriseAttaqueIndividuelle
    ? true : rpgAppliquerBannieresAttaque(duel, cote, [attaquantId]);
  delete attaquant.repriseAttaqueIndividuelle;
  const ciblee = Boolean(attaquant.coupRapide);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  attaquant.attaquee = true;
  duel.log.push(`${attaquant.name} annonce une attaque ${cible ? `contre ${cible.name}` : 'directe contre le sorcier'}.`);
  duel.phase = 'blocage';
  duel.fenetreReponse = true;
  duel.combatDeclare = {
    cote, attaquants: [attaquantId], ciblesAttaque: ciblee && cible ? { [attaquantId]: cibleId } : {},
    bannieresAppliquees, cibleIndividuelle: { cibleId, ciblee },
  };
  return { ok: true };
}

/** Résout la cible d'origine après la réponse ; une cible disparue n'est pas
 * remplacée par une frappe directe. Chaque créature conserve son engagement. */
export function rpgResoudreAttaqueIndividuelleClassique(duel, cote) {
  const combat = duel?.combatDeclare;
  if (!soloClassique(duel, cote) || !combat?.cibleIndividuelle || combat.cote !== cote
    || duel.tour !== cote || duel.phase !== 'blocage' || !duel.fenetreReponse
    || duel.annonce || duel.renfortChoixEnAttente || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente || duel.boualemEnAttente) {
    return { ok: false, raison: 'timing' };
  }
  const attaquantId = combat.attaquants[0];
  const { cibleId, ciblee, interrompueParEmbuscade } = combat.cibleIndividuelle;
  if (interrompueParEmbuscade) {
    const attaquant = duel[cote].creatures.find((e) => e.id === attaquantId);
    // Si l'arrivée a détruit l'attaquant il ne peut évidemment pas repartir.
    if (attaquant) {
      attaquant.attaquee = false;
      attaquant.repriseAttaqueIndividuelle = true;
    }
    duel.combatDeclare = null;
    duel.fenetreReponse = false;
    duel.phase = 'principale';
    duel.log.push('L’Invocation spéciale interrompt l’attaque directe : l’attaquant doit choisir à nouveau sa cible.');
    return { ok: true, annule: true, choisirNouvelleCible: Boolean(attaquant && rpgPeutAttaquer(attaquant)), attaquantId,
      resume: { frappeSorcier: 0, furies: [], paires: [], coupsRapides: [], critiques: [], blessures: [] } };
  }
  const valide = rpgCibleIndividuelleClassiqueEncoreLegale(duel, cote, attaquantId, cibleId, ciblee);
  const result = valide
    ? rpgResoudreEchangeIndividuelClassique(duel, cote, attaquantId, cibleId, ciblee)
    : { ok: true, annule: true, resume: { frappeSorcier: 0, furies: [], paires: [], coupsRapides: [], critiques: [], blessures: [] } };
  if (!result.ok) return result;
  if (!valide) duel.log.push('La cible ou l’attaquant n’est plus disponible : l’attaque est annulée.');
  duel.combatDeclare = null;
  duel.fenetreReponse = false;
  duel.phase = 'principale';
  return result;
}

/** Rejouer le Scalde pour sa pioche peut valoir son absence pendant un tour.
 * On ne spécule ni sur la main adverse, ni sur le contenu du paquet. */
function retourScaldeUtile(duel, cote, attaquant) {
  if (attaquant.carteId !== 'scalde-des-runes') return false;
  const carte = duelCardById(attaquant.carteId);
  const camp = duel[cote];
  // Une pioche normale précède l'arrivée ; il faut donc au moins deux cartes.
  if (camp.deck.length < 2 || camp.main.length > 1 || !rpgPeutPayer(camp, carte)) return false;
  // Conserver les renforts, l'équipement et les protections déjà investis.
  if (attaquant.arme || attaquant.armuresMagiques?.length || attaquant.protection
    || attaquant.bouclierLumiere || attaquant.bouclier > 0
    || attaquant.atk > carte.atk || attaquant.pvMax > carte.def) return false;
  // Garder le corps en défense quand une créature adverse peut attaquer au
  // prochain tour, même si elle a déjà attaqué pendant son tour précédent.
  return !duel[autre(cote)].creatures.some((e) => creature(e) && !e.mur && !e.nePeutPasAttaquer
    && !(e.gelToursRestants > 0) && !(e.empecheAttaqueToursRestants > 0) && e.atk > 0);
}

/** Un renvoi au blocage peut rendre une attaque totalement vaine. On ne
 * l'écarte que si deux simulations du vrai combat aboutissent toutes deux au
 * retour de l'attaquant, sans autre changement de matériel ou de ressources.
 * Les effets non résolus ou difficiles à copier laissent le choix initial. */
function renvoiSansGain(duel, cote, attaquant, cible) {
  const combat = duelCardById(cible.carteId)?.combat;
  const carteAttaquant = duelCardById(attaquant.carteId);
  if (attaquant.coupRapide || combat?.type !== 'retour-main'
    || (carteAttaquant?.arrivee && attaquant.carteId !== 'scalde-des-runes')
    || retourScaldeUtile(duel, cote, attaquant)) return false;
  // Une créature blessée pourrait être rejouée intacte : ne pas décréter son
  // renvoi inutile sans évaluer ce bénéfice différé.
  if (attaquant.carteId !== 'scalde-des-runes' && attaquant.pv < attaquant.pvMax) return false;
  const adversaire = autre(cote);
  const vueCamp = (camp, exclureId = null) => {
    // Ne consulter que le nombre de cartes cachées, pas leur identité.
    const { main, deck, creatures, ...publicCamp } = camp;
    return JSON.stringify({ ...publicCamp, main: main?.length, deck: deck?.length,
      creatures: creatures.filter((e) => e.id !== exclureId) });
  };
  try {
    return rpgAvecCompteurEntitesIsole(() => [0.01, 0.99].every((jet) => {
      const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
      rpgReglerHasard(probe, () => jet);
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cible.id).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok) return false;
      if (rpgVainqueur(probe) || probe.destructionsEnAttente?.length || probe.arriveeEnAttente
        || probe.effetCreatureEnAttente || probe.siteEnAttente || probe.defausseEnAttente) return false;
      if (probe[cote].creatures.some((e) => e.id === attaquant.id)
        || probe[cote].main.length !== duel[cote].main.length + 1) return false;
      // Le retour ajoute une carte à notre main ; ignorer cette seule différence
      // pour vérifier que rien d'autre n'a changé, sans regarder son contenu.
      const avant = { ...duel[cote], main: [...duel[cote].main, null] };
      // Récupérer un vrai éphémère avant sa disparition peut servir au tour
      // suivant ; un jeton ou une main déjà pleine ne garantit pas ce gain.
      const sauveEphemere = attaquant.detruireFinDuTour && !attaquant.jeton
        && duel[cote].main.length < RPG_MANA_ESSAI_MAIN_MAX;
      return !sauveEphemere && vueCamp(avant, attaquant.id) === vueCamp(probe[cote])
        && vueCamp(duel[adversaire]) === vueCamp(probe[adversaire]);
    }));
  } catch {
    return false;
  }
}

/** Seule face à un Défenseur intact avec Contre-attaque, Tislit ne doit pas
 * se perdre pour une unique blessure. Vérifier l'échange et le raté réels ;
 * conserver le candidat s'il existe d'autres créatures, un équipement ou le
 * moindre effet supplémentaire qui pourrait rendre le sacrifice utile. */
function sacrificeTislitPourUneBlessure(duel, cote, attaquant, cible) {
  const adv = autre(cote);
  if (attaquant.carteId !== 'tislit-des-aures' || !attaquant.coupRapide || attaquant.arme
    || attaquant.coupCritique || attaquant.atk !== 1 || attaquant.pv !== 1
    || !estDefenseur(cible) || !cible.contreAttaque
    || cible.pv !== cible.pvMax || cible.pv < 4
    || duel[cote].creatures.length !== 1 || duel[adv].creatures.length !== 1) return false;
  const vueCamp = (camp, normaliserAttaque, normaliserBlessure, cimetiereBonus = false) => {
    const { main, deck, creatures, cimetiere, ...visible } = camp;
    return { ...visible, main: main.length, deck: deck.length,
      cimetiere: cimetiereBonus ? [...cimetiere, attaquant.carteId] : cimetiere,
      creatures: creatures.flatMap((e) => {
        if (normaliserAttaque === 'retire' && e.id === attaquant.id) return [];
        if (normaliserAttaque === 'pret' && e.id === attaquant.id) return [{ ...e, attaquee: attaquant.attaquee }];
        if (normaliserBlessure && e.id === cible.id) return [{ ...e, pv: cible.pv, def: cible.def }];
        return [e];
      }) };
  };
  const vueDuel = (etat) => {
    const { joueur, sorcier, log, combatDeclare, combatFeed, combatAnimations, combatAnimationSeq, ...visible } = etat;
    return JSON.stringify(visible);
  };
  try {
    return rpgAvecCompteurEntitesIsole(() => [0.01, 0.5].every((jet) => {
      const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
      let jets = 0;
      rpgReglerHasard(probe, () => { jets += 1; return jet; });
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cible.id).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets !== 1
        || rpgVainqueur(probe) || vueDuel(probe) !== vueDuel(duel)) return false;
      const touche = jet === 0.5;
      const cibleApres = probe[adv].creatures.find((e) => e.id === cible.id);
      if (!cibleApres || cibleApres.pv !== cible.pv - (touche ? 1 : 0)
        || cibleApres.def !== (touche ? Math.min(cible.def, cible.pv - 1) : cible.def)) return false;
      if (touche === probe[cote].creatures.some((e) => e.id === attaquant.id)) return false;
      const avant = vueCamp(duel[cote], touche ? 'retire' : null, false, touche);
      const apres = vueCamp(probe[cote], touche ? null : 'pret', false);
      return JSON.stringify(avant) === JSON.stringify(apres)
        && JSON.stringify(vueCamp(duel[adv], null, false)) === JSON.stringify(vueCamp(probe[adv], null, touche));
    }));
  } catch {
    return false;
  }
}

/** Reconnaît une attaque qui ne fait que détruire son auteur. Les zones
 * privées sont comparées uniquement pour détecter un changement, sans évaluer
 * leurs cartes. Les animations et journaux ne comptent pas comme un gain.
 * Les capacités de destruction et Tenacité gardent leur comportement initial. */
function perteSansGain(duel, probe, cote, attaquant) {
  const carte = duelCardById(attaquant.carteId);
  if (carte?.destruction || carte?.tenacite || attaquant.tenaciteDisponible
    // Sur un champ plein, libérer une place peut avoir une valeur ultérieure.
    || (duel.modeMana === RPG_MODE_MANA_ESSAI && duel[cote].creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX)
    || probe[cote].creatures.some((e) => e.id === attaquant.id) || rpgVainqueur(probe)) return false;
  const vueDuel = (etat) => {
    const { joueur, sorcier, log, combatDeclare, combatFeed, combatAnimations, combatAnimationSeq, ...visible } = etat;
    return visible;
  };
  const avant = {
    ...duel[cote],
    creatures: duel[cote].creatures.filter((e) => e.id !== attaquant.id),
    cimetiere: [...duel[cote].cimetiere, attaquant.carteId],
  };
  return JSON.stringify(vueDuel(duel)) === JSON.stringify(vueDuel(probe))
    && JSON.stringify(avant) === JSON.stringify(probe[cote])
    && JSON.stringify(duel[autre(cote)]) === JSON.stringify(probe[autre(cote)]);
}

/** Essaie un échange ordinaire sans toucher au duel ni consommer de hasard.
 * Si l'effet est aléatoire, suspendu ou difficile à copier, ne rien écarter. */
function mortSansGain(duel, cote, attaquant, cibleId) {
  if (attaquant.coupRapide) return false;
  try {
    return rpgAvecCompteurEntitesIsole(() => {
      const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
      let jets = 0;
      rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cibleId).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets) return false;
      return perteSansGain(duel, probe, cote, attaquant);
    });
  } catch {
    return false;
  }
}

/** Un éphémère qui disparaîtra à la fin du tour n'a pas le même coût de
 * perte qu'un défenseur durable. N'enlever cette pénalité que pour un échange
 * simple et certain : la simulation doit détruire l'attaquant, blesser la
 * cible et ne produire aucun autre changement matériel ou effet différé.
 * Pour le score d'attaque seulement, on peut également reconnaître l'excédent
 * exact d'Overkill des deux Djinns dont c'est la seule capacité offensive. */
function ephemereBlesseSansAutrePerte(duel, cote, attaquant, cible, autoriserOverkill = false) {
  const adv = autre(cote);
  if (!attaquant.detruireFinDuTour || attaquant.coupRapide
    || duelCardById(attaquant.carteId)?.destruction || attaquant.tenaciteDisponible
    || duelCardById(cible.carteId)?.destruction || cible.tenaciteDisponible) return false;
  try {
    return rpgAvecCompteurEntitesIsole(() => {
      const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
      let jets = 0;
      rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cible.id).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets || rpgVainqueur(probe)
        || probe[cote].creatures.some((e) => e.id === attaquant.id)) return false;
      const cibleApres = probe[adv].creatures.find((e) => e.id === cible.id);
      if (cibleApres && !(cibleApres.pv < cible.pv)) return false;
      const avantAllie = { ...duel[cote], creatures: duel[cote].creatures.filter((e) => e.id !== attaquant.id),
        cimetiere: [...duel[cote].cimetiere, attaquant.carteId] };
      const overkillSimple = autoriserOverkill && attaquant.overkill && !attaquant.arme && !attaquant.armes?.length
        && ['djinn-du-dernier-brasier', 'ifrit-des-ergs'].includes(attaquant.carteId);
      // Les Sandales n'ont pas de déclenchement à la mort : elles rejoignent
      // simplement le cimetière avant leur porteur. Ne pas étendre cette
      // hypothèse aux équipements dont les effets seraient à évaluer.
      const sandales = overkillSimple && cible.arme?.carteId === 'sandales-de-tislit'
        && !cible.armes?.length ? ['sandales-de-tislit'] : [];
      let avantAdv = cibleApres ? duel[adv] : { ...duel[adv],
        creatures: duel[adv].creatures.filter((e) => e.id !== cible.id),
        cimetiere: [...duel[adv].cimetiere, ...sandales, cible.carteId] };
      if (overkillSimple && !cibleApres) {
        const exces = Math.max(0, attaquant.atk - Math.max(0, Number(cible.def) || 0));
        const absorbes = Math.min(duel[adv].bouclier ?? 0, exces);
        const recus = exces - absorbes;
        avantAdv = { ...avantAdv, pv: duel[adv].pv - recus,
          bouclier: Math.max(0, (duel[adv].bouclier ?? 0) - absorbes),
          degatsRecus: (duel[adv].degatsRecus ?? 0) + recus };
      }
      const apresAdv = cibleApres ? { ...probe[adv], creatures: probe[adv].creatures.map((e) =>
        e.id === cible.id ? { ...e, pv: cible.pv, def: cible.def } : e) } : probe[adv];
      const vueDuel = (etat) => {
        const { joueur, sorcier, log, combatDeclare, combatFeed, combatAnimations, combatAnimationSeq, ...visible } = etat;
        return visible;
      };
      return JSON.stringify(avantAllie) === JSON.stringify(probe[cote])
        && JSON.stringify(avantAdv) === JSON.stringify(apresAdv)
        && JSON.stringify(vueDuel(duel)) === JSON.stringify(vueDuel(probe));
    });
  } catch {
    return false;
  }
}

/** Sous le Grand Voile, éviter une attaque si le vrai moteur n'en tire aucun
 * effet visible. En cas de hasard, de choix suspendu ou d'effet quelconque,
 * conserver le candidat : une bannière ou une capacité peut rester utile. */
function attaqueSansEffetSousVoile(duel, cote, attaquant, cibleId) {
  if (!duel.brouillardCombat) return false;
  const vueCamp = (camp) => {
    const { main, deck, creatures, ...visible } = camp;
    return { ...visible, main: main.length, deck: deck.length,
      creatures: creatures.map((e) => e.id === attaquant.id ? { ...e, attaquee: attaquant.attaquee } : e) };
  };
  const vue = (etat) => {
    // Le journal et le marqueur de combat changent même pour un coup à vide.
    const { joueur, sorcier, log, combatDeclare, ...visible } = etat;
    return JSON.stringify({ ...visible, joueur: vueCamp(joueur), sorcier: vueCamp(sorcier) });
  };
  try {
    return rpgAvecCompteurEntitesIsole(() => {
      const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
      let jets = 0;
      rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cibleId).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets) return false;
      if (rpgVainqueur(probe) || probe.destructionsEnAttente?.length || probe.arriveeEnAttente
        || probe.effetCreatureEnAttente || probe.siteEnAttente || probe.defausseEnAttente) return false;
      return vue(duel) === vue(probe);
    });
  } catch {
    return false;
  }
}

/** Cherche une courte suite d'attaques gagnante si l'adversaire passe ses
 * fenêtres de réponse. Un Défenseur peut être écarté avant les coups directs.
 * Les vraies règles sont simulées, sans hasard ni choix en attente ; aucune
 * carte cachée n'est consultée pour évaluer la suite. */
function premiereAttaqueDeVictoire(duel, cote, attaquantImpose = null) {
  if (duel.brouillardCombat || !duel[cote].creatures.some(rpgPeutAttaquer)) return null;
  let essais = 0;
  const maxEssais = 80;
  const chercher = (etat, profondeur) => {
    if (profondeur <= 0 || essais >= maxEssais) return null;
    const attaquants = etat[cote].creatures.filter((e) => rpgPeutAttaquer(e)
      && (!attaquantImpose || e.id === attaquantImpose))
      .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0)).slice(0, 6);
    const attaques = attaquants.flatMap((attaquant) => {
      const cibles = rpgCiblesIndividuellesClassique(etat, cote, attaquant.id);
      return [...(cibles.directe ? [null] : []), ...cibles.cibles.slice(0, 6)]
        .map((cibleId) => ({ attaquantId: attaquant.id, cibleId }));
    });
    const force = new Map(attaquants.map((entite) => [entite.id, Number(entite.atk) || 0]));
    // Chercher d'abord les frappes directes puissantes ; pour dégager un
    // Défenseur, essayer les petites créatures avant de dépenser le finisseur.
    attaques.sort((a, b) => Number(b.cibleId === null) - Number(a.cibleId === null)
      || (a.cibleId === null ? force.get(b.attaquantId) - force.get(a.attaquantId)
        : force.get(a.attaquantId) - force.get(b.attaquantId)));
    for (const attaque of attaques) {
      if (essais++ >= maxEssais) break;
      const probe = typeof structuredClone === 'function' ? structuredClone(etat) : JSON.parse(JSON.stringify(etat));
      let jets = 0;
      rpgReglerHasard(probe, () => { jets += 1; return 0.99; });
      if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaque.attaquantId, attaque.cibleId).ok
        || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets) continue;
      const source = etat[cote].creatures.find((e) => e.id === attaque.attaquantId);
      if (source && perteSansGain(etat, probe, cote, source)) continue;
      // Ne pas tirer parti de cartes piochées ou modifiées sur une copie : leur
      // identité et l'ordre des paquets ne sont pas des informations publiques.
      if (['joueur', 'sorcier'].some((camp) => probe[camp].main.length !== etat[camp].main.length
        || probe[camp].deck.length !== etat[camp].deck.length)) continue;
      if (probe.renfortChoixEnAttente || probe.arriveeEnAttente || probe.effetCreatureEnAttente
        || probe.destructionsEnAttente?.length || probe.defausseEnAttente || probe.siteEnAttente
        || probe.boualemEnAttente || probe.annonce || probe.combatDeclare) continue;
      const vainqueur = rpgVainqueur(probe);
      if (vainqueur === cote) return attaque;
      if (vainqueur || probe.phase !== 'principale') continue;
      if (chercher(probe, profondeur - 1)) return attaque;
    }
    return null;
  };
  try {
    // Lors d'une reprise imposée, vérifier uniquement la victoire immédiate :
    // le choix reste limité à l'attaquant dont l'annonce a été interrompue.
    return rpgAvecCompteurEntitesIsole(() => chercher(duel, attaquantImpose ? 1 : 4));
  } catch {
    return null;
  }
}

/** À score égal contre le même Défenseur, départager un éphémère et un allié
 * durable en comparant les deux ordres complets. On ne retient le premier que
 * s'il libère la frappe directe, fait strictement plus de dégâts, et ne laisse
 * aucun autre effet défavorable identifiable. L'adversaire est supposé passer. */
function ordreFurtifPlusUtile(duel, cote, cible, furtif, durable) {
  const adv = autre(cote);
  if (duel.brouillardCombat || duel[cote].creatures.length !== 2 || duel[adv].creatures.length !== 1
    || !furtif.detruireFinDuTour || durable.detruireFinDuTour || durable.atk <= furtif.atk
    || !rpgPeutAttaquer(furtif) || !rpgPeutAttaquer(durable)
    || !ephemereBlesseSansAutrePerte(duel, cote, furtif, cible)) return false;
  try {
    return rpgAvecCompteurEntitesIsole(() => {
      const sequence = (premier, second) => {
        const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
        let jets = 0;
        rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
        if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, premier.id, cible.id).ok
          || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets || rpgVainqueur(probe)
          || probe[adv].creatures.some((e) => e.id === cible.id)
          || !rpgCiblesIndividuellesClassique(probe, cote, second.id).directe
          || !rpgDeclarerAttaqueIndividuelleClassique(probe, cote, second.id, null).ok
          || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets || rpgVainqueur(probe)) return null;
        if (probe.renfortChoixEnAttente || probe.arriveeEnAttente || probe.effetCreatureEnAttente
          || probe.destructionsEnAttente?.length || probe.defausseEnAttente || probe.siteEnAttente
          || probe.boualemEnAttente || probe.annonce || probe.combatDeclare) return null;
        if (['joueur', 'sorcier'].some((camp) => JSON.stringify(probe[camp].main) !== JSON.stringify(duel[camp].main)
          || JSON.stringify(probe[camp].deck) !== JSON.stringify(duel[camp].deck))) return null;
        return probe;
      };
      const a = sequence(furtif, durable);
      const b = sequence(durable, furtif);
      if (!a || !b || a[cote].creatures.some((e) => e.id === furtif.id)
        || !b[cote].creatures.some((e) => e.id === furtif.id && e.detruireFinDuTour)) return false;
      const gardeeA = a[cote].creatures.find((e) => e.id === durable.id);
      const gardeeB = b[cote].creatures.find((e) => e.id === durable.id);
      if (!gardeeA || !gardeeB || gardeeA.pv < gardeeB.pv || gardeeA.def < gardeeB.def) return false;
      const horsBlessure = ({ pv, def, ...visible }) => visible;
      if (JSON.stringify(horsBlessure(gardeeA)) !== JSON.stringify(horsBlessure(gardeeB))) return false;
      const campAllie = (etat) => {
        const { creatures, cimetiere, pv, bouclier, degatsRecus, ...visible } = etat[cote];
        const morts = [...cimetiere];
        if (!creatures.some((e) => e.id === furtif.id)) {
          const index = morts.lastIndexOf(furtif.carteId);
          if (index >= 0) morts.splice(index, 1);
        }
        return { ...visible, cimetiere: morts, creatures: creatures.filter((e) => e.id !== furtif.id && e.id !== durable.id) };
      };
      const campAdverse = (etat) => {
        const { pv, bouclier, degatsRecus, ...visible } = etat[adv];
        return visible;
      };
      const vueDuel = (etat) => {
        const { joueur, sorcier, log, combatDeclare, combatFeed, combatAnimations, combatAnimationSeq, prochainUid, ...visible } = etat;
        return visible;
      };
      const pvA = a[adv].pv, pvB = b[adv].pv;
      const bouclierA = a[adv].bouclier ?? 0, bouclierB = b[adv].bouclier ?? 0;
      return pvA <= pvB && bouclierA <= bouclierB && (pvA < pvB || bouclierA < bouclierB)
        && a[cote].pv >= b[cote].pv && (a[cote].bouclier ?? 0) >= (b[cote].bouclier ?? 0)
        && JSON.stringify(campAllie(a)) === JSON.stringify(campAllie(b))
        && JSON.stringify(campAdverse(a)) === JSON.stringify(campAdverse(b))
        && JSON.stringify(vueDuel(a)) === JSON.stringify(vueDuel(b));
    });
  } catch {
    return false;
  }
}

/** Départage limité à la Flèche et au Ghul : à score égal, privilégier une
 * autre cible si le Ghul permet au joueur de tuer une alliée durable et que le
 * moteur confirme que les deux tirs touchés n'ont pas d'autres effets visibles.
 * Ce n'est pas une preuve d'équivalence stratégique des créatures restantes.
 * La branche de raté est identique pour ces tirs simples ; les simulations ne
 * consomment ni choix réel ni hasard réel. */
function tirSimpleEvitePerte(duel, cote, attaquant, dangereuse, alternative) {
  if (!dangereuse || !alternative) return false;
  const adv = autre(cote);
  const carteDanger = duelCardById(dangereuse.carteId);
  const effet = carteDanger?.destruction;
  const carteAutre = duelCardById(alternative.carteId);
  // On ne suppose pas que des capacités ou équipements inconnus sont neutres.
  // Ce départage ne traite que la Flèche contre le Ghul et un tir simple,
  // sans équipements autres que les Sandales (qui tombent au cimetière).
  if (adv !== 'joueur' || attaquant.carteId !== 'djinn-de-la-fleche-ardente'
    || !attaquant.detruireFinDuTour || !attaquant.coupRapide || attaquant.arme || attaquant.armes?.length || attaquant.coupCritique
    || dangereuse.carteId !== 'ghul-des-cendres' || effet?.type !== 'degats' || effet.cible !== 'creature' || !(effet.amount > 0)
    || dangereuse.esquive || dangereuse.contreAttaque || dangereuse.provocation || dangereuse.tenaciteDisponible
    || dangereuse.enCale || dangereuse.cargaison || dangereuse.armes?.length
    || (dangereuse.arme && dangereuse.arme.carteId !== 'sandales-de-tislit')
    || !carteAutre || carteAutre.destruction || carteAutre.riposteAttaqueCiblee || alternative.arme || alternative.armes?.length
    || alternative.esquive || alternative.contreAttaque || alternative.provocation || alternative.tenaciteDisponible
    || alternative.enCale || alternative.cargaison
    || duel[cote].creatures.some((e) => duelCardById(e.carteId)?.mortAlliee)) return false;
  const victimes = duel[cote].creatures.filter((e) => e.id !== attaquant.id && creature(e)
    && !e.detruireFinDuTour && e.pv <= effet.amount && !e.arme && !e.armes?.length && !e.enCale && !e.cargaison
    && !e.tenaciteDisponible && !e.honneur && !duelCardById(e.carteId)?.destruction);
  if (!victimes.length) return false;
  const vueCamp = (camp) => {
    const { main, deck, ...visible } = camp;
    return { ...visible, main: main.length, deck: deck.length };
  };
  const vueDuel = (etat) => {
    const { joueur, sorcier, log, combatDeclare, combatFeed, combatAnimations, combatAnimationSeq,
      prochainUid, destructionsEnAttente, ...visible } = etat;
    return visible;
  };
  try {
    return rpgAvecCompteurEntitesIsole(() => {
      const essayer = (cible) => {
        const probe = typeof structuredClone === 'function' ? structuredClone(duel) : JSON.parse(JSON.stringify(duel));
        let jets = 0;
        rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
        if (!rpgDeclarerAttaqueIndividuelleClassique(probe, cote, attaquant.id, cible.id).ok
          || !rpgResoudreAttaqueIndividuelleClassique(probe, cote).ok || jets !== 1
          || rpgVainqueur(probe) || probe[adv].creatures.some((e) => e.id === cible.id)) return null;
        return probe;
      };
      const sure = essayer(alternative);
      if (!sure || sure.destructionsEnAttente?.length) return false;
      const avantAllie = duel[cote];
      const apresAllie = { ...sure[cote], creatures: sure[cote].creatures.map((e) =>
        e.id === attaquant.id ? { ...e, attaquee: attaquant.attaquee } : e) };
      const avantAdverse = { ...duel[adv], creatures: duel[adv].creatures.filter((e) => e.id !== alternative.id),
        cimetiere: [...duel[adv].cimetiere, alternative.carteId] };
      if (JSON.stringify(vueCamp(avantAllie)) !== JSON.stringify(vueCamp(apresAllie))
        || JSON.stringify(vueCamp(avantAdverse)) !== JSON.stringify(vueCamp(sure[adv]))
        || JSON.stringify(vueDuel(duel)) !== JSON.stringify(vueDuel(sure))) return false;
      const risque = essayer(dangereuse);
      if (!risque || risque.destructionsEnAttente?.length !== 1
        || risque.destructionsEnAttente[0].cote !== adv
        || risque.destructionsEnAttente[0].carteId !== dangereuse.carteId) return false;
      const apresRisqueAllie = { ...risque[cote], creatures: risque[cote].creatures.map((e) =>
        e.id === attaquant.id ? { ...e, attaquee: attaquant.attaquee } : e) };
      const avantRisqueAdverse = { ...duel[adv], creatures: duel[adv].creatures.filter((e) => e.id !== dangereuse.id),
        cimetiere: [...duel[adv].cimetiere, ...(dangereuse.arme ? [dangereuse.arme.carteId] : []), dangereuse.carteId] };
      if (JSON.stringify(vueCamp(avantAllie)) !== JSON.stringify(vueCamp(apresRisqueAllie))
        || JSON.stringify(vueCamp(avantRisqueAdverse)) !== JSON.stringify(vueCamp(risque[adv]))
        || JSON.stringify(vueDuel(duel)) !== JSON.stringify(vueDuel(risque))) return false;
      return victimes.some((victime) => {
        const probe = typeof structuredClone === 'function' ? structuredClone(risque) : JSON.parse(JSON.stringify(risque));
        let jets = 0;
        rpgReglerHasard(probe, () => { jets += 1; return 0.5; });
        if (!rpgResoudreDestructionCiblee(probe, adv, victime.id).ok || jets || rpgVainqueur(probe)
          || probe.destructionsEnAttente?.length || probe[cote].creatures.some((e) => e.id === victime.id)) return false;
        const avant = { ...risque[cote], creatures: risque[cote].creatures.filter((e) => e.id !== victime.id),
          cimetiere: [...risque[cote].cimetiere, victime.carteId] };
        return JSON.stringify(vueCamp(avant)) === JSON.stringify(vueCamp(probe[cote]))
          && JSON.stringify(vueCamp(risque[adv])) === JSON.stringify(vueCamp(probe[adv]))
          && JSON.stringify(vueDuel(risque)) === JSON.stringify(vueDuel(probe));
      });
    });
  } catch {
    return false;
  }
}

/** Choix déterministe de l'IA : privilégier une victoire directe puis les
 * échanges favorables. La légalité est recalculée avant chaque déclaration. */
export function rpgChoisirAttaqueIndividuelleClassiqueIA(duel, cote = 'sorcier', attaquantImpose = null) {
  if (!soloClassique(duel, cote) || duel.tour !== cote || duel.phase !== 'principale' || duel.combatDeclare || rpgVainqueur(duel)) return null;
  const adversaire = autre(cote);
  const victoire = premiereAttaqueDeVictoire(duel, cote, attaquantImpose);
  if (victoire) return victoire;
  const choix = [];
  for (const attaquant of duel[cote].creatures.filter((e) => rpgPeutAttaquer(e) && (!attaquantImpose || e.id === attaquantImpose))) {
    const cibles = rpgCiblesIndividuellesClassique(duel, cote, attaquant.id);
    if (cibles.directe && (attaquantImpose || !attaqueSansEffetSousVoile(duel, cote, attaquant, null))) {
      const degats = duel.brouillardCombat ? 0 : Math.max(0, Number(attaquant.atk) || 0);
      const lethal = degats >= (duel[adversaire].pv ?? 0) + (duel[adversaire].bouclier ?? 0);
      choix.push({ attaquantId: attaquant.id, cibleId: null, score: lethal ? 1000 : degats * 2 + 1 });
    }
    for (const cibleId of cibles.cibles) {
      const cible = duel[adversaire].creatures.find((e) => e.id === cibleId);
      if (!attaquantImpose && (attaqueSansEffetSousVoile(duel, cote, attaquant, cibleId)
        || renvoiSansGain(duel, cote, attaquant, cible)
        || sacrificeTislitPourUneBlessure(duel, cote, attaquant, cible)
        || mortSansGain(duel, cote, attaquant, cibleId))) continue;
      const tue = attaquant.atk >= cible.pv;
      const meurt = !attaquant.coupRapide && cible.atk >= attaquant.pv;
      const perte = meurt && !ephemereBlesseSansAutrePerte(duel, cote, attaquant, cible, true)
        ? 5 + attaquant.atk + attaquant.pv : 0;
      const score = (tue ? 5 + cible.atk + cible.pv : Math.min(attaquant.atk, cible.pv)) - perte;
      choix.push({ attaquantId: attaquant.id, cibleId, score });
    }
  }
  choix.sort((a, b) => b.score - a.score);
  let meilleur = choix[0];
  if (meilleur && !attaquantImpose && meilleur.score > 0 && meilleur.cibleId !== null) {
    const durable = duel[cote].creatures.find((e) => e.id === meilleur.attaquantId);
    const cible = duel[adversaire].creatures.find((e) => e.id === meilleur.cibleId);
    const autreChoix = choix.find((c) => c.score === meilleur.score && c.cibleId === meilleur.cibleId
      && c.attaquantId !== meilleur.attaquantId
      && duel[cote].creatures.find((e) => e.id === c.attaquantId)?.detruireFinDuTour);
    const furtif = duel[cote].creatures.find((e) => e.id === autreChoix?.attaquantId);
    if (durable && cible && furtif && ordreFurtifPlusUtile(duel, cote, cible, furtif, durable)) meilleur = autreChoix;
  }
  if (meilleur && meilleur.score > 0 && meilleur.cibleId !== null) {
    const attaquant = duel[cote].creatures.find((e) => e.id === meilleur.attaquantId);
    const cible = duel[adversaire].creatures.find((e) => e.id === meilleur.cibleId);
    if (attaquant && cible) {
      const alternative = choix.find((c) => c.score === meilleur.score && c.attaquantId === meilleur.attaquantId
        && c.cibleId !== null && c.cibleId !== meilleur.cibleId
        && tirSimpleEvitePerte(duel, cote, attaquant, cible, duel[adversaire].creatures.find((e) => e.id === c.cibleId)));
      if (alternative) meilleur = alternative;
    }
  }
  return meilleur && (attaquantImpose || meilleur.score > 0) ? { attaquantId: meilleur.attaquantId, cibleId: meilleur.cibleId } : null;
}
