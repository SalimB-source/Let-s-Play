/** Transitions pures de la campagne (Actes I à VIII) : aucune minuterie, aucun effet de combat. */
import {
  RPG_STORY_ACTES,
  RPG_STORY_ALL_SCENES,
  RPG_STORY_CAMPAIGN_ID,
  RPG_STORY_SCENES,
  acteHistoire,
  acteSuivantHistoire,
  optionChoix,
  sceneHistoire,
  scenesPourActe,
} from './rpgStoryScenes.js';
import { personnageEtage, personnageHistoire } from './rpgStoryCast.js';

export function recitHistoireVide() {
  return {
    campagneId: RPG_STORY_CAMPAIGN_ID,
    curseur: { type: 'scene', id: RPG_STORY_SCENES[0].id, replique: 0, resume: false },
    scenesVues: [],
    choix: {},
  };
}

function curseurFinActe(acteId) {
  return !acteId || acteId === 'acte-1' ? { type: 'fin' } : { type: 'fin', acteId };
}

export function acteCourantRecit(recit) {
  if (!recit?.curseur) return 'acte-1';
  if (recit.curseur.type === 'scene') return sceneHistoire(recit.curseur.id)?.acteId ?? 'acte-1';
  if (recit.curseur.type === 'duel') return sceneHistoire(`${recit.curseur.etageId}-avant`)?.acteId ?? 'acte-1';
  if (recit.curseur.type === 'fin') return recit.curseur.acteId ?? 'acte-1';
  return 'acte-1';
}

/** Un jeton de rendu empêche un double clic ou un ancien bouton d'avancer deux fois. */
export function cleCurseurRecit(curseur) {
  if (!curseur) return '';
  return [curseur.type, curseur.id ?? curseur.etageId ?? curseur.acteId ?? '', curseur.replique ?? '', Boolean(curseur.resume)].join(':');
}

/**
 * Une sauvegarde ne peut sauter ni scène ni décision. On conserve le préfixe
 * cohérent du récit, puis on recale son curseur. Les victoires libres ne sont
 * jamais transformées en dialogues lus ni en choix inventés.
 */
export function normaliserRecitHistoire(value, etagesVaincus = []) {
  if (!value || typeof value !== 'object' || value.campagneId !== RPG_STORY_CAMPAIGN_ID) return null;
  const gagnees = new Set(etagesVaincus);
  const demandees = new Set(Array.isArray(value.scenesVues) ? value.scenesVues : []);
  const scenesVues = [];
  const choix = {};
  for (const scene of RPG_STORY_ALL_SCENES) {
    if (!demandees.has(scene.id)) break;
    if (scene.moment === 'apres' && !gagnees.has(scene.etageId)) break;
    if (scene.choix) {
      const option = optionChoix(scene.choix, value.choix?.[scene.choix]);
      if (!option) break;
      choix[scene.choix] = option.id;
    }
    scenesVues.push(scene.id);
  }
  const suivante = RPG_STORY_ALL_SCENES[scenesVues.length];
  if (!suivante) {
    return { campagneId: RPG_STORY_CAMPAIGN_ID, curseur: curseurFinActe(RPG_STORY_ALL_SCENES.at(-1)?.acteId ?? 'acte-1'), scenesVues, choix };
  }
  const sauve = value.curseur;
  const derniereVue = scenesVues.length > 0 ? RPG_STORY_ALL_SCENES[scenesVues.length - 1] : null;
  if (derniereVue && derniereVue.acteId !== suivante.acteId && sauve?.type === 'fin') {
    return { campagneId: RPG_STORY_CAMPAIGN_ID, curseur: curseurFinActe(derniereVue.acteId), scenesVues, choix };
  }
  // L'après-duel n'est accessible que si la transition de victoire (ou le
  // bouton « déjà remporté ») l'a programmée. Sinon on garde le briefing.
  const estScene = suivante.moment === 'avant'
    || (gagnees.has(suivante.etageId) && sauve?.type === 'scene' && sauve.id === suivante.id);
  let curseur = { type: 'duel', etageId: suivante.etageId };
  if (estScene) {
    const correspond = sauve?.type === 'scene' && sauve.id === suivante.id;
    const index = correspond && Number.isInteger(sauve.replique) ? sauve.replique : 0;
    curseur = {
      type: 'scene', id: suivante.id,
      replique: Math.max(0, Math.min(index, suivante.repliques.length - 1)),
      resume: correspond && sauve.resume === true,
    };
  }
  return { campagneId: RPG_STORY_CAMPAIGN_ID, curseur, scenesVues, choix };
}

