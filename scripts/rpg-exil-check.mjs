/**
 * L'exil emporte la carte dans le même tourbillon que le renvoi en main,
 * recoloré en blanc et accompagné du vent — sans devenir une destruction.
 * node scripts/rpg-exil-check.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. Le même calque, avec deux palettes bien distinctes ──────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: {
    ssr: 'scripts/rpg-tourbillon-eau-smoke.jsx',
    outDir: 'node_modules/.cache/rpg-exil',
    emptyOutDir: true,
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const {
  rendreTourbillon,
  rendreTourbillonExil,
} = await import('../node_modules/.cache/rpg-exil/rpg-tourbillon-eau-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>
  <section data-cas="renvoi">${rendreTourbillon()}</section>
  <section data-cas="exil">${rendreTourbillonExil()}</section>
</body></html>`);
const document = window.document;

try {
  const renvoi = document.querySelector('[data-cas="renvoi"] .rpg-tourbillon-eau');
  const exil = document.querySelector('[data-cas="exil"] .rpg-tourbillon-eau');
  assert.ok(renvoi && exil, 'les deux sorties partagent le composant du tourbillon');
  assert.equal(renvoi.getAttribute('data-rpg-bounce-fx'), 'eau', 'le renvoi reste identifié comme de l’eau');
  assert.equal(renvoi.classList.contains('rpg-tourbillon-eau--exil'), false,
    'et ne reçoit aucune teinte de l’exil');
  assert.equal(exil.getAttribute('data-rpg-bounce-fx'), 'exil', 'l’exil expose sa propre variante');
  assert.ok(exil.classList.contains('rpg-tourbillon-eau--exil'), 'sa palette blanche est activée');
  assert.equal(exil.getAttribute('data-rpg-bounce-id'), 'entite-exilee', 'la victime reste identifiée');
  assert.equal(exil.getAttribute('aria-hidden'), 'true', 'le calque reste décoratif et non interactif');

  // Géométrie et contenu identiques : seule la couleur doit changer.
  assert.equal(exil.getAttribute('style'), renvoi.getAttribute('style'),
    'l’exil reprend exactement la place, la taille et l’inclinaison du renvoi');
  for (const partie of ['carte', 'nappe', 'spirale', 'anneau', 'goutte']) {
    assert.equal(
      exil.querySelectorAll(`.rpg-tourbillon-eau__${partie}`).length,
      renvoi.querySelectorAll(`.rpg-tourbillon-eau__${partie}`).length,
      `la partie « ${partie} » est commune aux deux effets`,
    );
  }
  assert.match(exil.querySelector('.rpg-tourbillon-eau__carte img')?.getAttribute('src') ?? '', /ressac/,
    'la carte exilée reste visible pendant que le souffle l’emporte');
} finally {
  window.close();
}

// ── 2. La feuille : blanc et gris seulement, mêmes images clés ─────────────
const debutVariante = css.indexOf('.rpg-tourbillon-eau--exil');
const finVariante = css.indexOf('@keyframes rpg-tourbillon-eau-vie', debutVariante);
assert.ok(debutVariante > 0 && finVariante > debutVariante, 'la variante blanche précède les images clés communes');
const variante = css.slice(debutVariante, finVariante);
for (const partie of ['nappe', 'spirale', 'anneau', 'goutte']) {
  assert.match(variante, new RegExp(`\\.rpg-tourbillon-eau--exil \\.rpg-tourbillon-eau__${partie}`),
    `la partie « ${partie} » a sa version blanche`);
}
assert.match(variante, /rgba\(255, 255, 255, \.98\)/, 'le cœur du souffle est blanc');
assert.match(variante, /#ededed/, 'ses particules gardent un dégradé blanc et gris');
assert.doesNotMatch(variante, /87, 200, 245|120, 220, 255|168, 236, 255|#57c8f5|#2b7fb4/i,
  'aucune encre turquoise ou bleue du renvoi ne subsiste dans la variante');
assert.doesNotMatch(variante, /@keyframes/, 'l’exil réutilise la chorégraphie au lieu de la dupliquer');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-tourbillon-eau,\s*\.rpg-tourbillon-eau \*/,
  'la variante hérite aussi de la suppression des mouvements');

