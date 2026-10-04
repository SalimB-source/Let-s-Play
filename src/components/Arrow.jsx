import React from 'react';

/**
 * La flèche « ↗ » des liens d'action du site.
 *
 * Elle vivait dans `src/components/ReleasesCalendar.jsx`, avec le calendrier
 * des sorties et ses données. Or la page d'accueil l'utilise une quinzaine de
 * fois (héros, actus, reels, formats, pied de page) : importer le calendrier
 * pour une flèche tirait `src/releasesData.js` dans le paquet d'entrée. Elle a
 * donc son propre fichier, sans dépendance — `ReleasesCalendar` la ré-exporte
 * pour ne rien changer à ses consommateurs.
 */
export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
