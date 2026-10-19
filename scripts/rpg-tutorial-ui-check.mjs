import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/games/RpgDuelPage.jsx');
const overlay = read('../src/games/RpgTutorialOverlay.jsx');
const menu = read('../src/games/RpgTutorialMenu.jsx');
const tutorial = read('../src/games/rpgTutorial.js');
const css = read('../src/games/rpg-tutorial.css');
const cardGuide = read('../src/games/RpgCardGuide.jsx');
const cardGuideCss = read('../src/games/rpg-card-guide.css');

assert.match(page, /Apprendre à jouer/u, 'le menu Jouer propose une entrée vers les tutoriels');
assert.match(page, /onChangeScreen\('tutoriels'\)/u, '« Apprendre à jouer » ouvre le choix des leçons');
assert.match(page, /screen === 'tutoriels'[\s\S]*?<RpgTutorialMenu/u, 'le choix des leçons est une section dédiée');
assert.match(menu, /tutoriels\.map/u, 'le menu affiche une carte par leçon');
assert.match(menu, /data-tutorial-start=\{tutoriel\.id\}/u, 'chaque leçon a son bouton de départ');
assert.match(menu, /tutoriel\.reward/u, 'chaque carte annonce sa récompense');
assert.match(menu, /crédits ◈/u, 'le menu précise que la récompense est en crédits');
assert.match(tutorial, /id: 'maree-des-abysses'[\s\S]*?id: 'balance-des-heures'[\s\S]*?id: 'serment-du-soleil-rouge'[\s\S]*?id: 'serment-des-neuf-hivers'/u,
  'les cinq archétypes sont présents dans l’ordre du menu');
assert.match(tutorial, /scriptedAnnonce: \{ cardId: 'lame-de-mer'/u, 'la leçon Eau scénarise une annonce à contrer');
assert.match(tutorial, /scriptedAnnonce: \{ cardId: 'feux-de-kitsune'/u, 'la leçon Ténèbres scénarise le sort de zone');

assert.match(page, /<RpgTutorialOverlay[\s\S]*?tutorialName=\{tutorielCourant\?\.name/u,
  'l’encadré affiche le nom de la leçon choisie');
assert.match(page, /<RpgTutorialOverlay[\s\S]*?reward=\{tutorielCourant\?\.reward/u,
  'l’encadré affiche la récompense de la leçon');
assert.match(page, /<RpgTutorialOverlay[\s\S]*?rewardClaimed=/u,
  'l’encadré sait qu’une récompense a déjà été remise');
assert.match(page, /rpg-tutorial-reward-toast/u, 'la récompense encaissée apparaît dans un toast');
assert.match(page, /reclamerTutoriel\(tutorielCourant\.id, tutorielCourant\.reward\)/u,
  'la fin de la leçon passe par la bourse');

assert.match(overlay, /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="rpg-tutorial-title"/u,
  'l’encadré est un dialogue accessible avec titre annoncé');
assert.match(overlay, /rpg-tutorial__spotlight[\s\S]*?spotlight\.width/u,
  'la fenêtre lumineuse suit les dimensions réelles de la cible');
assert.match(overlay, /rpg-tutorial__target-guard/u,
  'les étapes explicatives bloquent les clics accidentels sur leur cible');
assert.match(overlay, /step\.kind === 'action'/u, 'une étape d’action laisse la cible cliquable');

assert.match(css, /\.rpg-tutorial__shade\s*\{[^}]*pointer-events:\s*auto/s,
  'les zones assombries empêchent les actions hors cible');
assert.match(css, /\.rpg-tutorial__spotlight\s*\{[^}]*border:\s*2px solid/s,
  'la zone importante est visiblement encadrée');
assert.match(css, /\.rpg-tutoriels__grid/u, 'le choix des leçons a sa grille');
assert.match(css, /\.rpg-tutorial-reward-toast/u, 'le toast de récompense est mis en forme');
assert.match(css, /@media \(max-height: 480px\)/u,
  'la fenêtre explicative est adaptée au format paysage des téléphones');

for (const target of [
  'opponent-health', 'hand', 'mana-track', 'player-health', 'player-field', 'enemy-field',
  'attack-all', 'confirm-attack', 'resolve-combat', 'end-turn',
  'spell-announcement', 'respond-annonce', 'pass-annonce',
]) {
  assert.ok(tutorial.includes(`data-tutorial-target="${target}"`) || page.includes(`'${target}'`),
    `la cible « ${target} » est reliée à l’interface du duel`);
}
assert.match(page, /cibleTutoriel\('player-health'\)/u, 'la plaque du joueur sert de cible');
assert.match(page, /cibleTutoriel\('spell-announcement'\)/u, 'la section d’annonce sert de cible');
assert.match(page, /preparerEtapeTutoriel\(duelRef\.current, etape\)/u,
  'une étape peut installer sa scène en arrivant');

// Le guide des cartes reste un parcours distinct, avec le même voile.
assert.match(page, /Cartes & effets/u, 'le menu Jouer ouvre aussi le guide des autres cartes');
assert.match(page, /screen === 'guide'[\s\S]*?<RpgCardGuide/u, 'le guide avancé est une section distincte');
assert.match(cardGuide, /data-tutorial-target="card-guide-examples"[\s\S]*?<RpgTutorialOverlay/u,
  'le guide avance avec le même voile et le même spotlight');
assert.match(cardGuide, /target\.scrollIntoView\(\{ behavior: mouvementReduit \? 'auto' : 'smooth', block: 'center'/u,
  'chaque carte étudiée est amenée dans la fenêtre avant le repositionnement du spotlight');
assert.match(cardGuideCss, /\.rpg-card-guide__header \.rpg-menu-button--resume\s*\{\s*width:\s*auto;\s*margin-top:\s*0;/u,
  'le bouton de reprise ne rétrécit pas la colonne de titre du guide');

console.log('✓ Tutoriels du Sablier : choix de cinq leçons, spotlight, scènes préparées et récompenses en crédits');
