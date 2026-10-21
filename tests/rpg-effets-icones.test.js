import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cardById,
  libelleModificationStats,
  modificationStats,
  RPG_DUEL_CARDS,
} from '../src/games/rpgCards.js';
import {
  EFFETS_SPRITE,
  EFFET_ICONE,
  effetIcon,
  pastillesPourCarte,
  iconePourLigne,
  effetsDetailles,
  definitionPastille,
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
});

test('les pastilles lisent les mots-clés imprimés des fiches', () => {
  assert.deepEqual(pastillesDe('fennec-des-decombres'), ['Rapidité', 'Butin']);
  assert.deepEqual(pastillesDe('jarl-au-marteau-de-guerre'), ['Furie 3']);
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
});

test('l’icône d’une ligne de règle est celle que la phrase annonce', () => {
  const fennec = cardById('fennec-des-decombres');
  assert.equal(iconePourLigne(fennec, 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.'), 'butin',
    'Butin se lit avant Pioche : c’est le premier motif de la phrase');
  assert.equal(iconePourLigne(fennec, 'Rapidité — Cette créature peut attaquer le tour où elle arrive.'), 'rapidite');

  const ecueil = cardById('ecueil');
  assert.equal(iconePourLigne(ecueil, ecueil.text), 'contresort',
    '« Magie Rapide » nomme la famille du sort, pas le mot-clé Rapidité');

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
  assert.equal(jarl.pastilles[0].description, 'La première fois qu’il est blessé et survit, le Jarl gagne +3/+3.');

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

// ── L'effet chiffré d'un sort : « -2/-2 » écrit sur la carte ────────────────

test('les cartes qui modifient les statistiques affichent leur chiffre', () => {
  // Sans cette pastille, le -2/-2 de la Lame de mer ne vivait que dans sa
  // phrase de règle — et une face de carte n'imprime pas la règle.
  assert.deepEqual(pastillesDe('lame-de-mer'), ['Affaiblissement -2/-2']);
  assert.deepEqual(pastillesDe('embuscade'), ['Affaiblissement -2/-2'],
    'l’Embuscade rabote toute la table adverse de -2/-2');
  assert.deepEqual(pastillesDe('vipere-de-verre'), ['Affaiblissement -2/0'],
    'la vipère ne retire que de l’attaque : la défense reste à 0');
  assert.deepEqual(pastillesDe('colosse-de-sel'), ['Renfort +1/+1'],
    'une arrivée qui renforce s’écrit en positif');
  assert.deepEqual(pastillesDe('lame-de-mer').length, pastillesPourCarte(cardById('lame-de-mer')).length,
    'une seule pastille par carte');
});

test('la pastille chiffrée explique le malus, statistique par statistique', () => {
  const lire = (id) => definitionPastille(pastillesPourCarte(cardById(id))[0]);
  assert.equal(lire('lame-de-mer'),
    'La cible perd 2 en attaque et 2 en défense. Si sa défense tombe à 0, elle est détruite.');
  assert.equal(lire('vipere-de-verre'),
    'La cible perd 2 en attaque. Si sa défense tombe à 0, elle est détruite.',
    'la vipère ne dit pas qu’elle retire de la défense');
  assert.equal(lire('colosse-de-sel'), 'La cible gagne 1 en attaque et 1 en défense.');
});

test('le chiffre de la carte se lit aussi hors des pastilles', () => {
  const modif = (id) => modificationStats(cardById(id));
  assert.deepEqual(modif('lame-de-mer'), { atk: -2, def: -2 });
  assert.deepEqual(modif('vipere-de-verre'), { atk: -2, def: 0 });
  assert.equal(libelleModificationStats(cardById('lame-de-mer')), '-2/-2');
  assert.equal(libelleModificationStats(cardById('colosse-de-sel')), '+1/+1');
  // Une arme garde son bonus de porteur : pas de doublon chiffré.
  assert.equal(modif('khopesh-d-or'), null);
  assert.equal(libelleModificationStats(cardById('khopesh-d-or')), null);
  // Un sort qui ne touche pas aux statistiques n’écrit rien.
  assert.equal(libelleModificationStats(cardById('trait-de-braise')), null);
});
