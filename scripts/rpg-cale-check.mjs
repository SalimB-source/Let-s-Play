/**
 * La prisonnière derrière son capteur (Abordage, set Lettres de Marque).
 * node scripts/rpg-cale-check.mjs
 * npm run check:rpg-cale -- --browser (Chromium Playwright ou CHROMIUM_EXECUTABLE_PATH)
 *
 * Sur la TABLE, la carte de la créature détenue se glisse DERRIÈRE son
 * ravisseur : elle dépasse par le haut et la droite, inclinée, assombrie,
 * derrière les chaînes, son nom en haut de la carte visible sur la bande qui
 * dépasse — le bouton du capteur la recouvre, on ne lit d'elle que ce qui
 * dépasse. Dans la FICHE du capteur (clic droit), la créature détenue apparaît
 * en petite carte dans la description, comme une carte équipée ; la face du
 * capteur reste seule. Décoratif partout : rien à cliquer, tout se lit déjà
 * dans l'aria du capteur ; sans prise, le DOM reste celui d'avant.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { rpgNouveauDuel, rpgJouerArme, rpgJouerCreature, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';

// ── 0. Le rendu réel ────────────────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-cale-smoke.jsx', outDir: 'node_modules/.cache/rpg-cale', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCales, porteesGrappin, porteeCibleEnCours } = await import('../node_modules/.cache/rpg-cale/rpg-cale-smoke.js');
const rendu = rendreCales();

const documentDe = (html) => new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document;

// ── 1. Sur la table : la carte prisonnière DERRIÈRE le capteur ─────────────
for (const [nom, cas] of [['capitaine', rendu.capitaine], ['capitaineEnnemi', rendu.capitaineEnnemi]]) {
  const doc = documentDe(cas.html);
  const pile = doc.querySelector('.rpg-card-prison');
  assert.ok(pile, `${nom} : le capteur vit dans son wrapper de prison`);
  const prisonniere = pile.querySelector('.rpg-card__prisonniere');
  const capteur = pile.querySelector('.rpg-card');
  assert.ok(prisonniere && capteur, `${nom} : la pile contient la prisonnière et le capteur`);
  assert.ok(prisonniere.previousElementSibling === null && capteur.previousElementSibling === prisonniere,
    `${nom} : la prisonnière vient AVANT le bouton du capteur dans le DOM — elle est dessous`);
  assert.equal(prisonniere.getAttribute('aria-hidden'), 'true',
    `${nom} : la carte détenue est décorative — l'aria du capteur dit déjà la cale`);
  assert.match(prisonniere.querySelector('.rpg-card__prisonniere-art')?.getAttribute('src') ?? '',
    /\/cards\/fennec-des-decombres\.jpg(\?|$)/,
    `${nom} : la carte détenue montre sa peinture`);
  assert.equal(prisonniere.querySelector('.rpg-card__prisonniere-nom')?.textContent, 'Fennec des décombres',
    `${nom} : le nom de la détenue est imprimé en haut de sa carte`);
  assert.ok(prisonniere.querySelector('.rpg-card__prisonniere-chaine')?.textContent.includes('⛓'),
    `${nom} : les chaînes barrent la carte détenue`);
  assert.equal(capteur.getAttribute('data-prisonniere'), 'fennec-des-decombres',
    `${nom} : le bouton du capteur porte la détenue pour la fiche`);
  assert.ok(capteur.querySelector('[data-compteur="cale"]'),
    `${nom} : le losange ⛓ de la cale reste sur le capteur`);
  assert.match(capteur.getAttribute('aria-label') ?? '', /Cotre de course/,
    `${nom} : le capteur lui-même est bien rendu — son aria le nomme`);
  assert.match(capteur.getAttribute('aria-label') ?? '', /cale : détient Fennec des décombres/,
    `${nom} : l'aria du capteur complète la carte détenue, il ne la remplace pas`);
}

// ── 2. Sans cale : le DOM reste celui d'avant ──────────────────────────────
const docLibre = documentDe(rendu.libre.html);
assert.equal(docLibre.querySelector('.rpg-card-prison'), null,
  'sans prise en cale, aucun wrapper de prison — une carte, un bouton');
assert.equal(docLibre.querySelector('.rpg-card__prisonniere'), null,
  'sans prise en cale, aucune carte derrière');
assert.equal(docLibre.querySelector('[data-compteur="cale"]'), null,
  'sans prise en cale, pas de losange ⛓ non plus');

// ── 2 bis. Le losange ⛓ se range SOUS les couleurs ─────────────────────────
// Les créatures à Abordage du set sont hybrides (sable + eau) : leur bloc de
// couleur empile deux pastilles à gauche, et le losange de la cale se range
// dessous. Il ne rejoint donc pas les compteurs d'Heures et de sable, qui se
// lisent sous le coût, à droite.
const docHybride = documentDe(rendu.capitaine.html);
const rangCale = docHybride.querySelector('.rpg-card__compteurs--cale');
assert.ok(rangCale?.querySelector('[data-compteur="cale"]'),
  'le Cotre hybride : le losange ⛓ occupe son propre rang, sous les couleurs');
assert.equal(rangCale.querySelector('[data-compteur="heures"], [data-compteur="sable"]'), null,
  'le rang de la cale ne porte que la cale');
assert.equal(docHybride.querySelector('.rpg-card__compteurs--hybride [data-compteur="cale"]'), null,
  'le losange ⛓ ne remonte pas dans le rang des compteurs du coût');
const ordreReperes = [...docHybride.querySelectorAll('.rpg-card-element-badge, .rpg-card__compteurs--cale')]
  .map((noeud) => (noeud.classList.contains('rpg-card__compteurs--cale') ? 'cale' : 'couleurs'));
assert.deepEqual(ordreReperes, ['couleurs', 'cale'],
  'le losange ⛓ est rendu juste après la pastille de couleur, pas avant');

// Une créature à Abordage d'une seule couleur (La Barbe Noire) n'a qu'une
// pastille : la cale garde le rang commun, à côté du masque des Deux Visages.
const docMono = documentDe(rendu.mono.html);
const caleMono = docMono.querySelector('[data-compteur="cale"]');
assert.ok(caleMono?.parentElement.matches('.rpg-card__compteurs:not(.rpg-card__compteurs--hybride)'),
  'mono : le losange ⛓ reste dans le rang commun des compteurs, sous la couleur');
assert.ok(caleMono.parentElement.querySelector('[data-compteur="visage"]'),
  'mono : la cale et le visage partagent ce rang');

// ── 2 ter. Le Grappin accroché ne redemande plus de porteur ────────────────
// L'attachement du Grappin ouvre une attente de prise en cale : la table doit
// accepter le clic sur une créature ADVERSE. La portée se lit donc sur
// l'attente, pas sur la fiche d'arme — sinon la page réclamait « une créature
// alliée à équiper » et refusait la proie pourtant allumée.
const portees = porteesGrappin();
assert.equal(portees.avantAttachement, 'allie',
  'le Grappin en main demande encore une créature alliée à équiper');
assert.equal(portees.apresAttachement, 'ennemi',
  'le Grappin accroché fait désigner une proie adverse, pas un second porteur');
assert.equal(portees.autreArme, 'allie',
  'une autre arme sans prise garde son porteur allié');
assert.equal(portees.creatureAccostage, null,
  'une créature accostante ne s’équipe de rien : la table s’allume par `attenteAbordage`, sans portée d’arme');
assert.equal(portees.bimini, 'allie',
  'le site de Bimini garde sa case alliée, même si un Grappin attend sa prise');

// Le parcours réel, moteur compris : le Grappin s'attache, l'attente de prise
// s'ouvre dans le duel, la page lit la portée sur cette attente, et le clic sur
// la créature adverse résout la prise. C'est cette suite qui était cassée : la
// page redemandait un porteur allié et refusait la proie.
{
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  for (const camp of ['joueur', 'sorcier']) {
    for (const couleur of ['sable', 'eau', 'braise', 'neige', 'tenebres']) duel[camp].mana[couleur] = 9;
  }
  duel.joueur.main.push('fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  duel.sorcier.main.push('pilote-de-la-carreira');
  const pilote = rpgJouerCreature(duel, 'sorcier', 'pilote-de-la-carreira').entite;
  duel.joueur.main.push('grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', fennec.id).ok, true,
    'le Grappin s’attache au Fennec');
  assert.equal(duel.arriveeEnAttente?.carteId, 'grappin-d-abordage',
    'l’attachement laisse une attente de prise sur la carte d’arme');
  assert.equal(
    porteeCibleEnCours({ carte: cardById('grappin-d-abordage'), attenteAbordage: true }),
    'ennemi',
    'la page lit la prise en cale sur l’attente : la proie est adverse',
  );
  const resolu = rpgResoudreArriveeCiblee(duel, 'joueur', pilote.id);
  assert.equal(resolu.ok, true, 'le clic sur la créature adverse résout la prise');
  assert.equal(fennec.enCale?.carteId, 'pilote-de-la-carreira',
    'le porteur du Grappin détient la créature choisie');
  assert.equal(duel.arriveeEnAttente ?? null, null, 'l’attente se referme après la prise');
}

const pageSource = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.match(pageSource, /const modeCible = porteeCibleEnCours\(\{/,
  'la page dérive la portée de la désignation de `porteeCibleEnCours` (attentes comprises)');
assert.match(pageSource,
  /texte: attenteAbordage && carteEstArme\(carteCiblee\)\s*\? `\$\{carteCiblee\.name\} accroché — choisissez la créature adverse à prendre en cale/,
  'l’invite annonce la prise en cale, jamais un second équipement');
assert.match(pageSource,
  /: carteEstArme\(carteCiblee\)\s*\? `Choisissez une créature alliée à équiper avec \$\{carteCiblee\.name\}`/,
  'l’invite d’équipement ne subsiste que pour l’arme qui attend son porteur');

// ── 3. La fiche du capteur : une seule face, captive en petite carte ───────
const docFiche = documentDe(rendu.fiche.html);
const empile = docFiche.querySelector('.rpg-hover-card-preview__empile');
assert.ok(empile, 'la fiche garde son wrapper de face');
assert.equal(empile.querySelectorAll(':scope > .rpg-hover-card-preview__face').length, 1,
  'la face du capteur est seule : la captive n’est plus empilée en grand');
assert.equal(empile.querySelector('.rpg-hover-card-preview__face--prisonniere'), null,
  'aucune face de grande taille pour la prisonnière');
const mini = docFiche.querySelector('[data-creature-en-cale="fennec-des-decombres"]');
assert.ok(mini, 'la description contient la petite carte captive');
assert.match(mini.querySelector('img')?.getAttribute('src') ?? '',
  /\/cards\/fennec-des-decombres\.jpg(\?|$)/,
  'la petite carte montre la peinture de la détenue');
assert.equal(mini.querySelector('strong')?.textContent, 'Fennec des décombres',
  'la petite carte nomme la détenue');
assert.equal(mini.querySelector('.rpg-hover-card-preview__prisonniere-label')?.textContent, 'En cale',
  'la description indique que la créature est en cale');
assert.ok(mini.querySelector('figcaption small:not(.rpg-hover-card-preview__prisonniere-label)'),
  'la petite carte conserve aussi le texte de la créature');
assert.match(docFiche.querySelector('.rpg-hover-card-preview')?.getAttribute('aria-label') ?? '',
  /détient Fennec des décombres en sa cale/,
  'l’aria de la fiche dit la détention');

const docFicheLibre = documentDe(rendu.ficheLibre.html);
assert.equal(docFicheLibre.querySelector('[data-creature-en-cale]'), null,
  'sans prisonnière, aucun petit encart de cale');
assert.equal(docFicheLibre.querySelectorAll('.rpg-hover-card-preview__face').length, 1,
  'sans prisonnière, la fiche montre une seule face');

// ── 4. La feuille de style tient le décor ─────────────────────────────────
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const blocPile = css.slice(css.indexOf('.rpg-card-prison {'), css.indexOf('.rpg-card__prisonniere-nom'));
assert.match(blocPile, /position:\s*absolute/, 'la carte détenue se place dans la pile du capteur');
assert.match(blocPile, /top:\s*-9%/, 'elle dépasse du capteur par le haut');
assert.match(blocPile, /left:\s*8%/, 'et par la droite');
assert.match(blocPile, /z-index:\s*0/, 'elle vit SOUS le bouton du capteur');
assert.match(css, /\.rpg-card-prison > \.rpg-card \{\s*z-index:\s*1;/, 'le capteur la recouvre');
assert.match(blocPile, /pointer-events:\s*none/, 'rien à cliquer : la détenue est décorative, la cale se lit sur le capteur');
assert.match(blocPile, /transform:\s*rotate\(2\.6deg\)/, 'la carte détenue arrive inclinée, glissée derrière');
assert.match(css, /@keyframes rpg-prisonniere-arrivee/, 'la carte détenue anime son arrivée derrière le capteur');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card__prisonniere \{\s*animation: none;/,
  'en mouvement réduit, la carte détenue apparaît sans animation');

const blocFiche = css.slice(css.indexOf('.rpg-hover-card-preview__prisonniere {'), css.indexOf('.rpg-hover-card-preview__face {'));
assert.match(blocFiche, /border-color:\s*rgba\(127, 212, 200, \.72\)/,
  'la petite carte captive se distingue avec son liseré turquoise');
assert.match(blocFiche, /figcaption > \.rpg-hover-card-preview__prisonniere-label/,
  'la petite carte porte son libellé « En cale »');

// ── 4 bis. Le wrapper de prison est une CARTE de la rangée ─────────────────
// Il n'y a qu'un wrapper par capteur : s'il manque aux règles qui mesurent les
// enfants de la rangée, le capteur garde la largeur nominale du PC pendant que
// ses voisines se partagent la rangée — il paraît deux fois trop grand en
// plein écran, et la grille des cinq cases le place au hasard.
const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(mobileCss,
  /\.rpg-battle--touch \.card-row > :is\(\.rpg-card, \.rpg-card-stack, \.rpg-card-prison\) \{/,
  'au doigt, le capteur se partage la rangée comme une carte');
assert.match(mobileCss,
  /\.card-row \.rpg-card-prison > \.rpg-card[^{]*\{ width: 100%; \}/,
  'la face du capteur prend la largeur que la rangée donne au wrapper');
assert.match(mobileCss,
  /\.card-row > \.rpg-card-prison:first-child/,
  'un capteur seul dans sa rangée se centre comme une carte');
const essaiCss = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
assert.match(essaiCss,
  /\[data-mode-mana="essai"\] \.card-row > :is\(\.rpg-card, \.rpg-card-stack, \.rpg-card-prison\) \{\s*grid-column: var\(--case-essai, auto\);/,
  'dans la grille des cinq cases, le capteur tombe dans sa case');
assert.match(css, /\.rpg-card-prison \{[^}]*min-width: 0;[^}]*max-width: 100%;/,
  'le wrapper se laisse comprimer comme une carte');
assert.match(css, /\.rpg-card-prison > \.rpg-card \{[^}]*max-width: 100%;/,
  'la face ne déborde jamais de la boîte du wrapper');
// Le wrapper doit recevoir les mêmes largeurs à CHAQUE breakpoint, pas
// seulement max-width: 100 % (qui ne corrige pas sa taille intrinsèque).
assert.match(css, /\.rpg-card-prison > \.rpg-card \{[^}]*width: 100%;/);
assert.match(css, /\.rpg-card-prison \{[^}]*display: block;/);
for (const rule of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
  if (/(^|,)\s*\.rpg-card\s*(,|$)/.test(rule[1]) && /width: clamp\(/.test(rule[2])) {
    assert.ok(rule[1].includes('.rpg-card-prison'),
      'chaque largeur responsive de carte s’applique aussi à la cale');
  }
}
assert.match(pageSource,
  /className="rpg-card-prison"\s*\n\s*style=\{caseEssai \? \{ '--case-essai': caseEssai \} : undefined\}/,
  'la case du mode sans terrains est posée sur le wrapper comme sur la carte');

// Le losange ⛓ sous les couleurs : la règle commune part du haut de la carte
// plus la hauteur du bloc de couleur, et le bloc hybride compte ses DEUX
// pastilles (repère × 2 + leur écart). Sur la table, les pastilles posées
// mesurent 19 cqw et leur écart 1.5 cqw : c'est cette mesure qui déplace le
// losange, pas le repère commun de 27 cqw.
const blocRangCale = css.slice(css.indexOf('.rpg-card__compteurs--cale {'), css.indexOf('.rpg-card__compteur--cale {'));
assert.match(blocRangCale,
  /top:\s*calc\(var\(--rpg-card-element-marker-top, 5%\) \+ var\(--rpg-card-marker-size, 26px\) \* 2 \+ 2px/,
  'le losange ⛓ descend sous les deux pastilles empilées d’une hybride');
assert.match(blocRangCale,
  /left:\s*calc\(var\(--rpg-card-element-marker-left, 6%\) \+ \(var\(--rpg-card-marker-size, 26px\) - var\(--rpg-card-counter-size\)\) \/ 2\)/,
  'il reste centré sur la colonne des couleurs, comme celui d’une mono');
const feuilleMobile = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(feuilleMobile,
  /\.rpg-card__compteurs\.rpg-card__compteurs--cale \{\s*top:\s*calc\(5% \+ 19cqw \* 2 \+ 1\.5cqw \+ var\(--rpg-card-counter-size\) \* \.21 \+ 4px\);/,
  'sur la table, la hauteur du bloc de couleur est celle des pips réels (19 cqw, écart 1.5 cqw)');

console.log('✓ La prisonnière se glisse derrière son capteur sur la table ; dans la fiche, elle apparaît en petite carte dans la description.');

// ── 5. La cascade réelle : une seule hauteur de carte, pas deux lignes ─────
// Les assertions de source ci-dessus ne détectent pas une règle générique
// placée plus bas qui écrase `position: absolute` ou la perspective.
if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright');
  const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    for (const { width, height, touch } of [
      { width: 1920, height: 1080, touch: false },
      { width: 1440, height: 900, touch: false },
      { width: 1280, height: 600, touch: false },
      { width: 844, height: 390, touch: true },
      { width: 568, height: 320, touch: true },
      { width: 390, height: 844, touch: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      // Comparer les faces SUR LA TABLE, et pas seulement dans la fiche.
      for (const mode of ['', 'essai']) {
        await page.setContent(`<!doctype html><html><head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>* { box-sizing: border-box; } ${css}\n${mobileCss}\n${essaiCss}</style>
          </head><body><main class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}"
            data-mode-mana="${mode}" style="position:fixed;inset:0">
            <div class="card-table" style="height:100%">
              <div class="card-row card-row--equipe">
                ${rendu.libre.html}${rendu.capitaine.html}
              </div>
            </div>
          </main></body></html>`);
        const faces = await page.locator('.card-row .rpg-card').evaluateAll(cards =>
          cards.map(card => ({ width: card.offsetWidth, height: card.offsetHeight })));
        assert.equal(faces.length, 2);
        for (const axis of ['width', 'height']) {
          assert.ok(faces[0][axis] > 0);
          assert.ok(Math.abs(faces[0][axis] - faces[1][axis]) <= 1,
            `${width}×${height}, ${mode || 'classique'} : même ${axis} avec ou sans cale (${JSON.stringify(faces)})`);
        }
      }
      for (const [nom, cas, avecPrisonniere] of [
        ['cale pleine', rendu.fiche, true], ['cale vide', rendu.ficheLibre, false],
      ]) {
        await page.setContent(`<!doctype html><html><head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>* { box-sizing: border-box; } ${css}\n${mobileCss}</style>
          </head><body><main class="rpg-battle ${touch ? 'rpg-battle--touch' : ''}">
            <div class="rpg-card-peek rpg-card-peek--catalogue">
              <div class="rpg-card-peek__panel">${cas.html}</div>
              <div class="rpg-card-peek__bar"><button>Fermer la fiche</button></div>
            </div>
          </main></body></html>`);
        const layout = await page.locator('.rpg-hover-card-preview__empile').evaluate((faceWrapper) => {
          const face = faceWrapper.querySelector('.rpg-hover-card-preview__face');
          const miniature = document.querySelector('[data-creature-en-cale]');
          const details = document.querySelector('.rpg-hover-card-preview__details');
          return {
            wrapperHeight: faceWrapper.offsetHeight,
            nombreFaces: faceWrapper.querySelectorAll('.rpg-hover-card-preview__face').length,
            faceHeight: face.offsetHeight,
            details: details.getBoundingClientRect().toJSON(),
            miniature: miniature ? miniature.getBoundingClientRect().toJSON() : null,
          };
        });
        const label = `${width}×${height} ${touch ? 'tactile' : 'souris'}, ${nom}`;
        assert.ok(layout.faceHeight > 0, `${label} : la face reste visible`);
        assert.ok(Math.abs(layout.wrapperHeight - layout.faceHeight) <= 1,
          `${label} : le wrapper conserve exactement une seule face`);
        assert.equal(layout.nombreFaces, 1, `${label} : aucune grande face de captive`);
        assert.equal(Boolean(layout.miniature), avecPrisonniere,
          `${label} : la petite carte apparaît uniquement si la cale est pleine`);
        if (avecPrisonniere) {
          assert.ok(layout.miniature.width > 0 && layout.miniature.height > 0,
            `${label} : la petite carte est visible`);
          assert.ok(layout.miniature.width < layout.details.width,
            `${label} : la captive reste une vignette dans la description`);
          assert.ok(layout.miniature.top >= layout.details.top && layout.miniature.bottom <= layout.details.bottom,
            `${label} : la petite carte reste dans le bloc description`);
        }
      }
      await context.close();
      console.log(`✓ ${width}×${height} : une face et sa petite carte de captive dans la description ; fiche simple sans captive.`);
    }
  } finally {
    await browser.close();
  }
}
