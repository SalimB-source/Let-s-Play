/**
 * Le TEXTE du Lien à l'écran.
 *
 * La phrase « Avec <ancre> en jeu : … » n'est pas une règle comme les autres :
 * elle décrit un renfort conditionnel. Elle ne porte donc pas d'icône d'effet
 * (un pictogramme de dégâts mentirait sur une phrase conditionnelle), elle
 * s'écrit grise tant que le renfort n'est pas réel, et prend l'or du Lien — en
 * gras — quand l'ancre tient la rangée **et** que la carte peut partir.
 *
 * Ces contrôles tiennent le découpage (`rpgLienTexte.js`), l'icône
 * (`effetIcons.js`), le rendu (`RpgCardRules.jsx`) et le style.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';
import { decouperLien, estLigneDeLien } from '../src/games/rpgLienTexte.js';
import { EFFETS_SPRITE, iconePourLigne } from '../src/games/effetIcons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-card-rules.css'), 'utf8');
const rulesJsx = fs.readFileSync(path.join(ROOT, 'src/games/RpgCardRules.jsx'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'src/games/RpgDuelPage.jsx'), 'utf8');
const sprite = EFFETS_SPRITE;

const cartesLiees = RPG_DUEL_CARDS.filter((carte) => carte.lien?.ancre);

function corpsDe(css, selecteurs) {
  const motif = new RegExp(`(?:^|\\n)${selecteurs}\\s*\\{([^}]*)\\}`, 'g');
  const blocs = [...css.matchAll(motif)].map((m) => m[1]);
  assert.ok(blocs.length > 0, `règle introuvable : ${selecteurs}`);
  return blocs.join('\n');
}

test('le découpage isole la phrase de Lien, et rien d’autre', () => {
  const texte = 'Inflige 2 dégâts à une créature ciblée. Avec Valkyrie des glaces en jeu : 3 dégâts au lieu de 2.';
  assert.deepEqual(decouperLien(texte), [
    { texte: 'Inflige 2 dégâts à une créature ciblée.', lien: false },
    { texte: 'Avec Valkyrie des glaces en jeu : 3 dégâts au lieu de 2.', lien: true },
  ]);
  // Sans Lien, le texte reste entier : une seule part, pas de span parasite.
  assert.deepEqual(decouperLien('Piochez une carte.'), [{ texte: 'Piochez une carte.', lien: false }]);
  assert.equal(estLigneDeLien('Avec Le Kraken en jeu : -2/-3 au lieu de -1/-2.'), true);
  assert.equal(estLigneDeLien('Avec un sourire, il pioche.'), false);
});

test('les trente Liens se découpent, en une seule phrase, à la fin du texte', () => {
  assert.equal(cartesLiees.length, 30, 'le catalogue porte trente Liens');
  for (const carte of cartesLiees) {
    const morceaux = decouperLien(carte.text);
    const liens = morceaux.filter((morceau) => morceau.lien);
    assert.equal(liens.length, 1, `${carte.id} : une seule phrase de Lien`);
    assert.equal(
      carte.text.trim().endsWith(liens[0].texte),
      true,
      `${carte.id} : la phrase de Lien ferme le texte imprimé`,
    );
    assert.equal(
      morceaux.map((morceau) => morceau.texte).join(' ').replace(/\s+/gu, ' '),
      carte.text.trim().replace(/\s+/gu, ' '),
      `${carte.id} : le découpage ne perd aucun mot`,
    );
  }
});

test('une phrase de Lien porte les deux maillons, jamais l’icône d’un effet', () => {
  for (const carte of cartesLiees) {
    const ligne = decouperLien(carte.text).find((morceau) => morceau.lien)?.texte;
    assert.equal(
      iconePourLigne(carte, ligne),
      'lien',
      `${carte.id} : la phrase du Lien a son propre symbole, pas celui d’un effet`,
    );
  }
  // Le reste du texte garde ses icônes : elles ne disent que ce que la carte
  // fait d'elle-même.
  const braisier = RPG_DUEL_CARDS.find((carte) => carte.id === 'braisier-du-souk');
  assert.equal(iconePourLigne(braisier, braisier.text), 'degats');
  const blizzard = RPG_DUEL_CARDS.find((carte) => carte.id === 'hurlement-du-blizzard');
  assert.equal(iconePourLigne(blizzard, blizzard.text.split(' Avec ')[0]), 'degats');
});

test('la phrase de Lien est grise, puis or et grasse quand elle est vraie', () => {
  const gris = corpsDe(rulesCss, '\\.rpg-card-rules__lien');
  assert.match(gris, /opacity:\s*\.?\d+/, 'la phrase en attente est mise en retrait');
  assert.doesNotMatch(gris, /color:\s*#f2c94c/, 'elle n’est pas dorée par défaut');

  const or = corpsDe(
    rulesCss,
    '\\.rpg-card-rules__lien\\.is-actif,\\s*\\n\\.rpg-card-rules__lien\\[data-lien-actif="true"\\]',
  );
  assert.match(or, /color:\s*#f2c94c/, 'l’or du Lien');
  assert.match(or, /font-weight:\s*(?:800|bold)/, 'le gras');
  assert.match(or, /opacity:\s*1/, 'et plus de retrait');
});

test('RpgCardRules pose la phrase à part, avec ses maillons, et suit `lienActif`', () => {
  assert.match(rulesJsx, /import \{ decouperLien \} from '\.\/rpgLienTexte\.js'/);
  assert.match(rulesJsx, /lienActif = false/);
  assert.match(rulesJsx, /className=\{`rpg-card-rules__lien\$\{lienActif \? ' is-actif' : ''\}`\}/);
  assert.match(rulesJsx, /data-lien-actif=\{lienActif \? 'true' : undefined\}/);
  // L'icône du Lien vient de la même source que les autres : `IconeLigneRegle`
  // résout `lien` en `i-lien`, à l'intérieur du span qui porte l'état.
  const debutLien = rulesJsx.indexOf('morceau.lien ? (');
  const blocLien = rulesJsx.slice(debutLien, rulesJsx.indexOf(') : (', debutLien));
  assert.match(blocLien, /<IconeLigneRegle carte=\{carte\} ligne=\{morceau\.texte\} \/>/);
  assert.doesNotMatch(blocLien, /ligneRegle\(/, 'le pictogramme d’un effet reste hors du Lien');
});

test('le sprite porte le symbole du Lien, et le style le dore avec la phrase', () => {
  assert.match(sprite, /<symbol id="i-lien" viewBox="0 0 24 24">/);
  const or = corpsDe(
    rulesCss,
    '\\.rpg-card-rules__lien\\.is-actif \\.rpg-effet-icone--ligne,\\s*\\n\\.rpg-card-rules__lien\\[data-lien-actif="true"\\] \\.rpg-effet-icone--ligne',
  );
  assert.match(or, /color:\s*#f2c94c/, 'les maillons prennent l’or avec la phrase');
  assert.match(or, /opacity:\s*1/);
  const attente = corpsDe(rulesCss, '\\.rpg-card-rules__lien \\.rpg-effet-icone--ligne');
  assert.match(attente, /opacity:\s*\.\d+/, 'en attente, les maillons restent en retrait');
});

test('l’écran de duel allume la phrase : ancre en jeu et carte jouable', () => {
  assert.match(
    page,
    /const lienAllumeDansLApercu = \(carte\) => Boolean\(carte\?\.lien\)\s*\n\s*&& lienSatisfait\(carte, duel\.joueur\.creatures\)\s*\n\s*&& peutJouerCarte\(carte\)/,
    'le volet n’allume l’or que si le renfort est réel ET la carte jouable',
  );
  assert.match(page, /lienActif=\{lienAllumeDansLApercu\(cardById\(apercuSurvol\.carteId\)\)\}/);
  assert.match(page, /lienActif=\{lienActif\}/, 'le volet transmet l’état à la ligne de règle');
});
