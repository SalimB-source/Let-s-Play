import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « ViceCityWorld » (la page de Vice City Rush).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-fullscreen-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/vice-city-fullscreen', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityFullscreen } = await import('../node_modules/.cache/vice-city-fullscreen/vice-city-fullscreen-smoke.js');
try { await checkViceCityFullscreen(assert); } finally { dom.window.close(); }

// ── Le hub de préparation n'est pas une fenêtre défilante ────────────────────
// jsdom ne calcule pas la mise en page : on garde donc ici l'invariant de
// feuille de style. Pendant la préparation (`is-intro`, posée par la page), la
// fenêtre de jeu prend la hauteur de son contenu et le hub revient dans le
// flux — sinon les vignettes de mode repassent sous la ligne de flottaison dans
// une zone défilante. Le plein écran garde, lui, son défilement de secours.
const cinematic = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-cinematic.css'), 'utf8');

/** Déclarations de la première règle dont la liste de sélecteurs contient `selector`. */
function declarationsOf(source, selector) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.replace(/\s+/g, ' ').trim());
    if (selectors.includes(selector)) return match[2].replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** Corps d'une règle @media identifiée par ses conditions normalisées. */
function mediaBodyOf(source, conditions) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const expected = conditions.replace(/\s+/g, ' ').trim();
  const media = [...withoutComments.matchAll(/@media\s*([^{}]+)\{/g)]
    .find((match) => match[1].replace(/\s+/g, ' ').trim() === expected);
  if (!media) return '';

  const open = media.index + media[0].lastIndexOf('{');
  let depth = 0;
  for (let index = open; index < withoutComments.length; index += 1) {
    if (withoutComments[index] === '{') depth += 1;
    else if (withoutComments[index] === '}') {
      depth -= 1;
      if (depth === 0) return withoutComments.slice(open + 1, index);
    }
  }
  return '';
}

/** Toutes les fois que ces conditions @media apparaissent : une feuille peut
    les écrire deux fois (un bloc par sujet), et `mediaBodyOf` ne rend que le
    premier — suffisant ici, pas suffisant pour retrouver une règle isolée. */
function mediaBodiesOf(source, conditions) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const expected = conditions.replace(/\s+/g, ' ').trim();
  const bodies = [];
  for (const media of withoutComments.matchAll(/@media\s*([^{}]+)\{/g)) {
    if (media[1].replace(/\s+/g, ' ').trim() !== expected) continue;
    const open = media.index + media[0].lastIndexOf('{');
    let depth = 0;
    for (let index = open; index < withoutComments.length; index += 1) {
      if (withoutComments[index] === '{') depth += 1;
      else if (withoutComments[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          bodies.push(withoutComments.slice(open + 1, index));
          break;
        }
      }
    }
  }
  return bodies;
}

