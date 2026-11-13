// Vérification de géométrie dans Chromium (un navigateur Playwright doit être
// installé, ou RPG_TEST_CHROMIUM doit pointer vers un exécutable compatible).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const feuilles = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-story.css', 'rpg-deckbox.css', 'rpg-mana-essai.css', 'rpg-soins.css', 'rpg-vie-compteurs.css', 'rpg-avatars-plateau.css'];
const css = (await Promise.all(feuilles.map((nom) => readFile(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')))).join('\n');
const executablePath = process.env.RPG_TEST_CHROMIUM || undefined;
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  for (const [largeur, hauteur] of [[640, 280], [568, 320], [800, 355], [844, 390], [1024, 600]]) {
    await page.setViewportSize({ width: largeur, height: hauteur });
    for (const mode of ['essai', 'terrains']) {
      await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
        <div class="rpg-battle rpg-battle--touch" data-scene="duel" ${mode === 'essai' ? 'data-mode-mana="essai"' : ''}>
          <div class="card-table">
            <div class="rpg-hidden-hand"><div class="rpg-hidden-hand__cards"><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span></div><span class="rpg-hidden-hand__count">Main adverse · 7</span></div>
            <button class="rpg-wizard-plate rpg-wizard-plate--ennemi"><span class="rpg-wizard-plate__avatar" data-scene-avatar="ennemi"></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span></span></button>
            <div class="card-row card-row--ennemi"><button class="rpg-card" style="--case-essai:3" data-entity-id="enemy">Adversaire</button></div>
            <div class="card-row card-row--equipe"><button class="rpg-card" style="--case-essai:3" data-entity-id="test">Créature</button></div>
            <div class="rpg-wizard-plate rpg-wizard-plate--joueur"><span class="rpg-wizard-plate__avatar" data-scene-avatar="joueur"></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span></span></div>
            <div class="rpg-hand-dock"><div class="rpg-hand"><button class="rpg-hand__card">Carte</button></div></div>
          </div>
        </div>`);
      const mesures = await page.evaluate(() => {
        const mesurer = (selecteur) => {
          const el = document.querySelector(selecteur);
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, center: (rect.left + rect.right) / 2, grid: style.gridArea };
        };
        return {
          table: mesurer('.card-table'), ennemi: mesurer('.rpg-wizard-plate--ennemi'), joueur: mesurer('.rpg-wizard-plate--joueur'),
          ennemiCreature: mesurer('.card-row--ennemi .rpg-card'), vieEnnemi: mesurer('.rpg-wizard-plate--ennemi .rpg-jauge-vie__rond'), champEnnemi: mesurer('.card-row--ennemi'), champJoueur: mesurer('.card-row--equipe'), creature: mesurer('.card-row--equipe .rpg-card'), mainAdverse: mesurer('.rpg-hidden-hand__cards'), vieJoueur: mesurer('.rpg-wizard-plate--joueur .rpg-jauge-vie__rond'), mainJoueur: mesurer('.rpg-hand__card'),
        };
      });
      assert.equal(mesures.ennemi.grid, 'auto', 'avatar adverse : ne pas utiliser la cellule de gauche');
      assert.equal(mesures.joueur.grid, 'player-avatar', 'avatar du joueur dans sa bande réservée');
      for (const [avatar, champ] of [[mesures.ennemi, mesures.champEnnemi], [mesures.joueur, mesures.champJoueur]]) {
        assert.ok(Math.abs(avatar.center - champ.center) < 2, `${largeur}×${hauteur} ${mode} : avatar centré sur son champ`);
        assert.ok(avatar.left >= mesures.table.left && avatar.right <= mesures.table.right, 'avatar entièrement dans la table');
      }
      assert.ok(mesures.ennemi.top < mesures.champEnnemi.top, 'avatar adverse derrière ses créatures');
      assert.ok(mesures.ennemiCreature.top >= mesures.vieEnnemi.bottom - 1, 'les PV adverses ne sont pas cachés par la créature');
      assert.ok(mesures.ennemiCreature.bottom <= mesures.creature.top + 1, 'les créatures des deux camps ne se chevauchent pas');
      assert.ok(mesures.joueur.top >= mesures.creature.bottom - 1, 'la créature centrale ne recouvre pas l’avatar');
      assert.ok(mesures.vieJoueur.top >= mesures.creature.bottom - 1, 'les PV du joueur ne sont pas cachés par la créature');
      assert.ok(mesures.mainJoueur.top >= mesures.vieJoueur.bottom, 'la main ne couvre pas les PV du joueur');
      assert.ok(mesures.mainJoueur.right - mesures.mainJoueur.left >= 44, 'une carte seule reste une cible tactile de 44 px');
      assert.ok(mesures.mainAdverse.right <= mesures.ennemi.left + 1, 'les cartes adverses ne recouvrent pas l’avatar');
      const cible = await page.evaluate(() => {
        const avatar = document.querySelector('.rpg-wizard-plate--ennemi');
        const r = avatar.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(15, r.height / 4))?.closest('.rpg-wizard-plate--ennemi') === avatar;
      });
      assert.ok(cible, `${largeur}×${hauteur} ${mode} : avatar adverse accessible au toucher`);
      for (const nombre of [4, 7, 12]) {
        const cartes = await page.evaluate((count) => {
          const main = document.querySelector('.rpg-hand');
          main.style.setProperty('--hand-count', count);
          main.innerHTML = Array.from({ length: count }, (_, index) => index === 1
            ? '<span class="rpg-hand__pile"><button class="rpg-hand__card">Carte en pile</button></span>'
            : `<button class="rpg-hand__card">Carte ${index}</button>`).join('');
          return [...main.querySelectorAll('.rpg-hand__card')].map((carte) => {
            const r = carte.getBoundingClientRect();
            const cible = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, accessible: carte.contains(cible) };
          });
        }, nombre);
        assert.equal(cartes.length, nombre);
        for (const carte of cartes) {
          assert.ok(carte.left >= -1 && carte.right <= largeur + 1 && carte.top >= 0 && carte.bottom <= hauteur + 1, `${nombre} cartes : toute la main reste visible`);
          assert.ok(carte.accessible, `${nombre} cartes : chaque carte reste accessible au doigt`);
        }
      }
      console.log(`${largeur}×${hauteur}, ${mode} : avatars centrés et cible accessible`);
    }
  }
  await context.close();
} finally {
  await browser.close();
}