function terminerScene(recit, scene, choix = recit.choix) {
  const index = RPG_STORY_ALL_SCENES.findIndex((item) => item.id === scene.id);
  const suivante = RPG_STORY_ALL_SCENES[index + 1];
  const finDActe = !suivante || suivante.acteId !== scene.acteId;
  const curseur = scene.moment === 'avant'
    ? { type: 'duel', etageId: scene.etageId }
    : finDActe
      ? curseurFinActe(scene.acteId)
      : { type: 'scene', id: suivante.id, replique: 0, resume: false };
  return { ...recit, curseur, scenesVues: [...recit.scenesVues, scene.id], choix };
}

/**
 * Événements : continuer / resumer / choisir / victoire / deja-vaincu / ouvrir-acte.
 * Tous désignent le curseur attendu. Une relecture du journal n'appelle pas
 * cette fonction ; un résultat de combat libre non plus.
 */
export function transitionRecitHistoire(recit, evenement, etagesVaincus = []) {
  if (!recit || !evenement || !evenement.curseur
    || cleCurseurRecit(recit.curseur) !== cleCurseurRecit(evenement.curseur)) return recit;
  const curseur = recit.curseur;
  if (curseur.type === 'fin') {
    if (evenement.type !== 'ouvrir-acte') return recit;
    const suivante = RPG_STORY_ALL_SCENES[recit.scenesVues.length];
    if (!suivante) return recit;
    if (evenement.acteId && suivante.acteId !== evenement.acteId) return recit;
    return { ...recit, curseur: { type: 'scene', id: suivante.id, replique: 0, resume: false } };
  }
  if (curseur.type === 'duel') {
    if (!['victoire', 'deja-vaincu'].includes(evenement.type)
      || evenement.etageId !== curseur.etageId
      || !etagesVaincus.includes(curseur.etageId)) return recit;
    return { ...recit, curseur: { type: 'scene', id: `${curseur.etageId}-apres`, replique: 0, resume: false } };
  }
  if (curseur.type !== 'scene') return recit;
  const scene = sceneHistoire(curseur.id);
  if (!scene) return recit;
  const derniere = curseur.resume || curseur.replique >= scene.repliques.length - 1;
  if (evenement.type === 'resumer') {
    if (curseur.resume) return recit;
    return { ...recit, curseur: { ...curseur, resume: true } };
  }
  if (evenement.type === 'choisir') {
    if (!derniere || !scene.choix
      || Object.hasOwn(recit.choix, scene.choix) || !optionChoix(scene.choix, evenement.optionId)) return recit;
    return terminerScene(recit, scene, { ...recit.choix, [scene.choix]: evenement.optionId });
  }
  if (evenement.type !== 'continuer') return recit;
  if (!derniere) return { ...recit, curseur: { ...curseur, replique: curseur.replique + 1 } };
  if (scene.choix) return recit; // Résumer n'a jamais le droit de choisir à votre place.
  return terminerScene(recit, scene);
}

