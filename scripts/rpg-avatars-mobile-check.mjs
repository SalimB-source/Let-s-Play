// Vérification de géométrie dans Chromium (un navigateur Playwright doit être
// installé, ou RPG_TEST_CHROMIUM doit pointer vers un exécutable compatible).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const feuilles = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-story.css', 'rpg-deckbox.css', 'rpg-mana-essai.css', 'rpg-soins.css', 'rpg-vie-compteurs.css', 'rpg-avatars-plateau.css'];
const css = (await Promise.all(feuilles.map((nom) => readFile(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')))).join('\n');
const imagesVisages = Object.fromEntries(await Promise.all(['salem', 'ifrit-ergs'].map(async (nom) => [
  nom, `data:image/webp;base64,${(await readFile(new URL(`../public/sablier-story/avatars/avatar-${nom}.webp`, import.meta.url))).toString('base64')}`,
])));
const executablePath = process.env.RPG_TEST_CHROMIUM || undefined;
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
try {
  for (const [largeur, hauteur, touch] of [[640, 280, true], [568, 320, true], [800, 355, true], [844, 390, true], [1024, 600, true], [1280, 720, false], [1920, 1080, false]]) {
    const context = await browser.newContext({ viewport: { width: largeur, height: hauteur }, isMobile: touch, hasTouch: touch });
    const page = await context.newPage();
    for (const mode of ['essai', 'terrains']) {
      await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
        <div class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}" data-scene="duel" ${mode === 'essai' ? 'data-mode-mana="essai"' : ''}>
          <div class="card-table card-table--decoupee"><div class="rpg-plateau-lisere"></div>
            <div class="rpg-hidden-hand"><div class="rpg-hidden-hand__cards"><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span></div><span class="rpg-hidden-hand__count">Main adverse · 7</span></div>
            <button class="rpg-wizard-plate rpg-wizard-plate--ennemi"><span class="rpg-wizard-plate__avatar" data-scene-avatar="ennemi"><img src="${imagesVisages['ifrit-ergs']}" alt=""></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span></span></button>
            <div class="card-row card-row--ennemi">${mode === 'essai' ? `<div class="rpg-creature-slots rpg-creature-slots--ennemi">${Array.from({length: 5}, (_, i) => `<span class="rpg-creature-slot" data-creature-slot="${i+1}"></span>`).join('')}</div>` : ''}<button class="rpg-card" style="--case-essai:3" data-entity-id="enemy">Adversaire</button></div>
            <div class="card-row card-row--equipe">${mode === 'essai' ? `<div class="rpg-creature-slots rpg-creature-slots--joueur">${Array.from({length: 5}, (_, i) => `<button class="rpg-creature-slot is-empty rpg-creature-slot--choix" data-creature-slot="${i+1}"></button>`).join('')}</div>` : ''}<button class="rpg-card" style="--case-essai:3" data-entity-id="test">Créature</button></div>
            <div class="rpg-wizard-plate rpg-wizard-plate--joueur"><span class="rpg-wizard-plate__avatar" data-scene-avatar="joueur"><img src="${imagesVisages.salem}" alt=""></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span></span></div>
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
          ligne: mesurer('.rpg-plateau-lisere'), slots: [...document.querySelectorAll('.rpg-creature-slots--joueur .rpg-creature-slot')].map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }), table: mesurer('.card-table'), ennemi: mesurer('.rpg-wizard-plate--ennemi'), joueur: mesurer('.rpg-wizard-plate--joueur'),
          ennemiCreature: mesurer('.card-row--ennemi .rpg-card'), vieEnnemi: mesurer('.rpg-wizard-plate--ennemi .rpg-jauge-vie__rond'), champEnnemi: mesurer('.card-row--ennemi'), champJoueur: mesurer('.card-row--equipe'), creature: mesurer('.card-row--equipe .rpg-card'), mainAdverse: mesurer('.rpg-hidden-hand__cards'), vieJoueur: mesurer('.rpg-wizard-plate--joueur .rpg-jauge-vie__rond'), mainJoueur: mesurer('.rpg-hand__card'),
        };
      });
      if (touch) assert.equal(mesures.ennemi.grid, 'auto', 'avatar adverse : ne pas utiliser la cellule de gauche');
      if (touch) assert.equal(mesures.joueur.grid, 'auto', 'avatar joueur centré sur la table');
      assert.ok(mesures.creature.top >= mesures.ligne.top + 1, `${largeur}×${hauteur} : créature sous la ligne`);
      for (const slot of mesures.slots) assert.ok(slot.top >= mesures.ligne.top + 1, `${largeur}×${hauteur} : emplacement sous la ligne`);
      for (const [avatar, champ] of [[mesures.ennemi, mesures.champEnnemi], [mesures.joueur, mesures.champJoueur]]) {
        assert.ok(Math.abs(avatar.center - champ.center) < 2, `${largeur}×${hauteur} ${mode} : avatar centré sur son champ`);
        assert.ok(avatar.left >= mesures.table.left && avatar.right <= mesures.table.right, 'avatar entièrement dans la table');
      }
      assert.ok(mesures.ennemi.top < mesures.champEnnemi.top, 'avatar adverse derrière ses créatures');
      assert.ok(mesures.ennemiCreature.top >= mesures.vieEnnemi.bottom - 1, 'les PV adverses ne sont pas cachés par la créature');
      assert.ok(mesures.ennemiCreature.bottom <= mesures.creature.top + 1, 'les créatures des deux camps ne se chevauchent pas');
      assert.ok(mesures.joueur.top >= mesures.creature.bottom - 1, 'la créature centrale ne recouvre pas l’avatar');
      assert.ok(mesures.vieJoueur.top >= mesures.creature.bottom - 1, 'les PV du joueur ne sont pas cachés par la créature');
      assert.ok(mesures.vieJoueur.top >= mesures.joueur.bottom - 1 && Math.abs(mesures.vieJoueur.center - mesures.joueur.center) < 2, 'PV centrés sous le visage du joueur');
      assert.ok(mesures.vieJoueur.bottom <= mesures.table.bottom, 'PV du joueur dans la table');
      assert.ok(mesures.vieEnnemi.top >= mesures.ennemi.bottom - 1 && Math.abs(mesures.vieEnnemi.center - mesures.ennemi.center) < 2, 'PV centrés sous le visage adverse');
      assert.ok(mesures.mainJoueur.right <= mesures.joueur.left, 'la main ne couvre pas le joueur');
      assert.ok(mesures.mainJoueur.left >= mesures.table.left + 12, 'la main commence légèrement à droite du bord');
      assert.ok(!touch || mesures.mainJoueur.right - mesures.mainJoueur.left >= 44, 'une carte seule reste une cible tactile de 44 px');
      assert.ok(mesures.mainAdverse.right <= mesures.ennemi.left + 1, 'les cartes adverses ne recouvrent pas l’avatar');
      const cible = await page.evaluate(() => {
        const avatar = document.querySelector('.rpg-wizard-plate--ennemi');
        const r = avatar.getBoundingClientRect();
        const vie = avatar.querySelector('.rpg-jauge-vie__rond').getBoundingClientRect();
        const teteCible = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(15, r.height / 4))?.closest('.rpg-wizard-plate--ennemi') === avatar;
        const vieCible = document.elementFromPoint(vie.left + vie.width / 2, vie.top + vie.height / 2)?.closest('.rpg-wizard-plate--ennemi') === avatar;
        return teteCible && vieCible && [...document.querySelectorAll('[data-scene-avatar] img')].every((img) => img.complete && img.naturalWidth === 192);
      });
      assert.ok(cible, `${largeur}×${hauteur} ${mode} : avatar adverse accessible au toucher`);
      if (mode === 'essai') {
        const choix = await page.evaluate(() => {
          const slot = document.querySelector('.rpg-creature-slots--joueur [data-creature-slot="1"]');
          const r = slot.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === slot;
        });
        assert.ok(choix, 'une case libre reste sélectionnable');
      }

      if (touch) for (const nombre of [4, 7, 12]) {
        const result = await page.evaluate(async (count) => {
          const main = document.querySelector('.rpg-hand');
          main.style.setProperty('--hand-count', count);
          main.innerHTML = Array.from({ length: count }, (_, index) => index === 1
            ? '<span class="rpg-hand__pile"><button class="rpg-hand__card">Carte en pile</button></span>'
            : `<button class="rpg-hand__card">Carte ${index}</button>`).join('');
          const cartes = [...main.querySelectorAll('.rpg-hand__card')];
          const resultat = [];
          for (const carte of cartes) {
            carte.scrollIntoView({block: 'nearest', inline: 'center'});
            await new Promise(requestAnimationFrame);
            const r = carte.getBoundingClientRect();
            const cible = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            resultat.push({width: r.width, accessible: carte.contains(cible)});
          }
          return resultat;
        }, nombre);
        assert.equal(result.length, nombre);
        for (const carte of result) {
          assert.ok(carte.width >= 44, `${nombre} cartes : taille tactile`);
          assert.ok(carte.accessible, `${nombre} cartes : chaque carte est accessible par défilement`);
        }
      }
      if (!touch) for (const nombre of [7, 12]) {
        const cartes = await page.evaluate((count) => {
          const main = document.querySelector('.rpg-hand');
          main.style.setProperty('--hand-count', count);
          main.innerHTML = Array.from({ length: count }, (_, index) => index === 1
            ? '<span class="rpg-hand__pile"><button class="rpg-hand__card">Carte en pile</button></span>'
            : `<button class="rpg-hand__card">Carte ${index}</button>`).join('');
          return [...main.querySelectorAll('.rpg-hand__card')].map(el => {
            const r = el.getBoundingClientRect();
            const cible = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { right: r.right, accessible: el.contains(cible) };
          });
        }, nombre);
        for (const carte of cartes) {
          assert.ok(carte.right < mesures.joueur.left, `${nombre} cartes : la main reste à gauche du visage`);
          assert.ok(carte.accessible, `${nombre} cartes : chaque carte reste accessible à la souris`);
        }
      }
      // Le territoire continue d'animer la frontière sans déplacer les cases.
      const mouvement = await page.evaluate(() => {
        const table = document.querySelector('.card-table');
        table.style.transition = 'none';
        const carte = document.querySelector('.card-row--equipe .rpg-card');
        const avant = carte.getBoundingClientRect().top;
        table.style.setProperty('--rpg-frontiere', '70%');
        return { avant, apres: carte.getBoundingClientRect().top, ligne: document.querySelector('.rpg-plateau-lisere').getBoundingClientRect().top, hauteur: table.getBoundingClientRect().height };
      });
      assert.equal(mouvement.avant, mouvement.apres, 'la frontière mobile ne déplace pas les cartes');
      assert.ok(Math.abs(mouvement.ligne - (mouvement.hauteur * .7 - 1)) < 1, 'la ligne suit le territoire');
      console.log(`${largeur}×${hauteur}, ${mode} : cases, avatars et cible vérifiés`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
