// Les états visuels du Bouclier, rendus pour de vrai par `TableCard` et par
// l'aperçu : le Guerrier dresse son égide d'arrivée, la Parade laisse un
// bouclier partiellement entamé en place, sa chute à zéro rejoue le choc qui
// l'a brisé, et le bouclier de lumière de Salem veille en or pâle. La Lance de
// givre, elle, donne désormais +1/+0 et Coup rapide — jamais de bouclier.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

void RpgDuelPage;

const rendreTable = (entite, bouclierFx = null) => renderToStaticMarkup(
  <TableCard
    entite={{
      id: 'entite-bouclier',
      carteId: 'chien-du-guet',
      name: 'Chien du guet',
      atk: 2,
      def: 2,
      pv: 2,
      pvMax: 2,
      armes: [],
      arme: null,
      envol: false,
      bouclier: 0,
      bouclierLumiere: false,
      bouclierEpuise: false,
      tenaciteDisponible: false,
      ready: true,
      ...entite,
    }}
    cote="joueur"
    tilt={0}
    bouclierFx={bouclierFx}
  />,
);

const guerrier = (entite = {}) => ({
  id: 'entite-guerrier',
  carteId: 'guerrier-au-bouclier-rond',
  name: 'Guerrier au bouclier rond',
  atk: 1,
  def: 3,
  pv: 3,
  pvMax: 3,
  ...entite,
});

const Salem = (entite = {}) => ({
  id: 'entite-lumiere',
  carteId: 'salem',
  name: 'SALEM',
  atk: 4,
  def: 3,
  pv: 3,
  pvMax: 3,
  ...entite,
});

export function rendreCartesBouclier() {
  return {
    // La créature sans bouclier : ni égide, ni impact.
    neutre: rendreTable({}),
    // Le bouclier d'arrivée du Guerrier : un point, encore debout.
    guerrier: rendreTable(guerrier({ bouclier: 1 })),
    // La Lance équipe et donne Coup rapide à son porteur, sans dresser d'égide.
    lanceSansBouclier: rendreTable({
      arme: { carteId: 'lance-de-givre' },
      coupRapide: true,
      bouclier: 0,
    }),
    // Un coup de 1 absorbé par une Parade, 2 points restants : ça tient.
    impactPartiel: rendreTable(
      { bouclier: 2 },
      { montant: 1, restant: 2, lumiere: false, token: 1 },
    ),
    // Le point du Guerrier vient d'être absorbé : l'égide est tombée, mais
    // le choc qui l'a brisée reste visible le temps de l'animation.
    impactBrise: rendreTable(
      guerrier({ bouclier: 0, bouclierEpuise: true }),
      { montant: 1, restant: 0, lumiere: false, token: 2 },
    ),
    // Le bouclier de lumière de Salem : la même égide, teinte d'or.
    lumiere: rendreTable(Salem({ bouclierLumiere: true })),
    // … puis touché : l'impact lumineux se brise, sans égide persistante.
    lumiereTouchee: rendreTable(
      Salem({ id: 'entite-lumiere-touchee', bouclierLumiere: false, bouclierEpuise: true }),
      { montant: 0, restant: 0, lumiere: true, token: 3 },
    ),
  };
}

const rendreApercu = (carteId, effetsEpuises = []) => renderToStaticMarkup(
  <HoverCardPreview
    carte={cardById(carteId)}
    variante="catalogue"
    effetsEpuises={effetsEpuises}
  />,
);

export function rendreApercusEffetsEpuises() {
  return {
    guerrierActif: rendreApercu('guerrier-au-bouclier-rond'),
    guerrierEpuise: rendreApercu('guerrier-au-bouclier-rond', ['bouclier']),
    maitreEpuise: rendreApercu('maitre-du-marteau', ['tenacite']),
    salemEpuise: rendreApercu('salem', ['bouclier']),
  };
}
