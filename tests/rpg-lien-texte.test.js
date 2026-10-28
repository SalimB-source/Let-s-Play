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
import { iconePourLigne } from '../src/games/effetIcons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-card-rules.css'), 'utf8');
const rulesJsx = fs.readFileSync(path.join(ROOT, 'src/games/RpgCardRules.jsx'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'src/games/RpgDuelPage.jsx'), 'utf8');

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

test('une phrase de Lien ne porte aucune icône d’effet', () => {
  for (const carte of cartesLiees) {
    const ligne = decouperLien(carte.text).find((morceau) => morceau.lien)?.texte;
    assert.equal(
      iconePourLigne(carte, ligne),
      null,
      `${carte.id} : pas de pictogramme sur une phrase conditionnelle`,
    );
  }
  // Le reste du texte garde ses icônes : on n'a éteint que le Lien.
  const braisier = RPG_DUEL_CARDS.find((carte) => carte.id === 'braisier-du-souk');
  assert.equal(iconePourLigne(braisier, braisier.text), 'degats');
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

test('RpgCardRules pose la phrase à part, sans icône, et suit `lienActif`', () => {
  assert.match(rulesJsx, /import \{ decouperLien \} from '\.\/rpgLienTexte\.js'/);
  assert.match(rulesJsx, /lienActif = false/);
  assert.match(rulesJsx, /className=\{`rpg-card-rules__lien\$\{lienActif \? ' is-actif' : ''\}`\}/);
  assert.match(rulesJsx, /data-lien-actif=\{lienActif \? 'true' : undefined\}/);
  // Le morceau de Lien n'appelle jamais `ligneRegle` : c'est là que l'icône
  // serait posée.
  const debutLien = rulesJsx.indexOf('morceau.lien ? (');
  const blocLien = rulesJsx.slice(debutLien, rulesJsx.indexOf(') : (', debutLien));
  assert.doesNotMatch(blocLien, /ligneRegle|IconeLigneRegle/);
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