export function resumeRecitHistoire(recit) {
  if (!recit) {
    return {
      commence: false,
      termine: false,
      campagneTerminee: false,
      acteId: 'acte-1',
      acte: acteHistoire('acte-1'),
      acteSuivant: null,
      scenesLues: 0,
      total: RPG_STORY_SCENES.length,
      scenesLuesCampagne: 0,
      totalCampagne: RPG_STORY_ALL_SCENES.length,
      titre: 'Les absents',
    };
  }
  const acteId = acteCourantRecit(recit);
  const acte = acteHistoire(acteId) ?? acteHistoire('acte-1');
  const scenesActe = scenesPourActe(acte.id);
  const vues = new Set(recit.scenesVues);
  const scenesLuesActe = scenesActe.filter((scene) => vues.has(scene.id)).length;
  const estFin = recit.curseur.type === 'fin';
  const acteSuivant = estFin ? acteSuivantHistoire(acte.id) : null;
  return {
    commence: true,
    termine: estFin,
    campagneTerminee: estFin && !acteSuivant,
    acteId: acte.id,
    acte,
    acteSuivant,
    scenesLues: scenesLuesActe,
    total: scenesActe.length,
    scenesLuesCampagne: recit.scenesVues.length,
    totalCampagne: RPG_STORY_ALL_SCENES.length,
    titre: recit.curseur.type === 'scene'
      ? sceneHistoire(recit.curseur.id)?.titre ?? acte.titre
      : recit.curseur.type === 'duel' ? 'Un droit à défendre' : acte.id === 'acte-1' ? 'Douze noms, une porte' : acte.titre,
  };
}

const CHIFFRES_ROMAINS = Object.freeze(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);

/**
 * Découpage de l’acte en paliers narratifs (un par étage de la tour de l’acte)
 * pour la frise de campagne et le sélecteur du journal.
 */
export function etapesRecitHistoire(recit, etagesVaincus = [], forceActeId = null) {
  const vues = new Set(recit?.scenesVues ?? []);
  const gagnees = new Set(etagesVaincus);
  const acteId = forceActeId ?? acteCourantRecit(recit);
  const acte = acteHistoire(acteId) ?? acteHistoire('acte-1');
  const curseur = recit?.curseur ?? null;
  const etageCourant = curseur?.type === 'duel'
    ? curseur.etageId
    : curseur?.type === 'scene'
      ? sceneHistoire(curseur.id)?.etageId ?? null
      : null;
  return acte.etages.map((etageId, index) => {
    const avant = sceneHistoire(`${etageId}-avant`);
    const personnageId = personnageEtage(etageId);
    const personnage = personnageHistoire(personnageId);
    const termine = vues.has(`${etageId}-apres`);
    const enCours = !termine && Boolean(recit && etageCourant === etageId);
    const sceneLue = vues.has(`${etageId}-avant`) || termine;
    return {
      numero: index + 1,
      romain: CHIFFRES_ROMAINS[index] ?? String(index + 1),
      acteId: acte.id,
      etageId,
      titre: avant?.titre ?? personnage.nom,
      personnageId,
      personnageNom: personnage.nom,
      sceneAvantId: `${etageId}-avant`,
      sceneApresId: `${etageId}-apres`,
      statut: termine ? 'termine' : enCours ? 'en-cours' : 'a-venir',
      sceneLue,
      duelVaincu: gagnees.has(etageId),
    };
  });
}

/** Résumé des actes de la campagne pour l’affiche et le journal. */
export function resumeActesHistoire(recit) {
  const vues = new Set(recit?.scenesVues ?? []);
  const acteActifId = acteCourantRecit(recit);
  return RPG_STORY_ACTES.map((acte) => {
    const scenes = scenesPourActe(acte.id);
    const lues = scenes.filter((scene) => vues.has(scene.id)).length;
    const termine = lues === scenes.length && scenes.length > 0;
    const enCours = !termine && Boolean(recit && (acteActifId === acte.id || lues > 0));
    return {
      ...acte,
      scenesLues: lues,
      totalScenes: scenes.length,
      statut: termine ? 'termine' : enCours ? 'en-cours' : 'a-venir',
    };
  });
}
