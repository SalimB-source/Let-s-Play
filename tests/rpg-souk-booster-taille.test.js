import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const soukCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-souk.css'), 'utf8');
const soukJsx = fs.readFileSync(path.join(ROOT, 'src/games/RpgSouk.jsx'), 'utf8');

function blocRegle(css, selecteurRegex) {
  const globalRegex = new RegExp(selecteurRegex.source, `${selecteurRegex.flags.replace(/g/g, '')}g`);
  const matches = [...css.matchAll(globalRegex)];
  assert.ok(matches.length > 0, `règle introuvable : ${selecteurRegex}`);
  return matches.map((m) => m[1]).join('\n');
}

test('Souk : le booster est nettement agrandi et ne rétrécit pas quand le solde est insuffisant', () => {
  const paquet = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__paquet\s*\{([^}]*)\}/);
  const matchClamp = paquet.match(/--pw:\s*clamp\((\d+)px,\s*([\d.]+)vw,\s*(\d+)px\)/);
  assert.ok(matchClamp, '.rpg-souk__paquet définit --pw avec clamp(min, vw, max)');
  const [, minPx, vwVal, maxPx] = matchClamp.map(Number);
  assert.ok(minPx >= 170, `largeur minimale du booster agrandie (${minPx}px >= 170px, contre 104px avant)`);
  assert.ok(vwVal >= 15, `largeur fluide du booster agrandie (${vwVal}vw >= 15vw, contre 8.4vw avant)`);
  assert.ok(maxPx >= 220, `largeur maximale du booster agrandie (${maxPx}px >= 220px, contre 148px avant)`);

  const matchEpaisseur = paquet.match(/--pd:\s*calc\(var\(--pw\)\s*\*\s*(0?\.\d+)\)/);
  assert.ok(matchEpaisseur, '.rpg-souk__paquet définit son épaisseur 3D --pd proportionnelle à --pw');
  assert.ok(Number(matchEpaisseur[1]) <= 0.015,
    `tranche 3D ultra-fine (${matchEpaisseur[1]} <= 0.015, contre 0.12 avant) pour un vrai sachet plat`);

  const disabledCorps = blocRegle(soukCss, /\.rpg-souk__paquet:disabled\s+\.rpg-souk__paquet-corps\s*\{([^}]*)\}/);
  assert.doesNotMatch(disabledCorps, /scale\(0?\.\d+\)/,
    'le booster désactivé conserve sa pleine échelle sans rétrécissement');
});

test('Souk : le booster est séparé verticalement du bouton Acheter sans superposition absolue', () => {
  const paquet = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__paquet\s*\{([^}]*)\}/);
  assert.match(paquet, /display:\s*flex\s*;/, '.rpg-souk__paquet empile le sachet et le bouton Acheter en flex');
  assert.match(paquet, /flex-direction:\s*column\s*;/, '.rpg-souk__paquet oriente la colonne verticalement');
  assert.match(paquet, /align-items:\s*center\s*;/, '.rpg-souk__paquet centre le sachet et le bouton Acheter');
  assert.match(paquet, /row-gap:\s*clamp\((\d+)px/, '.rpg-souk__paquet sépare le booster du bouton Acheter par un row-gap franc');

  const prix = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__paquet-prix\s*\{([^}]*)\}/);
  assert.match(prix, /position:\s*relative\s*;/,
    '.rpg-souk__paquet-prix suit le flux sous le booster au lieu de se coller en position: absolute');
  assert.doesNotMatch(prix, /bottom:\s*0/,
    '.rpg-souk__paquet-prix ne chevauche plus le bas du sachet');

  const hoverPrix = blocRegle(
    soukCss,
    /\.rpg-souk__paquet:not\(:disabled\):hover\s+\.rpg-souk__paquet-prix,\s*\.rpg-souk__paquet:not\(:disabled\):focus-visible\s+\.rpg-souk__paquet-prix\s*\{([^}]*)\}/,
  );
  assert.doesNotMatch(hoverPrix, /translateX\(-50%\)/,
    'le survol du bouton Acheter centré en flex ne le décale pas à gauche');
});

