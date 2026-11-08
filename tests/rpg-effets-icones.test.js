import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cardById,
  libelleModificationStats,
  modificationStats,
  RPG_DUEL_CARDS,
} from '../src/games/rpgCards.js';
import {
  EFFETS_SPRITE,
  EFFET_ICONE,
  PROTECTION_COULEURS,
  couleurProtection,
  couleursProtectionCarte,
  effetIcon,
  pastillesCarte,
  pastillesPourCarte,
  iconePourLigne,
  effetsDetailles,
  effetsEpuisesPourEntite,
  effetsFurieInactifs,
  definitionPastille,
} from '../src/games/effetIcons.js';

const pastillesDe = (id) => pastillesPourCarte(cardById(id))
  .map((pastille) => (pastille.valeur != null && !pastille.valeurMasquee
    ? `${pastille.label} ${pastille.valeur}`
    : pastille.label));

test('les pastilles d’effets sont un peu plus grandes et alignées en colonne', () => {
  const css = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-pastilles\s*\{[^}]*flex-direction: column;[^}]*align-items: flex-start;/s);
  assert.match(css, /\.rpg-pastille\s*\{[^}]*min-height: 28px;[^}]*font: 650 12px\//s);
  // La pastille porte désormais une pierre d'emblème : 20 px, la taille où le
  // pictogramme blanc reste lisible à côté de son libellé.
  assert.match(css, /\.rpg-pastille \.rpg-effet-icone\s*\{[^}]*width: 20px;[^}]*height: 20px;/s);
  assert.match(css, /\.rpg-card-icones\s*\{[^}]*flex-wrap: wrap;/s,
    'les icônes des faces de cartes conservent leur disposition');
});