// ── 3. Le moteur et la table distinguent exil, renvoi et destruction ───────
assert.match(engine, /export function rpgExils\(duel\)/, 'le moteur publie le journal des exils');
assert.match(engine, /const exilsParDuel = new WeakMap\(\);/, 'ce journal ne pollue pas la sauvegarde JSON');
const debutEffetExil = engine.indexOf("    case 'exil': {");
assert.ok(debutEffetExil > 0, 'le cas moteur de l’exil est identifié, pas seulement mentionné en commentaire');
const corpsExil = engine.slice(debutEffetExil, engine.indexOf("    case 'arme':", debutEffetExil));
assert.match(corpsExil, /journaliserExil\(duel, campCible, victime, sourceCarteId\);/,
  'toute victime réellement exilée est journalisée avec sa source');
assert.ok(corpsExil.indexOf('journaliserExil(') < corpsExil.indexOf('if (!victime.jeton)'),
  'un jeton exilé a lui aussi droit au souffle blanc');
assert.doesNotMatch(corpsExil, /journaliserDestruction\(/, 'l’exil ne devient jamais une destruction');

const animer = page.slice(page.indexOf('const animerModificationsChamp = ('), page.indexOf('const conserverAnnulation ='));
assert.match(animer, /const exiles = new Set\(rpgExils\(duel\)\.map\(\(evenement\) => evenement\.entityId\)\);/,
  'la table lit les exils quel que soit le chemin de l’effet');
assert.match(animer, /!renvoyees\.has\(entite\.entityId\)\s*&& !exiles\.has\(entite\.entityId\)/,
  'une victime exilée ne reçoit pas le fantôme d’une carte détruite');
assert.match(animer, /const exileesSurTable = avant\.filter\(\(entite\) => exiles\.has\(entite\.entityId\) && !entite\.isTerrain\);/,
  'seules les créatures exilées depuis la table déclenchent l’effet');
const blocExil = animer.slice(animer.indexOf('const exileesSurTable'), animer.indexOf('const attaquants =', animer.indexOf('const exileesSurTable')));
assert.match(blocExil, /jouerSfx\('cold_wind'\);/, 'le vent accompagne l’exil');
assert.match(blocExil, /variante: 'exil',/, 'le calque reçoit la variante blanche');
assert.match(blocExil, /effectId: `exil-\$\{token\}-\$\{entite\.entityId\}`/, 'chaque exil possède son effet');
assert.match(blocExil, /if \(!mouvementReduit\) \{/, 'le mouvement réduit supprime seulement la chorégraphie');
assert.match(blocExil, /const duree = 950;/, 'la sortie garde les 950 ms du renvoi');
assert.match(page, /effet\.variante !== 'exil' && effet\.camp !== 'sorcier'/,
  'un exil ne masque jamais un autre exemplaire dans la main');

// ── 4. Le vent est un échantillon livré, pas une synthèse ──────────────────
assert.ok(RPG_SFX_NAMES.includes('cold_wind'), 'le vent est bien catalogué parmi les bruitages');
assert.deepEqual(rpgSfx('cold_wind'), [{ kind: 'sample', at: 0, dur: 2.0, g: 1 }]);
assert.ok(existsSync(new URL('../src/games/assets/cold-wind.wav', import.meta.url)),
  'cold-wind.wav est livré avec le jeu');

console.log('✓ Exil : la carte est emportée par le tourbillon du renvoi recoloré en blanc — spirale, ondes, particules et dissolution communes, sans aucune encre bleue — avec cold-wind.wav, sans fantôme ni son de destruction, et sans masquer d’autre exemplaire dans la main.');
