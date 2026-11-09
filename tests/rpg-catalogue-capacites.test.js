import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { capacitesDuCatalogue, carteACapacite } from '../src/games/rpgCatalogueCapacites.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';

const options = capacitesDuCatalogue(RPG_DUEL_CARDS);

test('le filtre propose uniquement les capacités réellement imprimées, sans doublon ni entrée périmée', () => {
  const cles = RPG_DUEL_CARDS.flatMap((carte) => pastillesPourCarte(carte).map(({ cle }) => cle));
  assert.deepEqual(new Set(options.map(({ cle }) => cle)), new Set(cles));
  assert.equal(options.length, new Set(cles).size);
  assert.ok(options.every(({ label }) => label && label !== 'undefined'));
  assert.equal(options.find(({ cle }) => cle === 'reactionTourAdverse').label, 'Embuscade');
  assert.equal(options.find(({ cle }) => cle === 'coupRapide').label, 'Attaque ciblée');
  assert.equal(options.find(({ cle }) => cle === 'protection').label, 'Bouclier élémentaire');
  assert.notEqual(options.find(({ cle }) => cle === 'protection').label,
    options.find(({ cle }) => cle === 'bouclier').label);
  const triees = [...options].sort((a, b) => a.label.localeCompare(b.label, 'fr') || a.cle.localeCompare(b.cle, 'fr'));
  assert.deepEqual(options, triees);
});

test('le filtre suit les pierres de capacités, se combine aux autres filtres et ne confond pas le texte avec une capacité', () => {
  const vampire = cardById('sorcier-du-ressac-noir');
  const tislit = cardById('tislit-des-aures');
  const ecueil = cardById('ecueil');
  assert.ok(carteACapacite(vampire, 'reactionTourAdverse'));
  assert.ok(carteACapacite(vampire, 'coupRapide'));
  assert.ok(carteACapacite(vampire, 'contresort'), 'son contre de créature est une capacité filtrable');
  assert.ok(carteACapacite(tislit, 'coupRapide'));
  assert.ok(!carteACapacite(tislit, 'reactionTourAdverse'));
  assert.ok(carteACapacite(ecueil, 'contresort'));
  assert.ok(!carteACapacite(ecueil, 'coupRapide'));
  assert.ok(!carteACapacite(cardById('chien-du-guet'), 'coupRapide'));
  assert.ok(carteACapacite(cardById('chien-du-guet'), 'toutes'));
  const hybridesAvecEmbuscade = RPG_DUEL_CARDS.filter((carte) => cardColors(carte).length > 1
    && carteACapacite(carte, 'reactionTourAdverse'));
  assert.ok(hybridesAvecEmbuscade.some(({ id }) => id === vampire.id));
  assert.ok(hybridesAvecEmbuscade.every((carte) => pastillesPourCarte(carte).some(({ cle }) => cle === 'reactionTourAdverse')));
});

test('le catalogue rend le sélecteur de capacité et le réinitialise avec les autres filtres', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /aria-label="Filtrer par capacité" value=\{catalogueCapacite\}/);
  assert.match(page, /CAPACITES_CATALOGUE\.map\(\(\{ cle, label \}\) => <option key=\{cle\} value=\{cle\}>\{label\}<\/option>\)/);
  assert.match(page, /&& carteACapacite\(carte, catalogueCapacite\)/);
  assert.match(page, /setCatalogueCapacite\('toutes'\)/);
  assert.match(page, /\|\| catalogueCapacite !== 'toutes'/);
});

test('seules les vignettes du catalogue réduisent ensemble les pierres d’effet, de coût et de couleur', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle">
    <div class="rpg-card-catalogue__art">
      <span class="rpg-card-element-badge is-plaque"></span>
      <span class="rpg-mana-cost is-plaque"><b>4</b></span>
      <span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--catalogue"></span>
    </div>
    <div class="rpg-hover-card-preview__face"><span class="rpg-card-element-badge is-plaque"></span></div>
  </div>`, { virtualConsole: new VirtualConsole() });
  const get = (selector, prop) => dom.window.getComputedStyle(dom.window.document.querySelector(selector)).getPropertyValue(prop).trim();
  const petit = 'clamp(16px,16cqw,28px)';
  for (const selector of [
    '.rpg-card-catalogue__art > .rpg-card-element-badge',
    '.rpg-card-catalogue__art > .rpg-mana-cost',
    '.rpg-card-catalogue__art > .rpg-card-icones',
  ]) assert.equal(get(selector, '--rpg-plaque-taille'), petit, selector);
  assert.equal(get('.rpg-card-catalogue__art > .rpg-mana-cost', '--rpg-cout-taille'),
    'calc(var(--rpg-plaque-taille)*1.12)');
  assert.equal(get('.rpg-hover-card-preview__face > .rpg-card-element-badge', '--rpg-plaque-taille'),
    'clamp(24px,26cqw,52px)', 'la fiche ouverte garde ses grands repères');
  dom.window.close();
});
