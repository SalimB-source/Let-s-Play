// Les états visuels du Bouclier, rendus pour de vrai par `TableCard` : la
// Lance de givre dresse son égide, un coup partiellement absorbé laisse le
// bouclier en place, sa chute à zéro rejoue le choc qui l'a brisé, et le
// bouclier de lumière de Salem veille en or pâle.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const rendre = (entite, bouclierFx = null) => renderToStaticMarkup(
  <TableCard
    entite={{
      id: 'entite-bouclier',
      carteId: 'chien-du-guet',
      name: 'Chien du guet',
      atk: 3,
      def: 3,
      pv: 3,
      pvMax: 3,
      arme: { carteId: 'lance-de-givre', bouclier: 1 },
      envol: true,
      bouclier: 1,
      ready: true,
      ...entite,
    }}
    cote="joueur"
    tilt={0}
    bouclierFx={bouclierFx}
  />,
);

export function rendreCartesBouclier() {
  return {
    // La créature sans bouclier : ni égide, ni impact.
    neutre: rendre({ armes: [], arme: null, envol: false, bouclier: 0 }),
    // La Lance vient de s'attacher : +1/+1, Envol, et son égide qui veille.
    lance: rendre({}),
    // Un coup de 1 absorbé, 2 points restants : l'égide tient bon.
    impactPartiel: rendre({ bouclier: 2 }, { montant: 1, restant: 2, lumiere: false, token: 1 }),
    // Le point de la Lance vient d'être absorbé : l'égide est tombée, mais
    // le choc qui l'a brisée reste visible le temps de l'animation.
    impactBrise: rendre(
      { bouclier: 0, arme: { carteId: 'lance-de-givre', bouclier: 0 } },
      { montant: 1, restant: 0, lumiere: false, token: 2 },
    ),
    // Le bouclier de lumière de Salem : la même égide, teinte d'or.
    lumiere: rendre({
      id: 'entite-lumiere',
      carteId: 'salem',
      name: 'Salem',
      atk: 4,
      def: 3,
      pv: 3,
      pvMax: 3,
      armes: [],
      arme: null,
      envol: false,
      bouclier: 0,
      bouclierLumiere: true,
    }),
    // … puis touché : l'impact lumineux se brise, sans égide persistante.
    lumiereTouchee: rendre(
      {
        id: 'entite-lumiere-touchee',
        carteId: 'salem',
        name: 'Salem',
        atk: 4,
        def: 3,
        pv: 3,
        pvMax: 3,
        armes: [],
        arme: null,
        envol: false,
        bouclier: 0,
        bouclierLumiere: false,
      },
      { montant: 0, restant: 0, lumiere: true, token: 3 },
    ),
  };
}
