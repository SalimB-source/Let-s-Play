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

test('le sprite porte les 30 symboles validés, un par effet', () => {
  const symboles = [...EFFETS_SPRITE.matchAll(/<symbol id="(i-[a-z-]+)"/g)].map((m) => m[1]);
  // 32 depuis le Coup critique (`i-coup-critique`) : chaque symbole est
  // référencé par `EFFET_ICONE`, aucun n'est orphelin.
  assert.equal(symboles.length, 32);
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
  const transfert = EFFETS_SPRITE.match(/<symbol id="i-transfert"[^>]*>(.*?)<\/symbol>/)?.[1] ?? '';
  assert.ok(transfert.includes('M3.5 8.5h13.5') && transfert.includes('M20.5 15.5H7'),
    'le Transfert dessine deux flèches opposées : la vie passe d’un sorcier à l’autre');
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
  // L'Abordage : un CRÂNE SIMPLE et deux OS qui forment un X derrière lui.
  // Le crâne est une tête ronde (un cercle), deux orbites et une mâchoire
  // courte ; pas de nez, pas de dents, pas d'os aux quatre coins.
  const abordage = EFFETS_SPRITE.match(/<symbol id="i-abordage"[^>]*>(.*?)<\/symbol>/)?.[1] ?? '';
  assert.ok(abordage.includes('<circle cx="12" cy="9.6" r="6.5"/>'),
    'le crâne de l’Abordage est une tête ronde et simple');
  assert.equal((abordage.match(/<circle/g) ?? []).length, 3,
    'deux orbites seulement avec la tête — rien de plus');
  assert.ok(abordage.includes('<circle cx="9.5" cy="9.4" r="1.5"/>')
    && abordage.includes('<circle cx="14.5" cy="9.4" r="1.5"/>'),
  'les deux orbites du crâne sont là');
  assert.ok(abordage.includes('M9.4 15.9v2.4c0 .9.7 1.6 1.6 1.6h2c.9 0 1.6-.7 1.6-1.6v-2.4'),
    'la mâchoire courte est dessinée sous la tête');
  // Le X : quatre bras qui partent des coins ; chaque bout porte son petit
  // renflement d'os, perpendiculaire à la tige.
  assert.ok(abordage.includes('M3.1 20.9 8.6 15.4') && abordage.includes('M15.4 15.4 20.9 20.9'),
    'les deux os croisés forment un X, du bas-gauche au haut-droit et retour');
  assert.ok(abordage.includes('M3.1 3.1 8.6 8.6') && abordage.includes('M15.4 8.6 20.9 3.1'),
    'les deux autres bras du X montent vers les coins hauts');
  // 13 tracés : la mâchoire, les quatre tiges du X et les huit bouts d'os
  // (un renflement perpendiculaire à chaque extrémité).
  assert.equal((abordage.match(/<path/g) ?? []).length, 1 + 4 + 8,
    'la mâchoire, les quatre bras du X et un bout d’os à chaque extrémité');
  assert.equal((abordage.match(/<path d="M3\.1 20\.9/g) ?? []).length, 1,
    'chaque bras n’a qu’une tige');
  assert.equal(abordage.includes('m12 12.2'), false, 'plus de nez en goutte');
  assert.equal(abordage.includes('m12 13.4'), false, 'l’ancien nez du crâne détaillé a disparu');
  assert.equal(abordage.includes('M12 3v10.5'), false, 'l’ancre d’origine ne revient pas');
  assert.equal(abordage.includes('M12 18.4v3.2'), false,
    'la mâchoire dentelée du crâne précédent a disparu');
  assert.equal(EFFET_ICONE.prise, 'i-abordage',
    'la Prise garde le crâne du pirate : la cale et l’Abordage sont la même prise');
});

test('les pastilles lisent les mots-clés imprimés des fiches', () => {
  assert.deepEqual(pastillesDe('fennec-des-decombres'), ['Rapidité', 'Butin']);
  assert.deepEqual(pastillesDe('jarl-au-marteau-de-guerre'), ['Provocation', 'Overkill', 'Furie 2']);
  assert.deepEqual(pastillesDe('berserk-des-trois-hivers'), ['Provocation', 'Furie 2'],
    'les pastilles du Berserk affichent Provocation et sa nouvelle Furie 2');
  assert.deepEqual(pastillesDe('eirik-du-premier-serment'), ['Contre-attaque'],
    'Eirik affiche sa Contre-attaque dans les pastilles');
  assert.deepEqual(pastillesDe('maitre-du-marteau'), ['Envol (furie)', 'Overkill (furie)', 'Furie 3', 'Tenacité'],
    'le Maître ne porte que Furie 3 et Tenacité : Overkill et Envol sont prêtés par la Furie');
  assert.deepEqual(pastillesDe('loup-des-neiges'), ['Furie 1']);
  assert.deepEqual(pastillesDe('valkyrie-des-glaces'), ['Envol', 'Protection contre les magies et les sorcelleries'],
    'Envol et protection contre tous les sorts, sans Résonance');
  assert.deepEqual(pastillesDe('valkyrie-au-corbeau'), ['Envol', 'Furie 2'],
    'la Valkyrie au corbeau porte Envol et Furie 2, sans Résonance');
  assert.deepEqual(pastillesDe('onna-musha-des-cendres'), ['Esquive', 'Harakiri'],
    'le Harakiri du Soleil rouge se lit sans chiffre derrière le nom');
  assert.deepEqual(pastillesDe('samourai-du-torii'), ['Résonance samouraï', 'Harakiri']);
  assert.deepEqual(pastillesDe('tiziri-du-djurdjura'), ['Protection Braise']);
  assert.deepEqual(pastillesDe('tin-hinan'), ['Infiltration'], 'elle donne Infiltration, la pastille le dit');
  assert.deepEqual(pastillesDe('aksel-roi-des-imazighen'), ['Contre-attaque'],
    'le roi Aksel affiche sa Contre-attaque, comme Eirik et Tojiro');
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
  assert.deepEqual(berserk.pastilles.map((pastille) => pastille.cle), ['provocation', 'furie']);
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
  assert.equal(cardById('valkyrie-des-glaces').protectionSorts, true, 'protection générique contre les sorts');
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
  // Sans cette pastille, le -2/-2 de la Lame de mer ne vivait que dans sa
  // phrase de règle — et une face de carte n'imprime pas la règle.
  assert.deepEqual(pastillesDe('lame-de-mer'), ['Affaiblissement -2/-2']);
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
    'La cible perd 2 en attaque et 2 en défense. Si sa défense tombe à 0, elle est détruite.');
  assert.equal(lire('vipere-de-verre'),
    'La cible perd 2 en attaque. Si sa défense tombe à 0, elle est détruite.',
    'la vipère ne dit pas qu’elle retire de la défense');
  assert.equal(lire('serment-de-la-forge'), 'La cible gagne 2 en attaque et 1 en défense.');
});

test('le chiffre de la carte se lit aussi hors des pastilles', () => {
  const modif = (id) => modificationStats(cardById(id));
  assert.deepEqual(modif('lame-de-mer'), { atk: -2, def: -2 });
  assert.deepEqual(modif('vipere-de-verre'), { atk: -2, def: 0 });
  assert.equal(libelleModificationStats(cardById('lame-de-mer')), '-2/-2');
  assert.equal(libelleModificationStats(cardById('serment-de-la-forge')), '+2/+1');
  // Une arme garde son bonus de porteur : pas de doublon chiffré.
  assert.equal(modif('khopesh-d-or'), null);
  assert.equal(libelleModificationStats(cardById('khopesh-d-or')), null);
  // Un sort qui ne touche pas aux statistiques n’écrit rien.
  assert.equal(libelleModificationStats(cardById('trait-de-braise')), null);
});