test('Souk : le booster est interactif en 3D même sans solde et porte l’illustration de Salem', async () => {
  const { RAYONS } = await import('../src/games/rpgBoosters.js');
  assert.equal(RAYONS[0]?.vitrine, 'salem', 'le booster du Souk porte l’illustration de Salem');

  const disabledPaquet = blocRegle(soukCss, /\.rpg-souk__paquet:disabled\s*\{([^}]*)\}/);
  assert.match(disabledPaquet, /pointer-events:\s*none\s*;/,
    'le bouton désactivé laisse passer les événements pointeur vers la vitrine interactive 3D');

  const carteVitrine = blocRegle(soukCss, /\.rpg-souk__paquet-carte\s*\{([^}]*)\}/);
  const matchScale = carteVitrine.match(/scale\(([\d.]+)\)/);
  assert.ok(matchScale && Number(matchScale[1]) >= 1.45,
    `l’illustration de Salem est agrandie en plan rapproché (${matchScale?.[1]} >= 1.45) sur la face du booster`);

  const glareAvant = blocRegle(soukCss, /\.rpg-souk__paquet-face--avant::before\s*\{([^}]*)\}/);
  assert.match(glareAvant, /z-index:\s*3\s*;/,
    'le reflet holographique passe au-dessus de l’illustration de Salem');

  assert.match(soukCss, /\.rpg-souk__rayon\s+\.rpg-souk__paquet\.is-pointe\s+\.rpg-souk__paquet-corps/,
    'l’inclinaison 3D au survol prend le dessus même quand le bouton est désactivé');
  assert.match(soukCss, /\.rpg-souk__rayon\s+\.rpg-souk__paquet\.is-saisi\s+\.rpg-souk__paquet-corps/,
    'la rotation libre 360° au glissé est active sur le booster');
  assert.match(soukJsx, /onPointerDown=\{appuyer\}/,
    'la vitrine du booster écoute la saisie au pointeur pour tourner en 3D');
});

test('Souk : la section « Les cartes à l’unité » est épurée de tout texte redondant', () => {
  for (const superflu of [
    'rpg-souk__direct-resume',
    'rpg-souk__direct-complet',
    'rpg-souk__direct-stock',
    'rpg-souk__direct-refus',
    'rpg-souk__direct-pied',
    'cardTypeLine(',
    'cartes chaque jour',
  ]) {
    assert.ok(!soukJsx.includes(superflu), `${superflu} est retiré de RpgSouk.jsx`);
  }
});

