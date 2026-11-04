import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { RPG_STORY_TOWER_THEMES, createStoryTowerModel, disposeStoryTowerModel } from '../src/games/rpgStoryTowerModels.js';
import { createStoryTowerRuin } from '../src/games/rpgStoryTowerScene.js';
import { tourEstTerminee } from '../src/games/rpgStory.js';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

/**
 * Une tour terminée — tous ses étages déblayés — se montre en ruine fumante.
 * La règle est dans `rpgStory.js`, la maquette brisée dans
 * `rpgStoryTowerScene.js`, et la page ne fait que les brancher.
 */
test('une tour est terminée quand son dernier étage est debout... vaincu', () => {
  const tour = RPG_STORY_TOURS[0];
  const ids = tour.etages.map((etage) => etage.id);
  const progression = (vaincus) => ({ version: 2, etagesVaincus: vaincus, recit: null });

  assert.equal(tourEstTerminee(tour.id, progression([])), false, 'une tour neuve est intacte');
  assert.equal(tourEstTerminee(tour.id, progression(ids.slice(0, -1))), false,
    'il reste un étage : la tour tient encore');
  assert.equal(tourEstTerminee(tour.id, progression(ids)), true, 'tous les étages : la tour est tombée');
  assert.equal(tourEstTerminee('tour-inconnue', progression(ids)), false,
    'une tour inconnue n’est jamais « terminée »');
});

test('la ruine 3D est bien la tour, brisée et fumante', () => {
  for (const tour of RPG_STORY_TOURS) {
    const model = createStoryTowerModel(tour.id);
    const ruin = createStoryTowerRuin(model, RPG_STORY_TOWER_THEMES[tour.id], tour.id);
    try {
      const bounds = new THREE.Box3().setFromObject(model);
      // Le sommet est retiré : au moins un plan de coupe l'exclut.
      const sommet = new THREE.Vector3(0, bounds.max.y, 0);
      assert.ok(ruin.planes.some((plan) => plan.distanceToPoint(sommet) < 0),
        `${tour.id} : le sommet de la tour est emporté`);
      // Le socle reste : le bas de la tour survit à la coupe.
      const socle = new THREE.Vector3(0, bounds.min.y + 0.2, 0);
      assert.ok(ruin.planes.every((plan) => plan.distanceToPoint(socle) >= 0),
        `${tour.id} : le socle de la tour est conservé`);
      // Plusieurs plans inclinés : une brèche en biseau, pas une section nette.
      assert.ok(ruin.planes.length >= 3);
      const normaux = new Set(ruin.planes.map((plan) => plan.normal.toArray().map((v) => v.toFixed(2)).join(',')));
      assert.equal(normaux.size, ruin.planes.length, `${tour.id} : aucune coupe n’est parallèle à une autre`);

      // Gravats, bouchon et fumée : la ruine se lit sans la peinture.
      const noms = ruin.group.children.map((enfant) => enfant.name);
      assert.ok(noms.includes(`fumee-${tour.id}`), 'la fumée appartient à la ruine');
      assert.ok(ruin.group.children.length >= 15, 'la ruine porte ses gravats, ses braises et sa fumée');
      const fumee = ruin.group.children.find((enfant) => enfant.name === `fumee-${tour.id}`);
      assert.ok(fumee.isPoints && fumee.geometry.attributes.position.count > 20, 'des volutes, pas un simple voile');
      // Discrète : un gris moyen, une opacité basse, jamais un panache blanc.
      assert.equal(`#${fumee.material.color.getHexString()}`, '#8f8d8a', 'la fumée est grise');
      assert.ok(fumee.material.opacity <= 0.3, 'la fumée reste discrète');
      assert.ok(!fumee.material.depthWrite, 'la fumée ne masque pas la maquette');

      // Plus aucune flamme : la ruine fume mais ne brûle plus.
      const flammes = ruin.group.children.filter((enfant) => enfant.name?.startsWith(`flamme-${tour.id}-`));
      assert.equal(flammes.length, 0, `${tour.id} : aucune flamme sur la ruine`);
      const positions = fumee.geometry.attributes.position.array.slice();
      ruin.update(0.4);
      assert.ok(!positions.every((valeur, index) => valeur === fumee.geometry.attributes.position.array[index]),
        'la fumée monte : ses particules bougent');
      ruin.resize(320, 240, 1.5);
      assert.ok(fumee.material.size > 8, 'la fumée garde une taille lisible en pixels');

      // Aucune ressource partagée avec une autre vue : rien à libérer ailleurs.
      ruin.dispose();
    } finally {
      disposeStoryTowerModel(model);
    }
  }
});

