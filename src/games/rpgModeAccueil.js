import { tourEstTerminee } from './rpgStory.js';
import { RPG_STORY_TOURS } from './rpgStoryTours.js';
import { resumeRecitHistoire } from './rpgStoryFlow.js';

/** Les indications de l'accueil sont dérivées de la progression réelle. */
export function rpgIndicationsModes(progression, { hasGame = false, campagneEnCours = false } = {}) {
  const recit = progression?.recit;
  const resume = recit ? resumeRecitHistoire(recit) : null;
  const toursTerminees = RPG_STORY_TOURS.filter((tour) => tourEstTerminee(tour.id, progression)).length;
  return {
    histoire: hasGame && campagneEnCours ? 'Duel de campagne en cours'
      : resume ? `Acte ${resume.acte.romain} · ${resume.titre}` : 'Une aventure à découvrir',
    reprendreHistoire: Boolean(hasGame && campagneEnCours),
    conquete: `${toursTerminees} / ${RPG_STORY_TOURS.length} tours conquises`,
  };
}
