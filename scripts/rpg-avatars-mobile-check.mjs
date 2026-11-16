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
  for (const [largeur, hauteur, touch] of [[640, 280, true], [568, 320, true], [800, 355, true], [844, 390, true], [1024, 600, true], [1024, 500, false], [1024, 768, false], [1280, 720, false], [1568, 882, false], [1920, 1080, false]]) {
    const context = await browser.newContext({ viewport: { width: largeur, height: hauteur }, isMobile: touch, hasTouch: touch });
    const page = await context.newPage();
    for (const mode of ['essai', 'terrains']) {
      await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
        <div class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}" data-scene="duel" ${mode === 'essai' ? 'data-mode-mana="essai"' : ''}>
          <div class="card-table card-table--decoupee"><div class="rpg-plateau-lisere"></div>
            <div class="rpg-hidden-hand"><div class="rpg-hidden-hand__cards"><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span><span class="rpg-hidden-hand__card"></span></div><span class="rpg-hidden-hand__count">Main adverse · 7</span></div>
            <button class="rpg-wizard-plate rpg-wizard-plate--ennemi"><span class="rpg-wizard-plate__avatar" data-scene-avatar="ennemi"><img src="${imagesVisages['ifrit-ergs']}" alt=""></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span><span class="rpg-wizard-plate__hp-icon--heart">♥</span></span></button>
            <div class="card-row card-row--ennemi">${mode === 'essai' ? `<div class="rpg-creature-slots rpg-creature-slots--ennemi">${Array.from({length: 5}, (_, i) => `<span class="rpg-creature-slot" data-creature-slot="${i+1}"></span>`).join('')}</div>` : ''}<button class="rpg-card" style="--case-essai:3" data-entity-id="enemy">Adversaire</button></div>
            <div class="card-row card-row--equipe">${mode === 'essai' ? `<div class="rpg-creature-slots rpg-creature-slots--joueur">${Array.from({length: 5}, (_, i) => `<button class="rpg-creature-slot is-empty rpg-creature-slot--choix" data-creature-slot="${i+1}"></button>`).join('')}</div>` : ''}<button class="rpg-card" style="--case-essai:3" data-entity-id="test">Créature</button></div>
            <div class="rpg-wizard-plate rpg-wizard-plate--joueur"><span class="rpg-wizard-plate__avatar" data-scene-avatar="joueur"><img src="${imagesVisages.salem}" alt=""></span><span class="rpg-wizard-plate__pv rpg-jauge-vie"><span class="rpg-jauge-vie__rond">25</span><span class="rpg-wizard-plate__hp-icon--heart">♥</span></span></div>
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
          ligne: mesurer('.rpg-plateau-lisere'), slotsEnnemis: [...document.querySelectorAll('.rpg-creature-slots--ennemi .rpg-creature-slot')].map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }), slots: [...document.querySelectorAll('.rpg-creature-slots--joueur .rpg-creature-slot')].map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }), table: mesurer('.card-table'), ennemi: mesurer('.rpg-wizard-plate--ennemi'), joueur: mesurer('.rpg-wizard-plate--joueur'),
          ennemiCreature: mesurer('.card-row--ennemi .rpg-card'), vieEnnemi: mesurer('.rpg-wizard-plate--ennemi .rpg-jauge-vie__rond'), champEnnemi: mesurer('.card-row--ennemi'), champJoueur: mesurer('.card-row--equipe'), creature: mesurer('.card-row--equipe .rpg-card'), mainAdverse: mesurer('.rpg-hidden-hand__cards'), vieJoueur: mesurer('.rpg-wizard-plate--joueur .rpg-jauge-vie__rond'), mainJoueur: mesurer('.rpg-hand__card'),
        };
      });
      for (const side of ['joueur', 'ennemi']) {
        const decor = await page.evaluate((cote) => {
          const avatar = document.querySelector(`.rpg-wizard-plate--${cote} .rpg-wizard-plate__avatar`);
          const cadre = getComputedStyle(avatar, '::before');
          const ornements = getComputedStyle(avatar, '::after');
          const portrait = avatar.querySelector('img');
          const image = getComputedStyle(portrait);
          const imageRect = portrait.getBoundingClientRect();
          const rect = avatar.getBoundingClientRect();
          const diametre = parseFloat(cadre.width);
          const cercle = { left: rect.left + (rect.width - diametre) / 2, right: rect.left + (rect.width + diametre) / 2,
            bottom: rect.bottom - parseFloat(cadre.bottom), top: rect.bottom - parseFloat(cadre.bottom) - diametre };
          return { contenu: cadre.content, rayon: cadre.borderRadius, diametre,
            imageDansCercle: imageRect.left >= cercle.left && imageRect.right <= cercle.right && imageRect.top >= cercle.top && imageRect.bottom <= cercle.bottom,
            couleur: cadre.borderTopColor, fond: cadre.backgroundColor, overflow: getComputedStyle(avatar).overflow,
            imageZ: Number(image.zIndex), imagePosition: image.objectPosition, imageRayon: image.borderRadius, masque: image.maskImage,
            coeur: getComputedStyle(avatar.parentElement.querySelector('.rpg-wizard-plate__hp-icon--heart')).display,
            vie: getComputedStyle(avatar.parentElement.querySelector('.rpg-jauge-vie__rond')).display, largeur: rect.width,
            ancienneLargeur: avatar.closest('.rpg-battle').classList.contains('rpg-battle--touch')
              ? Math.min(82, Math.max(48, Math.min(104, Math.max(44, innerHeight * .1555)) * 1.03))
              : Math.min(116, Math.max(70, innerWidth * .088)),
            cadreZ: Number(cadre.zIndex), touches: cadre.pointerEvents,
            ornements: ornements.backgroundImage, touchesOrnements: ornements.pointerEvents };
        }, side);
        assert.equal(decor.contenu, '""', `${side} : médaillon présent`);
        assert.equal(decor.rayon, '50%', `${side} : médaillon rond`);
        assert.ok(decor.diametre > 0 && decor.imageZ > decor.cadreZ && decor.imageDansCercle, `${side} : le portrait tient à l’intérieur du cercle`);
        assert.equal(decor.couleur, 'rgb(215, 173, 97)', `${side} : cercle doré`);
        assert.equal(decor.fond, 'rgb(215, 173, 97)', `${side} : rond doré rempli complètement, sans transparence`);
        assert.equal(decor.overflow, 'visible', `${side} : le cadre et ses ornements restent visibles`);
        assert.equal(decor.imageRayon, '50%', `${side} : le portrait est rogné en cercle`);
        assert.equal(decor.masque, 'none', `${side} : aucune fenêtre ne laisse dépasser la tête`);
        assert.ok(decor.largeur > decor.ancienneLargeur, `${side} : avatar plus grand qu’avant`);
        assert.equal(decor.coeur, 'none', `${side} : cœur décoratif retiré`);
        assert.notEqual(decor.vie, 'none', `${side} : compteur de vie conservé`);
        assert.equal(decor.imagePosition, '50% 50%', `${side} : portrait centré dans le cercle`);
        assert.match(decor.ornements, /radial-gradient/, `${side} : ornements visibles`);
        assert.equal(decor.touches, 'none'); assert.equal(decor.touchesOrnements, 'none');
      }
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
      if (!touch) {
        assert.ok(Math.abs(mesures.ligne.top - mesures.ennemiCreature.bottom - 10) <= 2, 'la créature adverse garde un espace au-dessus de la ligne');
        assert.ok(Math.abs(mesures.creature.top - mesures.ligne.bottom - 10) <= 2, 'la créature alliée garde un espace sous la ligne');
        for (const slot of mesures.slotsEnnemis) assert.ok(Math.abs(mesures.ligne.top - slot.bottom - 10) <= 2, 'les cases adverses sont au-dessus de la ligne');
        for (const slot of mesures.slots) assert.ok(Math.abs(slot.top - mesures.ligne.bottom - 10) <= 2, 'les cases alliées sont sous la ligne');
        if (hauteur >= 700) assert.ok(mesures.table.bottom - mesures.vieJoueur.bottom >= 19, 'l’avatar joueur et ses PV sont remontés');
        const creaturesCliquables = await page.evaluate(() => [...document.querySelectorAll('.card-row > .rpg-card')].every((carte) => {
          const r = carte.getBoundingClientRect();
          return carte.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }));
        assert.ok(creaturesCliquables, 'chaque créature reste cliquable');
      }
      assert.ok(mesures.joueur.top >= mesures.creature.bottom - 1, 'la créature centrale ne recouvre pas l’avatar');
      assert.ok(mesures.vieJoueur.top >= mesures.creature.bottom - 1, 'les PV du joueur ne sont pas cachés par la créature');
      assert.ok(mesures.vieJoueur.right - mesures.vieJoueur.left > 2 * (mesures.vieJoueur.bottom - mesures.vieJoueur.top), 'PV du joueur : barre horizontale');
      assert.ok(mesures.vieEnnemi.right - mesures.vieEnnemi.left > 2 * (mesures.vieEnnemi.bottom - mesures.vieEnnemi.top), 'PV adverses : barre horizontale');
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
    // Un portrait plein vérifie le rognage réellement peint : aucun pixel du
    // portrait ne sort du cercle, tandis que le centre reste visible.
    if (largeur === 640 && hauteur === 280) {
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `.avatar-mask-probe { position: fixed !important; z-index: 9999 !important; left: 5px !important; top: 5px !important; width: 100px !important; height: 100px !important; transform: none !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-sizing: border-box !important; background: #000 !important; }
          .avatar-mask-probe .rpg-wizard-plate__avatar::before, .avatar-mask-probe .rpg-wizard-plate__avatar::after { display: none !important; }`;
        document.head.append(style);
        const probe = document.createElement('div');
        probe.className = 'rpg-wizard-plate avatar-mask-probe';
        probe.innerHTML = `<span class="rpg-wizard-plate__avatar"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ff00ff'/%3E%3C/svg%3E"></span>`;
        document.querySelector('.rpg-battle').append(probe);
      });
      const png = await page.locator('.avatar-mask-probe').screenshot();
      const pixels = await page.evaluate(async (data) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return [[5, 5], [50, 5], [50, 70], [5, 80], [95, 80], [50, 25], [20, 25]].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
      }, png.toString('base64'));
      const rose = ([r, , b]) => r > 180 && b > 180;
      assert.equal(rose(pixels[0]), false, 'coin supérieur extérieur coupé');
      assert.equal(rose(pixels[1]), false, 'aucune partie du portrait ne dépasse au-dessus du cercle');
      assert.equal(rose(pixels[2]), true, 'portrait visible dans le cercle');
      assert.equal(rose(pixels[3]), false, 'épaule gauche coupée hors du cercle');
      assert.equal(rose(pixels[4]), false, 'épaule droite coupée hors du cercle');
      assert.equal(rose(pixels[5]), true, 'haut du portrait visible à l’intérieur du cercle');
      assert.equal(rose(pixels[6]), false, 'coin supérieur du portrait rogné');
    }
    await context.close();
  }
} finally {
  await browser.close();
}
