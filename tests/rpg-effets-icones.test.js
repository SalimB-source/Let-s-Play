import test from 'node:test';
import assert from 'node:assert/strict';

import { cardById, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';
import {
  EFFETS_SPRITE,
  EFFET_ICONE,
  effetIcon,
  pastillesPourCarte,
  iconePourLigne,
  effetsDetailles,
} from '../src/games/effetIcons.js';

const pastillesDe = (id) => pastillesPourCarte(cardById(id))
  .map((pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label));

test('le sprite porte les 25 symboles validés, un par effet', () => {
  const symboles = [...EFFETS_SPRITE.matchAll(/<symbol id="(i-[a-z-]+)"/g)].map((m) => m[1]);
  assert.equal(symboles.length, 25);
  for (const icone of new Set(Object.values(EFFET_ICONE))) {
    assert.ok(symboles.includes(icone), `${icone} est dans le sprite`);
  }
  assert.equal(effetIcon('butin').includes('<use href="#i-butin"/>'), true);
  assert.equal(effetIcon('furie').includes('<use href="#i-furie"/>'), true);
  const furie = EFFETS_SPRITE.match(/<symbol id="i-furie"[^>]*>(.*?)<\/symbol>/)?.[1] ?? '';
  assert.ok(furie.includes('M7.1 11.3C5.3 10.3 3.8 8.2 3.1 5.4'),
    'la Furie est dessinée comme un casque viking : corne gauche relevée');
  assert.ok(furie.includes('M16.9 11.3c1.8-1 3.3-3.1 4-5.9'),
    'la Furie est dessinée comme un casque viking : corne droite relevée');
  assert.ok(furie.includes('M6.7 15.2v-2.7c0-3 2.4-5.4 5.3-5.4'),
    'la coupole du casque viking est dans le sprite');
  assert.ok(furie.includes('M10.9 15.2h2.2l-.4 4.2h-1.4z'),
    'le nasal central du casque viking est dans le sprite');
  assert.equal(furie.includes('M7 4c2.6 4.4 3.2 10.6 1.2 16'), false,
    'l’ancien dessin de Furie a disparu');
});

test('les pastilles lisent les mots-clés imprimés des fiches', () => {
  assert.deepEqual(pastillesDe('fennec-des-decombres'), ['Rapidité', 'Butin']);
  assert.deepEqual(pastillesDe('jarl-au-marteau-de-guerre'), ['Furie 3']);
  assert.deepEqual(pastillesDe('loup-des-neiges'), ['Furie 1']);
  assert.deepEqual(pastillesDe('valkyrie-des-glaces'), ['Envol', 'Protection Braise'],
    'Envol et Protection, sans aucune Résonance');
  assert.deepEqual(pastillesDe('valkyrie-au-corbeau'), ['Envol'],
    'la Valkyrie au corbeau ne porte plus de pastille Résonance');
  assert.deepEqual(pastillesDe('onna-musha-des-cendres'), ['Esquive', 'Honneur 1']);
  assert.deepEqual(pastillesDe('samourai-du-torii'), ['Résonance samouraï', 'Honneur 1']);
  assert.deepEqual(pastillesDe('tiziri-du-djurdjura'), ['Protection Braise']);
  assert.deepEqual(pastillesDe('tin-hinan'), ['Infiltration'], 'elle donne Infiltration, la pastille le dit');
  assert.deepEqual(pastillesDe('desert'), [], 'un terrain ne porte aucune pastille');
});

test('les pastilles nomment l’effet signé des sorts', () => {
  assert.deepEqual(pastillesDe('ecueil'), ['Contresort']);
  assert.deepEqual(pastillesDe('reanimation'), ['Réanimation']);
  assert.deepEqual(pastillesDe('bakunawa'), ['Blocage interdit']);
  assert.deepEqual(pastillesDe('mur-de-boucliers'), ['Overkill'],
    'un sort qui prête Overkill porte la pastille du mot-clé accordé');
});

test('l’icône d’une ligne de règle est celle que la phrase annonce', () => {
  const fennec = cardById('fennec-des-decombres');
  assert.equal(iconePourLigne(fennec, 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.'), 'butin',
    'Butin se lit avant Pioche : c’est le premier motif de la phrase');
  assert.equal(iconePourLigne(fennec, 'Rapidité — Cette créature peut attaquer le tour où elle arrive.'), 'rapidite');

  const ecueil = cardById('ecueil');
  assert.equal(iconePourLigne(ecueil, ecueil.text), 'contresort',
    '« Magie Rapide » nomme la famille du sort, pas le mot-clé Rapidité');

  const corbeau = cardById('valkyrie-au-corbeau');
  assert.equal(iconePourLigne(corbeau, 'Quand elle arrive : piochez une carte de type Viking au hasard dans votre deck.'), 'pioche',
    'l’arrivée de la Valkyrie se lit comme une pioche');

  const maitre = cardById('maitre-du-marteau');
  assert.equal(iconePourLigne(maitre, 'Quand il arrive, son marteau inflige 2 dégâts à toutes les créatures adverses.'), 'degats');

  const reanimation = cardById('reanimation');
  assert.equal(iconePourLigne(reanimation, reanimation.text), 'reanimation');

  const kenshi = cardById('kenshi-de-la-forge');
  assert.equal(iconePourLigne(kenshi, kenshi.text.split(/(?<=[.!?])\s+/)[0]), 'aura',
    'à défaut de motif, l’aura de la fiche tranche');

  assert.equal(iconePourLigne(cardById('desert'), 'Produit du mana de Sable.'), null,
    'aucun motif, aucun effet : pas d’icône forcée');
});

test('chaque pastille dit ce qu’elle fait, et son explication quitte le texte de l’aperçu', () => {
  const feriel = effetsDetailles(cardById('feriel'));
  assert.deepEqual(feriel.pastilles.map((pastille) => pastille.label), ['Rapidité', 'Coup rapide']);
  assert.equal(feriel.pastilles[0].description, 'Peut attaquer le tour où elle arrive.',
    '« Rapidité. » ne s’explique pas sur la fiche : le glossaire prend le relais');
  assert.match(feriel.pastilles[1].description, /^Sélectionnée pour attaquer, Fériel peut frapper.*Si vous ne désignez personne, elle attaque normalement\.$/u,
    'la bulle reprend la phrase imprimée, précision comprise');
  assert.equal(feriel.texte, '', 'tout le texte de Fériel est passé dans ses pastilles');

  const faussoyeur = effetsDetailles(cardById('faussoyeur-des-dunes'));
  assert.equal(faussoyeur.pastilles.find((pastille) => pastille.cle === 'butin').description,
    'Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.');
  assert.equal(faussoyeur.texte, 'Quand le Faussoyeur arrive : renvoyez une créature de votre cimetière dans votre main.',
    'un autre déclencheur n’appartient pas au mot-clé qui le précède : il reste écrit');

  const susanoo = effetsDetailles(cardById('susanoo'));
  assert.match(susanoo.pastilles.find((pastille) => pastille.cle === 'exil').description, /ne va pas au cimetière/u);
  assert.equal(susanoo.texte, 'Quand Susanoo arrive en jeu, retirez de la partie une créature de votre choix.',
    'une pastille qui ne nomme pas la phrase ne la cache pas');

  const jarl = effetsDetailles(cardById('jarl-au-marteau-de-guerre'));
  assert.equal(jarl.pastilles[0].description,
    'Tant que sa défense actuelle est inférieure à sa DEF de base, elle gagne +3/+0.',
    'la fiche dit seulement « Furie 3. » : la pastille explique l’état, en une phrase');
  assert.equal(jarl.texte, '', 'le mot-clé sobre ne laisse aucun pavé de règle sur la face');

  const corbeau = effetsDetailles(cardById('valkyrie-au-corbeau'));
  assert.deepEqual(corbeau.pastilles.map((pastille) => pastille.label), ['Envol']);
  assert.equal(corbeau.texte,
    'Quand elle arrive : piochez une carte de type Viking au hasard dans votre deck.',
    'la pioche tribale d’arrivée reste écrite dans l’aperçu');

  const mur = effetsDetailles(cardById('mur-de-boucliers'));
  assert.equal(mur.pastilles.find((pastille) => pastille.cle === 'overkill').description,
    'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.');
  assert.equal(mur.texte, cardById('mur-de-boucliers').text,
    'la portée collective et la durée restent écrites sur le sort');

  assert.deepEqual(effetsDetailles(cardById('desert')), { pastilles: [], texte: cardById('desert').text });
});

test('un aperçu rend lisible tout ce que la fiche imprime', () => {
  // Dans un aperçu, les mots-clés deviennent des pastilles : le nom s’affiche
  // dans la pastille, et son explication se déroule dessous (`deplier`) au lieu
  // d’attendre un survol que la colonne de l’aperçu ne reçoit pas. Le texte de
  // règle, lui, ne garde que ce qu’aucune pastille ne nomme. Ce qui est retiré
  // de l’un doit donc se retrouver dans l’autre : pas un mot de la fiche ne
  // disparaît de l’écran, sinon la carte ne se lit plus — c’est ce qui arrivait
  // à dix-neuf fiches réduites à deux mots qu’il fallait survoler.
  const mots = (texte) => new Set(String(texte).toLowerCase().match(/[a-z0-9à-ÿ]+/gu) ?? []);
  const libelle = (pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label);
  for (const carte of RPG_DUEL_CARDS) {
    if (carte.kind === 'terrain' || !carte.text || carte.text === '—') continue;
    const { pastilles, texte } = effetsDetailles(carte);
    const affiches = mots([
      texte,
      ...pastilles.map(libelle),
      ...pastilles.map((pastille) => pastille.description),
    ].filter(Boolean).join(' '));
    for (const mot of mots(carte.text)) {
      assert.ok(affiches.has(mot), `${carte.id} : « ${mot} » s’affiche nulle part dans son aperçu`);
    }
  }
});
