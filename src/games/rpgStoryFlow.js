/** Transitions pures de l'épisode : aucune minuterie, aucun effet de combat. */
import {
  RPG_STORY_CAMPAIGN_ID,
  RPG_STORY_LIST_CHOICE,
  RPG_STORY_SCENES,
  choixListe,
  sceneHistoire,
} from './rpgStoryScenes.js';

export function recitHistoireVide() {
  return {
    campagneId: RPG_STORY_CAMPAIGN_ID,
    curseur: { type: 'scene', id: RPG_STORY_SCENES[0].id, replique: 0, resume: false },
    scenesVues: [],
    choix: {},
  };
}

/** Un jeton de rendu empêche un double clic ou un ancien bouton d'avancer deux fois. */
export function cleCurseurRecit(curseur) {
  if (!curseur) return '';
  return [curseur.type, curseur.id ?? curseur.etageId ?? '', curseur.replique ?? '', Boolean(curseur.resume)].join(':');
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
  const option = choixListe(value.choix?.[RPG_STORY_LIST_CHOICE.id]);
  const scenesVues = [];
  const choix = {};
  for (const scene of RPG_STORY_SCENES) {
    if (!demandees.has(scene.id)) break;
    if (scene.moment === 'apres' && !gagnees.has(scene.etageId)) break;
    if (scene.choix && !option) break;
    scenesVues.push(scene.id);
    if (scene.choix) choix[scene.choix] = option.id;
  }
  const suivante = RPG_STORY_SCENES[scenesVues.length];
  if (!suivante) {
    return { campagneId: RPG_STORY_CAMPAIGN_ID, curseur: { type: 'fin' }, scenesVues, choix };
  }
  const sauve = value.curseur;
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
  const index = RPG_STORY_SCENES.findIndex((item) => item.id === scene.id);
  const suivante = RPG_STORY_SCENES[index + 1];
  const curseur = scene.moment === 'avant'
    ? { type: 'duel', etageId: scene.etageId }
    : suivante
      ? { type: 'scene', id: suivante.id, replique: 0, resume: false }
      : { type: 'fin' };
  return { ...recit, curseur, scenesVues: [...recit.scenesVues, scene.id], choix };
}

/**
 * Événements : continuer / resumer / choisir / victoire / deja-vaincu.
 * Tous désignent le curseur attendu. Une relecture du journal n'appelle pas
 * cette fonction ; un résultat de combat libre non plus.
 */
export function transitionRecitHistoire(recit, evenement, etagesVaincus = []) {
  if (!recit || !evenement || !evenement.curseur
    || cleCurseurRecit(recit.curseur) !== cleCurseurRecit(evenement.curseur)) return recit;
  const curseur = recit.curseur;
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
    if (!derniere || scene.choix !== RPG_STORY_LIST_CHOICE.id
      || Object.hasOwn(recit.choix, scene.choix) || !choixListe(evenement.optionId)) return recit;
    return terminerScene(recit, scene, { ...recit.choix, [scene.choix]: evenement.optionId });
  }
  if (evenement.type !== 'continuer') return recit;
  if (!derniere) return { ...recit, curseur: { ...curseur, replique: curseur.replique + 1 } };
  if (scene.choix) return recit; // Résumer n'a jamais le droit de choisir à votre place.
  return terminerScene(recit, scene);
}

export function resumeRecitHistoire(recit) {
  if (!recit) return { commence: false, termine: false, scenesLues: 0, total: RPG_STORY_SCENES.length, titre: 'Les absents' };
  return {
    commence: true,
    termine: recit.curseur.type === 'fin',
    scenesLues: recit.scenesVues.length,
    total: RPG_STORY_SCENES.length,
    titre: recit.curseur.type === 'scene'
      ? sceneHistoire(recit.curseur.id)?.titre ?? 'Les absents'
      : recit.curseur.type === 'duel' ? 'Un droit à défendre' : 'Douze noms, une porte',
  };
}