test('le sprite porte les 42 symboles validés, un par effet', () => {
  const symboles = [...EFFETS_SPRITE.matchAll(/<symbol id="(i-[a-z-]+)"/g)].map((m) => m[1]);
  // Exil a désormais son propre vortex, distinct de la flèche du Rebond :
  // chaque symbole est référencé par `EFFET_ICONE`, aucun n'est orphelin.
  assert.equal(symboles.length, 42);
  assert.deepEqual(symboles.filter((icone) => !new Set(Object.values(EFFET_ICONE)).has(icone)), [],
    'aucun symbole orphelin dans le sprite');
  for (const icone of new Set(Object.values(EFFET_ICONE))) {
    assert.ok(symboles.includes(icone), `${icone} est dans le sprite`);
  }
  assert.equal(effetIcon('butin').includes('<use href="#i-butin"/>'), true);
  assert.equal(EFFET_ICONE.transfert, 'i-transfert');
  assert.notEqual(EFFET_ICONE.transfert, EFFET_ICONE.tribut,
    'le Transfert a sa propre icône, distincte de la balance du Tribut');
  assert.equal(effetIcon('transfert').includes('<use href="#i-transfert"/>'), true);
  for (const id of symboles) {
    const corps = EFFETS_SPRITE.match(new RegExp(`<symbol id="${id}"[^>]*>(.*?)</symbol>`))?.[1];
    if (id !== 'i-abordage') {
      assert.doesNotMatch(corps, /fill="currentColor" stroke="none"/, `${id} garde le dessin au trait`);
    }
  }
  assert.match(EFFETS_SPRITE, /M7.1 11.3C5.3/, 'Furie retrouve son casque à cornes');
  assert.match(EFFETS_SPRITE, /M20.84 4.61/, 'Soin retrouve son cœur au trait');
  assert.equal(EFFET_ICONE.prise, 'i-abordage',
    'la Prise garde le crâne du pirate : la cale et l’Abordage sont la même prise');
  const abordage = EFFETS_SPRITE.match(/<symbol id="i-abordage"[^>]*>(.*?)<\/symbol>/)?.[1];
  assert.ok(abordage, 'le crâne d’Abordage est dans le sprite');
  assert.equal((abordage.match(/<path fill="currentColor" stroke="none"/g) ?? []).length, 2,
    'le crâne et les sabres d’Abordage sont désormais deux silhouettes pleines');
  assert.match(abordage, /fill-rule="evenodd"/, 'les fentes des yeux sont évidées dans la silhouette pleine');
  assert.match(abordage, /M7\.5 9\.6[^"<>]*M16\.5 9\.6/, 'deux fentes inclinées et symétriques sont creusées dans le crâne');
  assert.doesNotMatch(abordage, /<circle|<ellipse/, 'les yeux sont des fentes, pas des cercles');
});

test('Provocation, Rebond, Recherche, Exil et Harakiri portent leurs nouveaux pictogrammes', () => {
  const corps = (id) => EFFETS_SPRITE.match(new RegExp(`<symbol id="${id}"[^>]*>(.*?)</symbol>`))?.[1];
  assert.match(corps('i-provocation'), /M5 11V7a2 2/, 'un poing avec quatre doigts, pas un mégaphone');
  assert.doesNotMatch(corps('i-provocation'), /18 4v16/, 'ancien mégaphone retiré');
  assert.match(corps('i-rebond'), /M12 21V4M4\.5 11\.5 12 4l7\.5 7\.5/, 'flèche verticale vers le haut');
  assert.match(corps('i-recherche'), /<circle cx="10\.5" cy="10\.5" r="6\.5"\/>/, 'loupe seule');
  assert.doesNotMatch(corps('i-recherche'), /<rect/, 'plus de document derrière la loupe');
  assert.equal(EFFET_ICONE.exil, 'i-exil');
  assert.match(corps('i-exil'), /M19 7a9 9 0 1 0 2 5/, 'un vortex en spirale simple');
  assert.equal((corps('i-exil').match(/<path /g) ?? []).length, 1, 'plus de petite flèche ni de trait supplémentaire');
  assert.notEqual(EFFET_ICONE.exil, EFFET_ICONE['retour-main'], 'Exil ne reprend plus la flèche de Rebond');
  assert.match(corps('i-honneur'), /M22 2 10\.5 11\.5l2 2L22 2z/, 'le couteau diagonal se termine sur une pointe aiguë');
  assert.doesNotMatch(corps('i-honneur'), /<circle/, 'plus de médaille');
});

test('les pastilles lisent les mots-clés imprimés des fiches', () => {
  assert.deepEqual(pastillesDe('fennec-des-decombres'), ['Rapidité', 'Butin']);
  assert.deepEqual(pastillesDe('scorpion-du-seuil'), ['Poison'],
    'le Scorpion affiche Poison, sans l’ancien effet de mort');
  assert.deepEqual(pastillesDe('jarl-au-marteau-de-guerre'), ['Provocation', 'Overkill', 'Furie 2']);
  assert.deepEqual(pastillesDe('berserk-des-trois-hivers'), ['Provocation', 'Overkill', 'Furie 2'],
    'les pastilles du Berserk affichent Provocation et sa nouvelle Furie 2');
  assert.deepEqual(pastillesDe('eirik-du-premier-serment'), ['Contre-attaque', 'Compagnie viking'],
    'Eirik affiche sa Contre-attaque et la Compagnie qui le fait grandir');
  assert.deepEqual(pastillesDe('maitre-du-marteau'), ['Envol (furie)', 'Overkill (furie)', 'Furie 3', 'Tenacité'],
    'le Maître ne porte que Furie 3 et Tenacité : Overkill et Envol sont prêtés par la Furie');
  assert.deepEqual(pastillesDe('loup-des-neiges'), ['Furie 1']);
  assert.deepEqual(pastillesDe('valkyrie-des-glaces'), ['Envol', 'Bouclier'],
    'Envol et protection contre tous les sorts, sans Résonance');
  assert.deepEqual(pastillesDe('valkyrie-au-corbeau'), ['Envol', 'Furie 2'],
    'la Valkyrie au corbeau porte Envol et Furie 2, sans Résonance');
  assert.deepEqual(pastillesDe('onna-musha-des-cendres'), ['Esquive', 'Harakiri'],
    'le Harakiri du Soleil rouge se lit sans chiffre derrière le nom');
  assert.deepEqual(pastillesDe('samourai-du-torii'), ['Résonance samouraï', 'Harakiri']);
  assert.deepEqual(pastillesDe('tiziri-du-djurdjura'), [],
    'Tiziri ne produit plus de mana et ne porte pas de pastille de mana');
  assert.deepEqual(pastillesDe('tin-hinan'), ['Infiltration'], 'elle donne Infiltration, la pastille le dit');
  assert.deepEqual(pastillesDe('kusayla-roi-des-imazighen'), ['Esquive', 'Contre-attaque'],
    'le roi Kusayla ajoute son Esquive à sa Contre-attaque');
  assert.deepEqual(pastillesDe('salem'), ['Rapidité', 'Attaque ciblée', 'Contre-attaque', 'Bouclier'],
    'Salem affiche Rapidité, Attaque ciblée, Contre-attaque et sa parade anti-sort');
  assert.deepEqual(pastillesDe('guepard'), ['Rapidité'],
    'le guépard-jeton n’affiche que sa Rapidité');
  assert.deepEqual(pastillesDe('desert'), [], 'un terrain ne porte aucune pastille');
});

test('les pastilles nomment l’effet signé des sorts', () => {
  assert.deepEqual(pastillesDe('ecueil'), ['Contresort']);
  assert.deepEqual(pastillesDe('reanimation'), ['Réanimation']);
  assert.deepEqual(pastillesDe('bakunawa'), [], 'Bakunawa arrive en combat, sans pastille de blocage');
  assert.deepEqual(pastillesDe('mur-de-boucliers'), ['Overkill', 'Renfort +2/0'],
    'un sort qui prête Overkill porte le mot-clé accordé et son effet chiffré');
});

test('Tenacité et Bouclier ne se grisent qu’une fois dépensés sur la table', () => {
  const maitre = cardById('maitre-du-marteau');
  assert.deepEqual(effetsEpuisesPourEntite(maitre, { tenaciteDisponible: true }), [],
    'une Tenacité encore prête reste en couleur');
  assert.deepEqual(effetsEpuisesPourEntite(maitre, { tenaciteDisponible: false }), ['tenacite'],
    'une Tenacité qui a sauvé son porteur est épuisée');

  const guerrier = cardById('guerrier-au-bouclier-rond');
  assert.deepEqual(effetsEpuisesPourEntite(guerrier, {
    bouclier: 1,
    bouclierLumiere: false,
    bouclierEpuise: false,
  }), [], 'un bouclier encore en place reste en couleur');
  assert.deepEqual(effetsEpuisesPourEntite(guerrier, {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: false,
  }), [], 'un bouclier d’arrivée pas encore accordé n’est pas grisé par avance');
  assert.deepEqual(effetsEpuisesPourEntite(guerrier, {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), ['bouclier'], 'le bouclier tombé est épuisé');
  assert.deepEqual(effetsEpuisesPourEntite(guerrier, {
    bouclier: 2,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), [], 'un nouveau bouclier réarme l’état tant qu’il tient');

  const Salem = cardById('salem');
  assert.equal(Salem.arrivee.type, 'bouclier', 'Salem porte la parade anti-sort, plus aucun bouclier de lumière');
  assert.deepEqual(effetsEpuisesPourEntite(Salem, {
    bouclier: 1,
    bouclierLumiere: false,
    bouclierEpuise: false,
  }), [], 'la parade de Salem encore en place reste en couleur');
  assert.deepEqual(effetsEpuisesPourEntite(Salem, {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), ['bouclier'], 'la parade de Salem tombée est épuisée');
  // Le bouclier de lumière de la Dame aux ailes d'or, lui, est resté intact.
  const dame = cardById('dame-aux-ailes-d-or');
  assert.deepEqual(effetsEpuisesPourEntite(dame, {
    bouclier: 0,
    bouclierLumiere: true,
    bouclierEpuise: false,
  }), [], 'le bouclier de lumière intact reste en couleur');
  assert.deepEqual(effetsEpuisesPourEntite(dame, {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), ['bouclier'], 'le bouclier de lumière touché est épuisé');

  // Une parade prêtée (Parade de verre, Hache de la banquise) ne s'imprime pas
  // sur la fiche : c'est `bouclierEpuise` qui garde la trace de sa chute, pour
  // que son icône violette reste affichée en gris au lieu de s'évaporer.
  assert.deepEqual(effetsEpuisesPourEntite(cardById('chien-du-guet'), {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), ['bouclier'], 'une parade prêtée laisse son Bouclier grisé une fois tombée');
  assert.deepEqual(effetsEpuisesPourEntite(cardById('chien-du-guet'), {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: false,
  }), [], 'une créature qui n’a jamais rien bloqué ne porte aucune grisaille');
  assert.deepEqual(effetsEpuisesPourEntite(maitre, null), [],
    'sans entité — main, catalogue — rien n’est jamais épuisé');
});

test('Envol et Overkill du Maître attendent leur activation réelle par Furie', () => {
  const maitre = cardById('maitre-du-marteau');
  assert.deepEqual(effetsFurieInactifs(maitre), ['envol', 'overkill'],
    'dans la main ou le catalogue, les deux gains sont encore conditionnels');
  assert.deepEqual(effetsFurieInactifs(maitre, {
    furieDeclenchee: false,
    envol: false,
    overkill: false,
  }), ['envol', 'overkill'], 'le Maître intact ne les porte pas encore');
  assert.deepEqual(effetsFurieInactifs(maitre, {
    furieDeclenchee: true,
    envol: true,
    overkill: true,
  }), [], 'sa Furie active réveille les deux icônes');
  assert.deepEqual(effetsFurieInactifs(maitre, {
    furieDeclenchee: true,
    envol: true,
    overkill: false,
  }), ['overkill'], 'chaque gain suit son propre état, pas seulement le drapeau Furie');
  assert.deepEqual(effetsFurieInactifs(cardById('jarl-au-marteau-de-guerre')), [],
    'un Overkill imprimé sans condition ne doit jamais être grisé');
  assert.deepEqual(effetsFurieInactifs(null), [], 'une carte absente ne produit aucun état');
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

  const braisier = cardById('braisier-du-souk');
  assert.equal(iconePourLigne(braisier, braisier.text), 'degats',
    'les dégâts d’arrivée du Braisier portent l’icône de dégâts');

  // Certaines magies n'ont pas d'icône honnête : mieux vaut n'en montrer
  // aucune qu'une icône trompeuse recyclée d'un autre effet.
  for (const id of ['grand-voile-blanc', 'defi-du-jarl']) {
    const carte = cardById(id);
    assert.equal(iconePourLigne(carte, carte.text), null, `${id} ne force aucune icône`);
  }

  for (const [id, icone] of [
    ['parade-du-verre', 'bouclier'],
    ['la-grande-pesee', 'transfert'],
    ['maree-contraire', 'contresort'],
    ['festin-des-vaillants', 'soin'],
    ['mur-de-boucliers', 'overkill'],
    ['lance-de-givre', 'coupRapide'],
    ['embuscade', 'debuff'],
  ]) {
    const carte = cardById(id);
    assert.equal(iconePourLigne(carte, carte.text), icone, `${id} annonce ${icone}`);
  }

  const drakkar = cardById('drakkar-a-tete-de-dragon');
  const [interdiction, naufrage] = drakkar.text.split(/(?<=[.!?])\s+/);
  assert.equal(iconePourLigne(drakkar, interdiction), null,
    '« ne peut pas attaquer » ne reçoit pas une icône d’attaque');
  assert.equal(iconePourLigne(drakkar, naufrage), 'pioche',
    'la pioche du naufrage, elle, est nommée par la phrase');

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
  assert.deepEqual(feriel.pastilles.map((pastille) => pastille.label), ['Rapidité', 'Attaque ciblée']);
  assert.equal(feriel.pastilles[0].description, 'Peut attaquer le tour où elle arrive.',
    '« Rapidité. » ne s’explique pas sur la fiche : le glossaire prend le relais');
  assert.match(feriel.pastilles[1].description, /^Sélectionnée pour attaquer, Fériel peut frapper.*Si une créature adverse est en jeu, elle doit la viser ; sinon elle peut attaquer le sorcier\.$/u,
    'la bulle reprend la phrase imprimée, précision comprise');
  assert.equal(feriel.texte, '', 'tout le texte de Fériel est passé dans ses pastilles');

  const faussoyeur = effetsDetailles(cardById('faussoyeur-des-dunes'));
  assert.equal(faussoyeur.pastilles.find((pastille) => pastille.cle === 'butin').description,
    'Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.');
  assert.equal(faussoyeur.texte, 'Quand le Faussoyeur arrive : renvoyez une créature de votre cimetière dans votre main.',
    'un autre déclencheur n’appartient pas au mot-clé qui le précède : il reste écrit');

  const susanoo = effetsDetailles(cardById('susanoo'));
  assert.match(susanoo.pastilles.find((pastille) => pastille.cle === 'exil').description, /ne va pas au cimetière/u);
  assert.equal(susanoo.texte, 'Quand Susanoo arrive en jeu, retirez de la partie une créature de coût 5 ou plus de votre choix.',
    'une pastille qui ne nomme pas la phrase ne la cache pas');

  const jarl = effetsDetailles(cardById('jarl-au-marteau-de-guerre'));
  assert.deepEqual(jarl.pastilles.map((pastille) => pastille.cle), ['provocation', 'overkill', 'furie']);
  assert.equal(jarl.pastilles.find((pastille) => pastille.cle === 'furie').description,
    'Tant que sa défense actuelle est inférieure à sa DEF de base, elle gagne +2/+0.',
    'la fiche dit seulement « Furie 2. » : la pastille explique l’état, en une phrase');
  assert.equal(jarl.pastilles.find((pastille) => pastille.cle === 'overkill').description,
    'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.');
  assert.equal(jarl.texte, '', 'les mots-clés sobres ne laissent aucun pavé de règle sur la face');

  const berserk = effetsDetailles(cardById('berserk-des-trois-hivers'));
  assert.deepEqual(berserk.pastilles.map((pastille) => pastille.cle), ['provocation', 'overkill', 'furie']);
  assert.equal(berserk.pastilles.find((pastille) => pastille.cle === 'provocation').description,
    'Quand cette créature attaque, elle doit être bloquée par au moins une créature si possible.',
    'la pastille Provocation reprend l’explication imprimée');
  assert.equal(berserk.texte, '', 'Furie et Provocation vivent entièrement dans leurs pastilles');

  const corbeau = effetsDetailles(cardById('valkyrie-au-corbeau'));
  assert.deepEqual(corbeau.pastilles.map((pastille) => pastille.label), ['Envol', 'Furie']);
  assert.equal(corbeau.texte,
    'Quand elle arrive : piochez une carte de type Viking au hasard dans votre deck.',
    'la pioche tribale d’arrivée reste écrite dans l’aperçu');

  const mur = effetsDetailles(cardById('mur-de-boucliers'));
  assert.equal(mur.pastilles.find((pastille) => pastille.cle === 'overkill').description,
    'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.');
  assert.equal(mur.texte, cardById('mur-de-boucliers').text,
    'la portée collective et la durée restent écrites sur le sort');

  const faucon = effetsDetailles(cardById('faucon-du-zenith'));
  assert.equal(faucon.texte, '', 'Bouclier — passe dans sa pastille au lieu d’être réimprimé');
  assert.match(faucon.pastilles.find((pastille) => pastille.cle === 'bouclier').description, /premier sort/u);
  const ifrit = effetsDetailles(cardById('ifrit-al-ahmar'));
  assert.equal(ifrit.texte, '', 'le Bouclier d’Eau rejoint sa pastille de Protection');
  assert.match(ifrit.pastilles.find((pastille) => pastille.cle === 'protection').description, /sort adverse d’Eau/u);
  const rais = effetsDetailles(cardById('rais-de-la-galiote'));
  assert.doesNotMatch(rais.texte, /Abordage 1/u, 'l’Abordage chiffré rejoint sa pastille');
  assert.match(rais.texte, /La cale s’ouvre/u, 'la règle supplémentaire reste imprimée');
});

test('la Protection élémentaire colore un bouclier par élément, le Sable gardant son encre', () => {
  assert.deepEqual(PROTECTION_COULEURS, {
    braise: '#ff3b30',
    eau: '#2f7bff',
    sable: null,
    tenebres: '#a855f7',
    neige: '#8fd8ff',
  });
  assert.equal(couleurProtection('sable'), null,
    'la Protection contre le Sable ne prend aucune teinte spéciale');

  const lionne = cardById('lionne-du-midi-ardent');
  assert.deepEqual(couleursProtectionCarte(lionne), ['eau', 'neige']);
  assert.deepEqual(
    pastillesPourCarte(lionne).find((pastille) => pastille.cle === 'protection')?.contres,
    ['eau', 'neige'],
    'la pastille unique porte les deux éléments à colorer séparément',
  );
  const htmlLionne = pastillesCarte(lionne);
  assert.equal([...htmlLionne.matchAll(/#i-protection/g)].length, 2,
    'le HTML historique dessine un bouclier par élément protégé');
  assert.match(htmlLionne, /data-protection-contre="eau" style="color:#2f7bff;border-color:#2f7bff"/);
  assert.match(htmlLionne, /data-protection-contre="neige" style="color:#8fd8ff;border-color:#8fd8ff"/);

  const pastillesJsx = readFileSync(new URL('../src/games/effetIcons.jsx', import.meta.url), 'utf8');
  const pastillesCss = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');
  assert.match(pastillesJsx, /'--rpg-protection-couleur': couleur/,
    'la pastille React porte la teinte élémentaire à son échelle');
  assert.match(pastillesJsx, /style=\{styleProtectionPastille\(pastille\)\}/,
    'le libellé « Protection <élément> » reçoit cette teinte');
  assert.match(pastillesJsx, /style=\{styleProtectionPastille\(pastilleBadge\)\}/,
    'le badge circulaire de face reçoit aussi cette teinte');
  assert.match(pastillesJsx, /Deux éléments, deux cercles/,
    'une Protection double garde un cercle par élément');
  assert.match(pastillesCss, /\.rpg-pastille\[data-pastille='protection'\] \{[^}]*border-color: var\(--rpg-protection-couleur/s,
    'la bordure de la pastille suit l’élément');
  assert.match(pastillesCss, /\.rpg-pastille\[data-pastille='protection'\] \{[^}]*color: var\(--rpg-protection-couleur/s,
    'les mots « Protection Braise » prennent la couleur de l’élément');
  assert.match(pastillesCss, /\.rpg-card-icone\[data-effet='protection'\] \{[^}]*border-color: var\(--rpg-protection-couleur/s,
    'le tour du cercle de l’icône prend la même couleur');

  assert.deepEqual(couleursProtectionCarte(cardById('valkyrie-des-glaces')), [],
    'Valkyrie protège désormais contre tous les sorts, pas seulement la Braise');
  assert.equal(cardById('valkyrie-des-glaces').bouclierInitial, true, 'protection générique contre les sorts');
  assert.deepEqual(couleursProtectionCarte(cardById('jitte-d-amayas')), ['tenebres'],
    'une protection donnée par une arme suit la même palette');
  assert.deepEqual(couleursProtectionCarte(cardById('serpent-du-monde')), [],
    'la protection contre les sorts n’est pas une protection élémentaire');

  const htmlSable = pastillesCarte({ protection: { contre: 'sable' } });
  assert.match(htmlSable, /data-protection-contre="sable"/);
  assert.doesNotMatch(htmlSable, /style="(?:color|border-color):/,
    'aucun style de couleur ni de bordure : le Sable garde l’encre ordinaire');
});

test('une pastille dit tout ce que la fiche imprime de son mot-clé', () => {
  // Les mots-clés deviennent des pastilles : le nom s’affiche dessus, et la
  // définition — celle du texte de règle, sinon celle du glossaire — reste
  // dite au survol et dans l’`aria-label`. Ce qui quitte le texte de règle
  // doit donc se retrouver dans la pastille : pas un mot de la fiche ne
  // disparaît, sinon la carte ne se lit plus.
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
  // Sans cette pastille, le -3/-3 de la Lame de mer ne vivait que dans sa
  // phrase de règle — et une face de carte n'imprime pas la règle.
  assert.deepEqual(pastillesDe('lame-de-mer'), ['Affaiblissement -3/-3']);
  assert.deepEqual(pastillesDe('embuscade'), ['Affaiblissement -2/-2'],
    'l’Embuscade rabote toute la table adverse de -2/-2');
  assert.deepEqual(pastillesDe('vipere-de-verre'), ['Affaiblissement -2/0'],
    'la vipère ne retire que de l’attaque : la défense reste à 0');
  assert.deepEqual(pastillesDe('serment-de-la-forge'), ['Renfort +2/+1'],
    'une arrivée qui renforce s’écrit en positif');
  assert.deepEqual(pastillesDe('lame-de-mer').length, pastillesPourCarte(cardById('lame-de-mer')).length,
    'une seule pastille par carte');
});

test('la pastille chiffrée explique le malus, statistique par statistique', () => {
  const lire = (id) => definitionPastille(pastillesPourCarte(cardById(id))[0]);
  assert.equal(lire('lame-de-mer'),
    'La cible perd 3 en attaque et 3 en défense. Si sa défense tombe à 0, elle est détruite.');
  assert.equal(lire('vipere-de-verre'),
    'La cible perd 2 en attaque. Si sa défense tombe à 0, elle est détruite.',
    'la vipère ne dit pas qu’elle retire de la défense');
  assert.equal(lire('serment-de-la-forge'), 'La cible gagne 2 en attaque et 1 en défense.');
});

test('le chiffre de la carte se lit aussi hors des pastilles', () => {
  const modif = (id) => modificationStats(cardById(id));
  assert.deepEqual(modif('lame-de-mer'), { atk: -3, def: -3 });
  assert.deepEqual(modif('vipere-de-verre'), { atk: -2, def: 0 });
  assert.equal(libelleModificationStats(cardById('lame-de-mer')), '-3/-3');
  assert.equal(libelleModificationStats(cardById('serment-de-la-forge')), '+2/+1');
  // Une arme garde son bonus de porteur : pas de doublon chiffré.
  assert.equal(modif('khopesh-d-or'), null);
  assert.equal(libelleModificationStats(cardById('khopesh-d-or')), null);
  // Un sort qui ne touche pas aux statistiques n’écrit rien.
  assert.equal(libelleModificationStats(cardById('trait-de-braise')), null);
});

test('Embuscade nomme la réaction pendant le tour adverse et fournit une pastille explicative', () => {
  const cartes = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse);
  assert.ok(cartes.length > 0);
  assert.equal(EFFET_ICONE.reactionTourAdverse, 'i-embuscade');
  for (const carte of cartes) {
    const { pastilles, texte } = effetsDetailles(carte);
    const pastille = pastilles.find((p) => p.cle === 'reactionTourAdverse');
    assert.equal(pastille?.label, 'Embuscade', carte.id);
    assert.match(pastille.description, /jouer .* pendant le tour adverse/i, carte.id);
    assert.match(carte.text, /Embuscade —/, carte.id);
    assert.doesNotMatch(texte, /Embuscade —/, carte.id);
    assert.match(pastillesCarte(carte), /#i-embuscade/, carte.id);
  }
  assert.ok(!pastillesPourCarte(cardById('chien-du-guet')).some((p) => p.cle === 'reactionTourAdverse'));
  assert.ok(pastillesPourCarte(cardById('sentinelle-des-sables')).some((p) => p.cle === 'reactionTourAdverse'), 'la Sentinelle possède désormais Embuscade');
  assert.ok(!pastillesPourCarte(cardById('embuscade')).some((p) => p.cle === 'reactionTourAdverse'), 'le sort homonyme ne gagne pas cette capacité');
});

test('Vol de vie a son icône et sa pastille explicative sur les cartes et le Sabre', () => {
  assert.equal(EFFET_ICONE.volDeVie, 'i-vol-de-vie');
  for (const id of ['general-du-croissant-noir', 'fleau-de-la-lune-noire', 'danseuse-des-ombres-de-dune', 'souverain-de-la-lune-noire', 'sabre-du-croissant-noir']) {
    const p = effetsDetailles(cardById(id)).pastilles.find((p) => p.cle === 'volDeVie');
    assert.equal(p?.label, 'Vol de vie', id);
    assert.match(p.description, /(?:points de vie|dégâts)/i, id);
  }
  assert.equal(iconePourLigne({}, 'Vol de vie — Vous gagnez autant de points de vie que les dégâts infligés.'), 'volDeVie');
  const code = readFileSync(new URL('../src/games/effetIcons.jsx', import.meta.url), 'utf8');
  assert.match(code, /if \(entite\.volDeVie\) ajouter\('volDeVie'/);
});
