import test from 'node:test';
import assert from 'node:assert/strict';

import { cardById, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';
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
} from '../src/games/effetIcons.js';

const pastillesDe = (id) => pastillesPourCarte(cardById(id))
  .map((pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label));

test('le sprite porte les 26 symboles validés, un par effet', () => {
  const symboles = [...EFFETS_SPRITE.matchAll(/<symbol id="(i-[a-z-]+)"/g)].map((m) => m[1]);
  assert.equal(symboles.length, 26);
  for (const icone of new Set(Object.values(EFFET_ICONE))) {
    assert.ok(symboles.includes(icone), `${icone} est dans le sprite`);
  }
  assert.equal(effetIcon('butin').includes('<use href="#i-butin"/>'), true);
  assert.equal(effetIcon('furie').includes('<use href="#i-furie"/>'), true);
  assert.equal(effetIcon('provocation').includes('<use href="#i-provocation"/>'), true);
  const provocation = EFFETS_SPRITE.match(/<symbol id="i-provocation"[^>]*>(.*?)<\/symbol>/)?.[1] ?? '';
  assert.ok(provocation.includes('M6 9.6 18 4v16L6 14.4'),
    'la Provocation est dessinée comme un mégaphone : pavillon évasé');
  assert.ok(provocation.includes('M20 9a4.2 4.2 0 0 1 0 6'),
    'et son arc sonore est dans le sprite');
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
  assert.deepEqual(pastillesDe('jarl-au-marteau-de-guerre'), ['Overkill', 'Furie 3']);
  assert.deepEqual(pastillesDe('berserk-des-trois-hivers'), ['Provocation', 'Furie 2'],
    'Provocation remplace Coup rapide dans les pastilles du Berserk');
  assert.deepEqual(pastillesDe('maitre-du-marteau'), ['Overkill', 'Furie 3', 'Tenacité']);
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
  assert.deepEqual(effetsEpuisesPourEntite(Salem, {
    bouclier: 0,
    bouclierLumiere: true,
    bouclierEpuise: false,
  }), [], 'le bouclier de lumière intact reste en couleur');
  assert.deepEqual(effetsEpuisesPourEntite(Salem, {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), ['bouclier'], 'le bouclier de lumière touché est épuisé');

  assert.deepEqual(effetsEpuisesPourEntite(cardById('chien-du-guet'), {
    bouclier: 0,
    bouclierLumiere: false,
    bouclierEpuise: true,
  }), [], 'une carte sans Bouclier imprimé n’a aucun texte de Bouclier à griser');
  assert.deepEqual(effetsEpuisesPourEntite(maitre, null), [],
    'sans entité — main, catalogue — rien n’est jamais épuisé');
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
    ['lance-de-givre', 'envol'],
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
  assert.deepEqual(jarl.pastilles.map((pastille) => pastille.cle), ['overkill', 'furie']);
  assert.equal(jarl.pastilles.find((pastille) => pastille.cle === 'furie').description,
    'Tant que sa défense actuelle est inférieure à sa DEF de base, elle gagne +3/+0.',
    'la fiche dit seulement « Furie 3. » : la pastille explique l’état, en une phrase');
  assert.equal(jarl.pastilles.find((pastille) => pastille.cle === 'overkill').description,
    'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.');
  assert.equal(jarl.texte, '', 'les mots-clés sobres ne laissent aucun pavé de règle sur la face');

  const berserk = effetsDetailles(cardById('berserk-des-trois-hivers'));
  assert.deepEqual(berserk.pastilles.map((pastille) => pastille.cle), ['provocation', 'furie']);
  assert.equal(berserk.pastilles.find((pastille) => pastille.cle === 'provocation').description,
    'Quand cette créature attaque, elle doit être bloquée par au moins une créature si possible.',
    'la pastille Provocation reprend l’explication imprimée');
  assert.equal(berserk.texte, '', 'Furie et Provocation vivent entièrement dans leurs pastilles');

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
  assert.match(htmlLionne, /data-protection-contre="eau" style="color:#2f7bff"/);
  assert.match(htmlLionne, /data-protection-contre="neige" style="color:#8fd8ff"/);

  assert.deepEqual(couleursProtectionCarte(cardById('valkyrie-des-glaces')), ['braise']);
  assert.deepEqual(couleursProtectionCarte(cardById('jitte-d-amayas')), ['tenebres'],
    'une protection donnée par une arme suit la même palette');
  assert.deepEqual(couleursProtectionCarte(cardById('serpent-du-monde')), [],
    'la protection contre les sorts n’est pas une protection élémentaire');

  const htmlSable = pastillesCarte({ protection: { contre: 'sable' } });
  assert.match(htmlSable, /data-protection-contre="sable"/);
  assert.doesNotMatch(htmlSable, /style="color:/,
    'aucun style de couleur : le Sable garde l’encre ordinaire');
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
