import { lireProgression, ecrireProgression } from '../lib/progressionScope.js';
import { RPG_STORY_TOURS, tourHistoireParId } from './rpgStoryTours.js';
import { resumeTourHistoire, tourEstDebloquee, tourEstTerminee } from './rpgStory.js';
import { gainsDeTour } from './rpgCredits.js';

const CLE_DERNIERE_TOUR = 'letsplay_sablier_derniere_tour_v1';
export function lireDerniereTour() {
  const id = lireProgression(CLE_DERNIERE_TOUR);
  return tourHistoireParId(id)?.id ?? null;
}
export function enregistrerDerniereTour(id) {
  if (!tourHistoireParId(id)) return false;
  return ecrireProgression(CLE_DERNIERE_TOUR, id);
}
export function resumeConquete(progression, portefeuille) {
  const tours = RPG_STORY_TOURS.map((tour) => {
    const resume = resumeTourHistoire(tour.id, progression);
    return { tour, resume, ouverte: tourEstDebloquee(progression, tour.id),
      terminee: tourEstTerminee(tour.id, progression),
      gains: gainsDeTour(tour.id, { etagesVaincus: progression?.etagesVaincus, toursPayees: portefeuille?.toursPayees }) };
  });
  return { tours, etages: tours.reduce((n, t) => n + t.resume.vaincus, 0),
    totalEtages: tours.reduce((n, t) => n + t.resume.total, 0),
    terminees: tours.filter((t) => t.terminee).length,
    gains: tours.reduce((n, t) => n + (t.gains?.dejaGagne ?? 0), 0) };
}
export function tourCorrespondFiltre(tour, filtre) {
  if (filtre === 'en-cours') return tour.ouverte && !tour.terminee && tour.resume.vaincus > 0;
  if (filtre === 'disponibles') return tour.ouverte && !tour.terminee;
  if (filtre === 'terminees') return tour.terminee;
  return true;
}
