import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const lire = fichier => readFileSync(new URL(`../src/games/${fichier}`, import.meta.url), 'utf8');

test('sélection multiple avant sacrifice, désélection et annulation sans paiement', () => {
  const page = lire('RpgDuelPage.jsx');
  const selection = page.slice(page.indexOf('  const dechirerEtPoser ='), page.indexOf('  const equiperArme ='));
  assert.match(selection, /sacrificesChoisis\.includes\(entite.id\)/);
  assert.match(selection, /sacrificesChoisis\.filter\(id => id !== entite.id\)/);
  const attente = selection.indexOf('if (choisis.length < sacrificesInvocation');
  assert.ok(attente > 0);
  assert.ok(selection.indexOf('return;', attente) < selection.indexOf('setSacrificeFx'));
  assert.match(selection, /sacrificeEnCoursRef.current = \{ carteId, sacrificeIds: choisis \}/);
  assert.match(selection, /finaliserPoseCreature\(enCours.carteId, enCours.sacrificeIds\)/);
  const annuler = page.slice(page.indexOf('  const annulerSacrifice ='), page.indexOf('  const confirmerSacrifice ='));
  assert.match(annuler, /setSacrificesChoisis\(\[\]\)/);
  assert.doesNotMatch(annuler, /rpgJouerCreature|rpgSacrifierCreature|payer/);
  assert.match(page, /if \(!invocationPossible\(duel, 'joueur', carte\)\) return false/);
  assert.doesNotMatch(page, /if \(duel.modeMana === RPG_MODE_MANA_ESSAI && duel.joueur.creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX\) \{\s*setSacrificeEnCours/);
  assert.match(page, /Invocation · coût/);
  assert.match(page, /setSacrificeEnCours\(null\);\s*setSacrificesChoisis\(\[\]\);\s*setPoseEnCours\(null\)/);
});

test('emplacements et cartes partagent la gouttière élargie sur PC et téléphone', () => {
  const css = lire('rpg-mana-essai.css');
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle" data-mode-mana="essai"><div class="card-table"><div class="card-row"><div class="rpg-creature-slots"></div></div></div></div>`, { virtualConsole: new VirtualConsole() });
  const w = dom.window;
  const root = w.document.querySelector('.rpg-battle');
  const row = w.document.querySelector('.card-row');
  assert.match(css, /column-gap: clamp\(20px, 1.8vw, 30px\)/);
  assert.equal(w.getComputedStyle(row).columnGap, '20px');
  root.classList.add('rpg-battle--touch');
  assert.equal(w.getComputedStyle(row).columnGap, 'max(10px, calc(var(--duel-card, 64px) * .19))');
  assert.match(css, /\.rpg-creature-slots\s*\{[^}]*gap: inherit;/);
  dom.window.close();
});
