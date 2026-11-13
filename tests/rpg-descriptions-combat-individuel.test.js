import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { effetsDetailles, texteCombatIndividuel } from '../src/games/effetIcons.js';
import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';

const description = (id, cle) => effetsDetailles(cardById(id)).pastilles.find((p) => p.cle === cle)?.description;

test('les mots-clés décrivent les cibles individuelles et leurs priorités', () => {
  assert.match(description('valkyrie-au-corbeau', 'envol'), /au sol ou en vol/);
  assert.match(description('valkyrie-au-corbeau', 'envol'), /Sans créature volante adverse accessible.*directement/);
  assert.match(description('danseuse-des-ombres-de-dune', 'infiltration'), /attaque normale.*Attaque ciblée/);
  assert.match(description('feriel', 'coupRapide'), /créature adverse ou directement.*priorité/);
  assert.match(description('feriel', 'coupRapide'), /15 %.*capacités peuvent riposter/);
  assert.match(description('gardienne-des-portes-de-sable', 'defenseur'), /priorité.*Provocation/);
  assert.match(description('gardien-de-la-porte-ardente', 'provocation'), /priorité.*Défenseurs.*\+0\/\+1/);
  assert.match(description('jarl-au-marteau-de-guerre', 'overkill'), /dépassent la défense/);
});

test('les textes complets accessibles remplacent les anciennes règles sans perdre les autres capacités', () => {
  const garde = cardById('gardien-de-la-porte-ardente');
  const texte = texteCombatIndividuel(garde);
  assert.match(texte, /Défenseur —.*priorité/);
  assert.match(texte, /Provocation —.*\+0\/\+1/);
  assert.match(texte, /Quand une créature adverse le cible avec Attaque ciblée.*1 dégât/);
  assert.doesNotMatch(texte, /doit être bloqué/);
  assert.match(garde.text, /doit être bloquée/, 'le catalogue ne change pas');
  assert.match(texteCombatIndividuel(cardById('valkyrie-au-corbeau')), /Quand elle arrive : piochez/);
});

test('les déclencheurs décrivent le duel et respectent le timing propre à chaque mode', () => {
  for (const id of ['tour-des-flots', 'le-cavalier-de-vapeur']) {
    const carte = cardById(id);
    assert.match(texteCombatIndividuel(carte), /attaque normale.*avant les blessures de combat/, id);
    const moba = rpgMobaCartePourApercu(carte);
    assert.match(texteCombatIndividuel(moba), /attaque normale.*après les blessures de combat/, id);
    assert.match(rpgMobaNotesCarte(carte).join(' '), /après les blessures/, id);
  }
  assert.match(effetsDetailles(cardById('vampire-des-braises')).texte, /attaque normale.*avant les blessures/);
  assert.match(effetsDetailles(cardById('tour-de-braise')).texte, /attaque normale.*dégât de sort.*avant les blessures/);
  assert.doesNotMatch(effetsDetailles(cardById('tour-des-flots')).texte, /doit bloquer/);
});
