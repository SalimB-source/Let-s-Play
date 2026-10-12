import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/games/RpgDuelPage.jsx');
const overlay = read('../src/games/RpgTutorialOverlay.jsx');
const tutorial = read('../src/games/rpgTutorial.js');
const cardGuide = read('../src/games/RpgCardGuide.jsx');
const cardGuideCss = read('../src/games/rpg-card-guide.css');
const cardLessons = read('../src/games/rpgCardLessons.js');
const css = read('../src/games/rpg-tutorial.css');

assert.match(page, /Apprendre à jouer/u, 'le menu Jouer propose une entrée vers le tutoriel débutant');
assert.match(page, /Cartes & effets/u, 'le menu Jouer ouvre aussi le guide des autres cartes et capacités');
assert.match(page, /screen === 'guide'[\s\S]*?<RpgCardGuide/u, 'le guide avancé est une section dédiée, distincte du duel débutant');
assert.match(cardGuide, /data-tutorial-target="card-guide-examples"[\s\S]*?<RpgTutorialOverlay/u,
  'le guide avance avec le même voile et le même spotlight que le tutoriel de duel');
assert.match(cardGuide, /target\.scrollIntoView\(\{ behavior: mouvementReduit \? 'auto' : 'smooth', block: 'center'/u,
  'chaque carte étudiée est amenée dans la fenêtre avant le repositionnement du spotlight');
assert.match(cardGuideCss, /\.rpg-card-guide__header \.rpg-menu-button--resume\s*\{\s*width:\s*auto;\s*margin-top:\s*0;/u,
  'le bouton de reprise ne rétrécit pas la colonne de titre du guide');
assert.match(cardLessons, /terrain-hybride[\s\S]*?contresorts[\s\S]*?furie[\s\S]*?coup-rapide/u,
  'les fiches couvrent les terrains, les magies et les capacités de créature');
assert.match(page, /<RpgTutorialOverlay[\s\S]*?onNext=\{continuerTutoriel\}[\s\S]*?onClose=\{fermerTutoriel\}/u,
  'la partie affiche une fenêtre de tutoriel avec des commandes de progression et de fermeture');
for (const target of [
  'opponent-health', 'hand', 'terrain-card', 'mana-terrain', 'creature-card', 'played-creature',
  'end-turn', 'enemy-field', 'attack-all', 'confirm-attack', 'player-field',
]) {
  assert.ok(tutorial.includes(`data-tutorial-target=\"${target}\"`)
    || page.includes(`'${target}'`), `la cible « ${target} » est reliée à l’interface du duel`);
}
assert.match(overlay, /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="rpg-tutorial-title"/u,
  'l’encadré est un dialogue accessible avec titre annoncé');
assert.match(overlay, /rpg-tutorial__spotlight[\s\S]*?spotlight\.width/u,
  'la fenêtre lumineuse suit les dimensions réelles de la cible');
assert.match(overlay, /rpg-tutorial__target-guard/u,
  'les étapes explicatives bloquent les clics accidentels sur leur cible');
assert.match(css, /\.rpg-tutorial__shade\s*\{[^}]*pointer-events:\s*auto/s,
  'les zones assombries empêchent les actions hors cible');
assert.match(css, /\.rpg-tutorial__spotlight\s*\{[^}]*border:\s*2px solid/s,
  'la zone importante est visiblement encadrée');
assert.match(css, /@media \(max-height: 480px\)/u,
  'la fenêtre explicative est adaptée au format paysage des téléphones');

console.log('✓ Tutoriels du Sablier : parcours débutant, guide des types/effets, exemples catalogue, spotlight et adaptation mobile');