const stage = declarationsOf(cinematic, '.city-rush-page .city-rush-viewport.is-intro');
assert.match(stage, /(^|;)\s*height:\s*auto/, 'la fenêtre de jeu prend la hauteur du hub pendant la préparation');
assert.match(stage, /(^|;)\s*min-height:/, 'elle garde une hauteur minimale de fenêtre');
const hub = declarationsOf(cinematic, '.city-rush-page .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
assert.match(hub, /(^|;)\s*position:\s*relative/, 'le hub de préparation revient dans le flux');
assert.match(hub, /(^|;)\s*overflow:\s*visible/, 'plus de zone défilante dans la fenêtre');
const fullscreenHub = declarationsOf(cinematic, '.city-rush-shell.is-immersive .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
assert.match(fullscreenHub, /(^|;)\s*position:\s*absolute/, 'en plein écran, le hub reste une surimpression plein écran');
assert.match(fullscreenHub, /(^|;)\s*overflow-y:\s*auto/, 'et garde un défilement de secours si l’écran est plus court que le hub');

// Les petits portables restent sans défilement imbriqué en mode plein écran :
// les vignettes sont resserrées pour tenir entre le titre et les commandes.
const shortDesktop = mediaBodyOf(cinematic, '(max-height: 840px) and (hover: hover), (max-height: 840px) and (min-device-width: 601px)');
assert.ok(shortDesktop, 'les portables à faible hauteur ont leur mise en page compacte');
const compactGarage = declarationsOf(shortDesktop, '.city-rush-page .city-rush-car-card');
assert.match(compactGarage, /(^|;)\s*min-height:\s*190px/, 'le garage compact tient aussi sur un portable');

// Sur les téléphones portrait courts, on évite que le flex fasse se chevaucher
// les cartes et les commandes au lieu de faire défiler la page.
const shortPhone = mediaBodyOf(cinematic, '(max-height: 720px) and (max-width: 700px), (max-height: 720px) and (hover:none) and (pointer:coarse) and (max-device-width:600px)');
assert.ok(shortPhone, 'les téléphones de faible hauteur ont leur mise en page compacte');
const compactPhoneHub = declarationsOf(shortPhone, '.city-rush-page .city-rush-mode-picker');
assert.match(compactPhoneHub, /(^|;)\s*flex-shrink:\s*0/, 'le carrousel ne se comprime pas sous les commandes');
const compactPhoneCard = declarationsOf(shortPhone, '.city-rush-page .city-rush-mode-card');
assert.match(compactPhoneCard, /(^|;)\s*min-height:\s*128px/, 'les vignettes gardent leur contenu sur un téléphone court');

// ── Le hub de lancement entre en plein écran avec la page ────────────────
// La cible de la Fullscreen API est `.city-rush-page`, pas la coque : tout ce
// qui reste hors du sous-arbre plein écran est relégué derrière lui par le
// navigateur — l'écran-titre, posé au-dessus de la page, y aurait « reverdi »
// l'interface au premier F. La page doit donc aussi porter la couche fixe.
const rush = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush.css'), 'utf8');
const pageImmersive = declarationsOf(rush, '.city-rush-page.is-immersive');
assert.match(pageImmersive, /padding:\s*0/, 'la page immersive perd sa réserve pour la barre du site');
assert.match(pageImmersive, /overflow:\s*hidden/, 'rien ne défile derrière la coque en plein écran');
const pageRefUse = fs.readFileSync(path.join(root, 'src', 'games', 'ViceCityRushPage.jsx'), 'utf8');
assert.match(pageRefUse, /useGameFullscreen\(pageRef/, 'la cible du plein écran est la page de jeu (pageRef), pas la coque');
assert.match(pageRefUse, /ref=\{pageRef\}/, 'la page de jeu porte la référence demandée en plein écran');

// ── L’air du haut : la barre de navigation ne tombe pas sur le jeu ────────
// La barre du site flotte en `position: fixed`, donc PAR-DESSUS le contenu : si
// la page de jeu ne descend pas assez, son bandeau supérieur — titre, plein
// écran, son — passe sous l’île. Et si la barre bouge un jour sans que la page
// suive, l’accident revient à l’envers. Les deux chiffres sont donc lus dans
// leurs feuilles réelles et comparés, pas recopiés dans ce contrôle.
const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const navRule = declarationsOf(styles, '.nav');
assert.match(navRule, /position:\s*fixed/, 'la barre du site flotte au-dessus du contenu — c’est elle qui passe sur le jeu');
const navBottom = Number((navRule.match(/top:\s*([\d.]+)px/) ?? [0, 0])[1])
  + Number((navRule.match(/height:\s*([\d.]+)px/) ?? [0, NaN])[1]);
assert.ok(Number.isFinite(navBottom), `la barre se mesure : ${navBottom}px depuis le bord haut`);
// Sur téléphone la barre plaque le bord haut (`top: 0`) avec sa propre hauteur.
const phoneNav = styles.match(/top:0;left:0;right:0[\s\S]{0,80}?height:\s*([\d.]+)px/);
assert.ok(phoneNav, 'la barre collée en haut du téléphone a une hauteur lisible');
const phoneNavBottom = Number(phoneNav[1]);

// Toutes les règles `.city-rush-page` nues des deux feuilles qui se partagent la
// page. La seconde recharge la première : chacune doit passer par le jeton,
// sinon un `padding: 96px` écrit à la main dans l’une annule la réserve de
// l’autre sans que personne ne le voie.
/* Les règles « nues » de la page, dans les deux feuilles qui se la partagent.
    La seconde écrit `.city-rush-page.city-rush-page` pour coiffer la première :
    le sélecteur est doublé, la règle gagne — donc c’est aussi elle qu’il faut
    lire, sinon le contrôle validerait une règle que le navigateur a écrasée. */
const barePageRules = [rush, cinematic]
  .flatMap((source) => [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*\.city-rush-page(?:\.city-rush-page)*\s*\{([^}]*)\}/gm)])
  .map((match) => match[1].replace(/\s+/g, ' ').trim());
assert.ok(barePageRules.length >= 4, `les deux feuilles posent bien leurs règles de page (${barePageRules.length})`);
for (const rule of barePageRules) {
  if (!/padding:/.test(rule)) continue;
  assert.match(
    rule,
    /padding:\s*var\(--cr-nav-clear\)\s+0\s+\d+px/,
    `une règle de page recale le haut à la main au lieu de lire la réserve : « ${rule} »`,
  );
}
const clears = barePageRules
  .map((rule) => Number((rule.match(/--cr-nav-clear:\s*([\d.]+)px/) ?? [0, NaN])[1]))
  .filter(Number.isFinite);
assert.ok(clears.length >= 2, 'la réserve est déclarée au moins une fois par taille de support');
assert.ok(
  Math.max(...clears) >= navBottom + 24,
  `le jeu commence à ${Math.max(...clears)}px alors que la barre finit à ${navBottom}px — `
    + `${Math.max(...clears) - navBottom}px de souffle`,
);
assert.ok(
  Math.min(...clears) >= phoneNavBottom + 16,
  `téléphone : la barre occupe ${phoneNavBottom}px, le jeu descend à ${Math.min(...clears)}px`,
);

// La réserve n’existe que pour la barre : une fois en plein écran, il n’y a
// plus de barre du tout, donc plus de réserve (sinon une bande vide de 124px).
assert.match(pageImmersive, /padding:\s*0/, 'et le plein écran reprend cette réserve à zéro');

console.log('check:vice-city-fullscreen ✓ — plein écran et parcours des vignettes de Vice City Rush : mode → course → garage → lancement direct par la voiture (pilote sélectionnable avant le départ), bannière histoire cliquable ; le hub de lancement, dans la page, survit au passage en plein écran ; plein écran conservé pendant les écrans et la course, raccourcis F et Échap, pause à la sortie navigateur ; téléphone et application Android : le tap sur une voiture lance la course et ouvre le plein écran dans le geste ; écran de préparation : les vignettes de mode ne sont plus enfermées dans une fenêtre défilante (la coque prend la hauteur du hub, les petits écrans sont compactés et le plein écran garde son défilement de secours) ; la page descend le jeu sous la barre de navigation flottante du site, mesurée dans `styles.css`, réserve reprise à zéro en plein écran.');
// Rien ne garde le processus en vie : on sort explicitement (jsdom peut retenir des timers).
process.exit(0);