test('Souk : les cartes mythiques portent un dégradé violet sombre animé à contraste adouci', () => {
  assert.match(soukCss, /@keyframes\s+rpg-souk-mythique-degrade\s*\{/,
    'les keyframes du dégradé mythique sont définies');
  const mythique = blocRegle(soukCss, /\.rpg-souk__direct-carte\.is-mythique\s*\{([^}]*)\}/);
  assert.match(mythique, /background-image:\s*linear-gradient\([\s\S]*#140d1f[\s\S]*#351d52[\s\S]*#432466/,
    'la carte mythique porte un dégradé violet sombre à contraste doux');
  assert.doesNotMatch(mythique, /#c07eff|#8f3ee8|#64299e/i,
    'le dégradé mythique évite les violets trop vifs ou trop contrastés');
  assert.match(mythique, /background-size:\s*260%\s+260%\s*;/,
    'background-size élargi permet le mouvement continu du dégradé');
  assert.doesNotMatch(mythique, /(?:^|\s)background\s*:/,
    'aucun shorthand background: n’écrase background-size');
  assert.match(mythique, /animation:\s*rpg-souk-mythique-degrade\s+[\d.]+s\s+ease-in-out\s+infinite\s*;/,
    'le dégradé violet est animé en continu');
  assert.match(soukCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rpg-souk__direct-carte\.is-mythique[\s\S]*animation:\s*none/,
    'prefers-reduced-motion coupe l’animation du dégradé mythique');
});

test('Souk : les cartes rares portent le même effet de dégradé animé en doré adouci', () => {
  const rare = blocRegle(soukCss, /\.rpg-souk__direct-carte\.is-rare\s*\{([^}]*)\}/);
  assert.match(rare, /background-image:\s*linear-gradient\([\s\S]*#18130a[\s\S]*#4a3614[\s\S]*#5c4319/,
    'la carte rare porte un dégradé doré adouci');
  assert.doesNotMatch(rare, /#a87618/i,
    'le dégradé rare évite un éclat doré trop vif');
  assert.match(rare, /background-size:\s*260%\s+260%\s*;/,
    'background-size élargi permet le mouvement continu du dégradé doré');
  assert.doesNotMatch(rare, /(?:^|\s)background\s*:/,
    'aucun shorthand background: n’écrase background-size');
  assert.match(rare, /animation:\s*rpg-souk-mythique-degrade\s+[\d.]+s\s+ease-in-out\s+infinite\s*;/,
    'le dégradé doré est animé en continu avec le même mouvement');
  assert.match(soukCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rpg-souk__direct-carte\.is-rare[\s\S]*animation:\s*none/,
    'prefers-reduced-motion coupe l’animation du dégradé doré');
});

test('Souk : les cartes inhabituelles portent le même effet de dégradé animé en bleu adouci', () => {
  const inhabituelle = blocRegle(soukCss, /\.rpg-souk__direct-carte\.is-inhabituelle\s*\{([^}]*)\}/);
  assert.match(inhabituelle, /background-image:\s*linear-gradient\([\s\S]*#0d1624[\s\S]*#1d395c[\s\S]*#244770/,
    'la carte inhabituelle porte un dégradé bleu saphir adouci');
  assert.doesNotMatch(inhabituelle, /#2665b0/i,
    'le dégradé inhabituel évite un éclat bleu trop vif');
  assert.match(inhabituelle, /background-size:\s*260%\s+260%\s*;/,
    'background-size élargi permet le mouvement continu du dégradé bleu');
  assert.doesNotMatch(inhabituelle, /(?:^|\s)background\s*:/,
    'aucun shorthand background: n’écrase background-size');
  assert.match(inhabituelle, /animation:\s*rpg-souk-mythique-degrade\s+[\d.]+s\s+ease-in-out\s+infinite\s*;/,
    'le dégradé bleu est animé en continu avec le même mouvement');
  assert.match(soukCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rpg-souk__direct-carte\.is-inhabituelle[\s\S]*animation:\s*none/,
    'prefers-reduced-motion coupe l’animation du dégradé bleu');
});

test('Souk (JSDOM + React) : le booster rendu et le bouton Acheter gardent un écart calculé net', async () => {
  const prevEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'scripts/rpg-souk-smoke.jsx',
      outDir: 'node_modules/.cache/rpg-souk-booster-taille',
      emptyOutDir: true,
    },
  });
  if (prevEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prevEnv;

  const dom = new JSDOM(
    `<!doctype html><html><head><style>${soukCss}</style></head><body></body></html>`,
    { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const probe = dom.window.document.createElement('div');
    probe.innerHTML = `
      <button type="button" class="rpg-souk__paquet">
        <span class="rpg-souk__paquet-ombre"></span>
        <span class="rpg-souk__paquet-scene"></span>
        <span class="rpg-souk__paquet-prix">Acheter · 140</span>
      </button>
    `;
    dom.window.document.body.appendChild(probe);

    const paquetStyle = dom.window.getComputedStyle(probe.querySelector('.rpg-souk__paquet'));
    const sceneStyle = dom.window.getComputedStyle(probe.querySelector('.rpg-souk__paquet-scene'));
    const prixStyle = dom.window.getComputedStyle(probe.querySelector('.rpg-souk__paquet-prix'));

    assert.equal(paquetStyle.display, 'flex');
    assert.equal(paquetStyle.flexDirection, 'column');
    assert.equal(paquetStyle.alignItems, 'center');
    assert.ok(parseFloat(paquetStyle.rowGap) >= 24, `écart vertical actif (${paquetStyle.rowGap})`);
    assert.equal(sceneStyle.position, 'relative');
    assert.equal(prixStyle.position, 'relative');

    probe.remove();

    const { checkRpgSoukEcran } = await import('../node_modules/.cache/rpg-souk-booster-taille/rpg-souk-smoke.js');
    await checkRpgSoukEcran(assert);
  } finally {
    dom.window.close();
  }
});