test('la vue de tour passe son état détruit à la scène, sans peinture de repli', () => {
  const composant = lire('../src/games/RpgStoryTowerPreview.jsx');
  assert.match(composant, /export default function RpgStoryTowerPreview\(\{[^}]*detruite = false/,
    'la vue reçoit l’état « détruite »');
  assert.match(composant, /detruite,\n\s*onReady/, 'l’état est transmis au montage 3D');
  assert.match(composant, /\$\{detruite \? ' is-detruite' : ''\}/, 'la classe de ruine est posée sur la scène');
  assert.match(composant, /data-tower-detruite=\{detruite \? 'oui' : 'non'\}/, 'l’état est lisible dans le DOM');
  assert.match(composant, /rpg-story-stage__canvas/, 'le rendu 3D est un canvas');
  assert.doesNotMatch(composant, /rpg-story-stage__fallback/, 'plus d’image de repli : seul le rendu 3D demeure');
  assert.doesNotMatch(composant, /rpg-story-stage__flammes/, 'plus de flammes de repli');
  assert.doesNotMatch(composant, /rpg-story-stage__fumee/, 'plus de fumée de repli');
  assert.match(composant, /\[tour\.id, detail, detruite\]/, 'changer d’état remonte la scène');
});

test('la page Conquête montre la ruine quand la tour est terminée', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  assert.match(page, /const terminee = tourEstTerminee\(tour\.id, progressionHistoire\)/,
    'la galerie demande la règle, pas une comparaison d’écran');
  assert.match(page, /data-tour-terminee=\{terminee \? 'oui' : 'non'\}/, 'la carte de tour annonce son état');
  assert.match(page, /<RpgStoryTowerPreview tour=\{tour\} className="rpg-story-tower__art" detruite=\{terminee\} \/>/,
    'la maquette de la galerie passe en ruine');
  assert.match(page, /const termineeLibre = tourEstTerminee\(tourLibre\.id, progressionHistoire\)/,
    'la tour ouverte suit la même règle');
  assert.match(page, /detail detruite=\{termineeLibre\}/, 'la bannière de la tour ouverte passe aussi en ruine');
});

test('la feuille des tours décrit la ruine, sans repli ni flammes', () => {
  const css = lire('../src/games/rpg-story.css');
  assert.match(css, /\.rpg-story-stage\.is-detruite \{[\s\S]{0,400}background:/, 'la scène détruite a son fond');
  assert.match(css, /\.rpg-story-stage__badge\.rpg-story-stage__badge--ruine \{[\s\S]{0,400}display: inline-flex;/,
    'l’étiquette « tour détruite » reste visible sans 3D');
  // Plus de peinture de repli ni de flammes/fumée CSS : seul le rendu 3D demeure.
  assert.doesNotMatch(css, /rpg-story-stage__fallback/, 'plus de peinture de repli');
  assert.doesNotMatch(css, /rpg-story-stage__flammes/, 'plus de flammes de repli');
  assert.doesNotMatch(css, /rpg-story-stage__fumee/, 'plus de fumée de repli');
  assert.doesNotMatch(css, /@keyframes rpg-story-flamme/, 'plus d’animation de flammes');
  assert.doesNotMatch(css, /@keyframes rpg-story-fumee/, 'plus d’animation de fumée de repli');
  assert.match(css, /\.rpg-story-stage__canvas \{[\s\S]{0,200}opacity: 0;/, 'le canvas 3D attend d’être prêt');
  assert.match(css, /\.rpg-story-stage\.is-ready \.rpg-story-stage__canvas \{ opacity: 1; \}/,
    'le canvas 3D s’affiche une fois prêt');
});
