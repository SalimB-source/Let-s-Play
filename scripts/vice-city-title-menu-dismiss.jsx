// Aide partagée des fumées jsdom de Vice City Rush : l'écran-titre s'ouvre
// désormais au montage de la page (comme pour un vrai joueur). Les fumées qui
// pilotent l'interface de préparation en dessous doivent d'abord le refermer,
// exactement comme le ferait un clic sur « COURSE RAPIDE » : on retombe sur le
// sélecteur de modes, l'état par défaut d'avant l'écran-titre.
import { act } from 'react';

export async function dismissTitleMenu(node) {
  const menu = node.querySelector('.vcr-menu');
  if (!menu) return;
  const raceEntry = [...menu.querySelectorAll('.vcr-entry')][2];
  if (!raceEntry) throw new Error('entrée « COURSE RAPIDE » introuvable dans l’écran-titre');
  await act(async () => { raceEntry.click(); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  if (node.querySelector('.vcr-menu')) throw new Error('l’écran-titre ne s’est pas refermé après le choix d’un mode');
}
