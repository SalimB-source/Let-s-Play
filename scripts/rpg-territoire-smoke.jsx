import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';

// Vrais rendus successifs de la page, par la même entrée que les mises à jour
// réseau : dégâts, soin, avantage adverse, abandon, nul et nouveau duel.
export async function checkTerritoire(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  let root = createRoot(container);
  let seq = 0;
  const initial = rpgNouveauDuel({ pvp: true, rng: () => .1 });
  const decks = { joueur: { id: 'serment-du-soleil-rouge' }, sorcier: { id: 'cour-des-djinns' } };
  async function rendre(j, s, resultat = null, memesTerrains = false) {
    const vue = structuredClone(initial);
    vue.joueur.pv = j;
    vue.sorcier.pv = s;
    await act(async () => {
      root.render(<RpgDuelPage pvp={{
        vue, seq: ++seq, decks: memesTerrains ? { ...decks, sorcier: decks.joueur } : decks,
        statut: resultat ? 'terminee' : 'en_cours', resultat,
      }} />);
    });
    return container.querySelector('.card-table');
  }
  const verifier = (table, part, frontiere, dominant) => {
    assert.ok(table);
    assert.equal(table.dataset.territoireJoueur, String(part));
    assert.equal(table.style.getPropertyValue('--rpg-frontiere'), `${frontiere}%`);
    assert.equal(table.dataset.territoireDominant, dominant);
    assert.ok(table.getAttribute('aria-label').includes(`territoire joueur ${part} %`));
  };
  try {
    let table = await rendre(25, 25);
    verifier(table, 50, 50, 'neutre');
    assert.equal(table.dataset.plateauJoueur, 'cour-de-l-empereur');
    assert.equal(table.dataset.plateauAdversaire, 'table-des-heures');
    const joueur = table.querySelector('.rpg-plateau-moitie--joueur');
    const adverse = table.querySelector('.rpg-plateau-moitie--adverse');
    assert.equal(joueur.nextElementSibling, adverse, 'le terrain adverse se peint au-dessus du joueur');
    assert.ok(table.querySelector('.rpg-plateau-lisere'), 'le trait doré marque la frontière des plateaux');
    const champ = table.querySelector('.rpg-hand');
    table = await rendre(25, 15);
    verifier(table, 65, 35, 'joueur');
    assert.equal(table.querySelector('.rpg-plateau-moitie--joueur'), joueur, 'pas de remontage du décor');
    assert.equal(table.querySelector('.rpg-hand'), champ, 'pas de remontage de la main');
    verifier(await rendre(25, 25), 50, 50, 'neutre');
    verifier(await rendre(10, 25), 27.5, 72.5, 'sorcier');
    verifier(await rendre(200, 25), 80, 20, 'joueur');
    table = await rendre(25, 25, 'gagne');
    verifier(table, 100, 0, 'joueur');
    assert.equal(table.dataset.territoireTermine, 'true');
    verifier(await rendre(25, 25, 'perdu'), 0, 100, 'sorcier');
    verifier(await rendre(0, 0, 'nul'), 50, 50, 'neutre');
    table = await rendre(25, 15, null, true);
    assert.equal(table.classList.contains('card-table--decoupee'), false, 'même décor : pas de couture artificielle');
    assert.equal(table.querySelector('.rpg-plateau-moitie'), null);
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(<RpgDuelPage pvp={{ vue: initial, seq: 0, decks, statut: 'en_cours' }} />); });
    verifier(container.querySelector('.card-table'), 50, 50, 'neutre');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
