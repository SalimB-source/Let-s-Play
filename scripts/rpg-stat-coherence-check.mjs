// Compare les vrais styles des faces classique et MOBA dans Chromium.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const feuilles = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-story.css', 'rpg-deckbox.css', 'rpg-mana-essai.css', 'rpg-soins.css', 'rpg-vie-compteurs.css', 'rpg-avatars-plateau.css', 'effet-icons.css', 'rpg-moba.css'];
const css = (await Promise.all(feuilles.map((nom) => readFile(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')))).join('\n');
const navigateur = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
const pied = (etat) => `<footer class="rpg-card__foot" aria-label="Attaque 12, défense 8">
  <span class="rpg-card__stat--atk ${etat === 'bonus' ? 'is-buffed' : etat === 'malus' ? 'is-debuffed' : ''}"><svg class="rpg-stat-icon" data-stat-icon="attack"></svg><span class="rpg-stat-value">12</span></span>
  <span class="rpg-card__pt ${etat === 'blessee' ? 'is-wounded' : ''}"><svg class="rpg-stat-icon" data-stat-icon="defense"></svg><span class="rpg-stat-value">8</span></span>
</footer>`;
const statsMain = `<span class="rpg-hand__stats"><span class="rpg-hand__stat rpg-hand__stat--atk"><svg class="rpg-stat-icon" data-stat-icon="attack"></svg><span class="rpg-stat-value">12</span></span><span class="rpg-hand__stat rpg-hand__stat--def"><svg class="rpg-stat-icon" data-stat-icon="defense"></svg><span class="rpg-stat-value">8</span></span></span>`;
try {
  for (const [largeur, hauteur, touch] of [[568, 320, true], [844, 390, true], [390, 844, true], [1280, 720, false], [1920, 1080, false]]) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, isMobile: touch, hasTouch: touch });
    for (const taille of [44, 60, 120]) for (const etat of ['normal', 'bonus', 'malus', 'blessee']) {
      await page.setContent(`<style>${css}
        .test-face { position:relative!important; width:${taille}px!important; height:${taille * 1.25}px!important; min-width:0!important; min-height:0!important; flex:none!important; box-sizing:border-box!important; border:2px solid black!important; padding:0!important; transform:none!important; }
        .test-rangee { position:relative!important; display:block!important; width:300px!important; height:${taille * 1.25 + 5}px!important; top:auto!important; left:auto!important; right:auto!important; }
      </style>
      <div class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}" data-scene="duel"><div class="card-table"><div class="card-row test-rangee"><button id="duel" style="border:0!important;max-width:none!important" class="rpg-card rpg-card--img test-face ${etat === 'blessee' ? 'is-wounded' : ''}">${pied(etat)}</button></div><div class="rpg-hand-dock"><div class="rpg-hand"><button id="duel-main" style="border:0!important;max-width:none!important" class="rpg-hand__card rpg-hand__card--img rpg-hand__card--type-creature test-face">${statsMain}</button></div></div><div class="rpg-card-peek"><div id="duel-apercu" style="border:0!important;max-width:none!important" class="rpg-hover-card-preview__face test-face">${pied(etat)}</div></div><div class="rpg-mulligan"><button id="duel-mulligan" style="border:0!important;max-width:none!important" class="rpg-mulligan__card test-face">${pied(etat).replace('rpg-card__foot', 'rpg-card__foot rpg-mulligan__stats')}</button></div></div></div>
      <div class="rpg-battle rpg-battle--moba"><div class="moba"><div class="moba__slots"><div class="moba__real-slot"><button id="moba" style="border:0!important;max-width:none!important" class="rpg-card rpg-card--img test-face ${etat === 'blessee' ? 'is-wounded' : ''}">${pied(etat)}</button></div></div><div class="moba__hand"><button id="moba-main" style="border:0!important;max-width:none!important" class="rpg-hand__card rpg-hand__card--img moba__real-hand test-face">${statsMain}</button></div><div class="moba__preview-layer"><div id="moba-apercu" style="border:0!important;max-width:none!important" class="rpg-hover-card-preview__face test-face">${pied(etat)}</div></div><div class="moba__mulligan-overlay"><button id="moba-mulligan" style="border:0!important;max-width:none!important" class="rpg-mulligan__card test-face">${pied(etat).replace('rpg-card__foot', 'rpg-card__foot rpg-mulligan__stats')}</button></div></div></div>`);
      const mesures = await page.evaluate(() => Object.fromEntries(['duel', 'moba', 'duel-main', 'moba-main', 'duel-apercu', 'moba-apercu', 'duel-mulligan', 'moba-mulligan'].map((id) => {
        const face = document.getElementById(id), faceRect = face.getBoundingClientRect();
        const groupe = face.querySelector('.rpg-card__foot, .rpg-hand__stats');
        const style = (el) => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return { x: r.left - faceRect.left, y: r.top - faceRect.top, width: r.width, height: r.height,
            font: s.fontSize, color: s.color, background: s.backgroundColor, image: s.backgroundImage,
            border: s.borderColor, gap: s.gap, padding: s.padding, icon: el.querySelector('.rpg-stat-icon')?.getBoundingClientRect().width };
        };
        return [id, { groupe: style(groupe), stats: [...groupe.children].map(style) }];
      })));
      for (const [a, b] of [['duel', 'moba'], ['duel-main', 'moba-main'], ['duel-apercu', 'moba-apercu'], ['duel-mulligan', 'moba-mulligan']]) {
        for (const [i, [x, y]] of mesures[a].stats.map((v, n) => [v, mesures[b].stats[n]]).entries()) {
          for (const prop of ['x', 'y', 'width', 'height', 'icon']) assert.ok(Math.abs(x[prop] - y[prop]) < .2, `${largeur}×${hauteur} ${taille}px ${etat} ${a} stat ${i} ${prop} : ${x[prop]} ≠ ${y[prop]}`);
          for (const prop of ['font', 'color', 'background', 'image', 'border', 'gap', 'padding']) assert.equal(x[prop], y[prop], `${largeur}×${hauteur} ${taille}px ${etat} ${a} stat ${i} ${prop}`);
          assert.ok(x.x >= 0 && x.y >= 0 && x.x + x.width <= taille + 0.2 && x.y + x.height <= taille * 1.25 + 0.2, `${a} : stat dans la carte`);
        }
      }
      const [attaque, defense] = mesures.duel.stats;
      if (touch) assert.ok(attaque.y + attaque.height <= defense.y + .2, 'en mobile, attaque au-dessus de défense');
      else assert.ok(attaque.x + attaque.width <= defense.x + .2, 'sur PC, les deux valeurs restent côte à côte');
    }
    await page.close();
    console.log(`${largeur}×${hauteur} : statistiques du duel et du MOBA cohérentes`);
  }
} finally { await navigateur.close(); }
