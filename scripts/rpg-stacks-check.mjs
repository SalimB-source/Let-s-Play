import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-stacks-smoke.jsx', outDir: 'node_modules/.cache/rpg-stacks', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkRpgCardStacks } = await import('../node_modules/.cache/rpg-stacks/rpg-stacks-smoke.js');
  await checkRpgCardStacks(assert);
  console.log('✓ Piles de cartes homonymes au doigt (main et camp du joueur) : les exemplaires identiques ne forment qu’un emplacement avec son compteur ×N, la pile agit sur l’exemplaire prêt, le compteur déplie le groupe et la puce ×N le replie, un groupe se déplie seul dès qu’un exemplaire est déclaré attaquant, et les pioches remplissent la pile sans élargir la main');
  console.log('✓ Piles de cartes homonymes au doigt (camp du sorcier) : les créatures adverses identiques s’empilent aussi, le groupe se déplie pendant son attaque pour que chaque attaquant reste visible et recevable, un bloqueur s’assigne depuis la pile repliée du joueur, puis les créatures engagées restent séparées de celles encore prêtes');
  console.log('✓ Créature équipée d’une arme (tactile et ordinateur) : aucun effet ni bonus sur la face jouée ; le survol, l’appui long et la fiche montrent la miniature de l’arme et les effets directs en bleu');
  console.log('✓ Compteurs d’effet : Heures et sable se lisent en losanges sous la couleur d’une mono ou sous le coût bicolore d’une hybride ; ils suivent les valeurs, restent accessibles et disparaissent à zéro');
} finally { dom.window.close(); }
