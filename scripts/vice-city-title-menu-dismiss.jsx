// Aide partagée des fumées jsdom de Vice City Rush : l'écran-titre s'ouvre
// désormais au montage de la page (comme pour un vrai joueur). Les fumées qui
// pilotent l'interface de préparation en dessous doivent d'abord le refermer,
// exactement comme un clic sur « COURSE RAPIDE » : on retombe sur le sélecteur
// des modes libres, la page par défaut d'avant l'écran-titre.
//
// Depuis que chaque entrée du menu est UNE PAGE (HISTOIRE, TOURNOIS, COURSE
// RAPIDE, GARAGE), une fumée qui veut les tournois ou la campagne doit le dire :
// `openHubPage` clique l'onglet de page, comme le ferait un joueur.
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

/** Ouvre une page du jeu par sa barre d'onglets : « HISTOIRE », « TOURNOIS »,
    « COURSE RAPIDE » ou « GARAGE » (le concessionnaire). */
export async function openHubPage(node, label) {
  const tab = [...node.querySelectorAll('.city-rush-page-tab')]
    .find((item) => item.textContent.toUpperCase().includes(label.toUpperCase()));
  if (!tab) throw new Error(`onglet de page « ${label} » introuvable dans la barre d'onglets`);
  await act(async () => { tab.click(); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  return tab;
}
