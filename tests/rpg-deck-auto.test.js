import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, cardColors, cardCopyLimit, rpgValiderDeck } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { rpgValiderDeckMaison } from '../src/games/rpgDeckBuilder.js';
import {
  RPG_ASSISTANT_TAILLE,
  RPG_STYLES_JEU,
  bonusStyle,
  cartesPourEtape,
  familleDeCarte,
  genererDeckAssiste,
  mecaniquesDeCarte,
  particuleDe,
  profilStyle,
  scoreComplementarite,
  suggestionsNomsDeck,
  tribusDeCarte,
} from '../src/games/rpgDeckAuto.js';

/* Catalogue synthétique : trois couleurs, quelques familles, un même palier de
 * rareté pour que la puissance seule ne dicte pas les résultats de synergie. */
const carte = (id, surcharge = {}) => ({
  id,
  name: surcharge.name ?? id,
  kind: 'creature',
  cost: 2,
  rarity: 'commune',
  element: 'sable',
  typeLine: 'Créature — Habitants de Bab El',
  atk: 2,
  def: 2,
  ...surcharge,
});

const catalogueDe = (cartes) => ({
  cartes,
  couleursDe: (c) => (Array.isArray(c?.colors) && c.colors.length ? c.colors : [c?.element].filter(Boolean)),
  limiteDe: (c) => (c?.rarity === 'mythique' ? 1 : 2),
});

test('mecaniquesDeCarte lit les tribus, les capacités et les effets', () => {
  const serpent = carte('vipere', {
    typeLine: 'Créature — Serpent',
    envol: true,
    effet: { type: 'degats', amount: 2 },
    arrivee: { type: 'pioche', amount: 1 },
  });
  const jetons = mecaniquesDeCarte(serpent);
  assert.ok(jetons.has('tribu:serpent'), 'la tribu imprimée est lue');
  assert.ok(jetons.has('cap:envol'), 'la capacité imprimée est lue');
  assert.ok(jetons.has('effet:degats'), 'le type d’effet est lu');
  assert.ok(jetons.has('effet:pioche'), 'l’effet d’arrivée est lu');
  assert.deepEqual([...tribusDeCarte(serpent)], ['serpent'], 'la ligne de type ne rend que la tribu');
  assert.equal(familleDeCarte(carte('x', { kind: 'magie', effet: { type: 'arme' } })), 'arme',
    'une magie à effet arme est une arme');
});

test('genererDeckAssiste pose les choix puis complète avec les compléments', () => {
  const cartes = [
    carte('chef', { atk: 4, def: 4 }),
    carte('guide', { atk: 3, def: 3 }),
    carte('sort-vif', { kind: 'magie', effet: { type: 'degats', amount: 3 } }),
    carte('sort-doux', { kind: 'magie', effet: { type: 'soin', amount: 3 } }),
    carte('renfort-a', { atk: 2, def: 3 }),
    carte('renfort-b', { atk: 1, def: 4 }),
    carte('renfort-c', { kind: 'magie', effet: { type: 'bouclier', amount: 3 } }),
  ];
  const { cardIds } = genererDeckAssiste({
    couleurs: ['sable'],
    creatures: ['chef', 'guide'],
    sorts: ['sort-vif', 'sort-doux'],
    catalogue: catalogueDe(cartes),
    taille: 14,
  });
  assert.equal(cardIds.length, 14, 'le deck est complet tant que la collection mène');
  const comptes = new Map();
  for (const id of cardIds) comptes.set(id, (comptes.get(id) ?? 0) + 1);
  assert.equal(comptes.get('chef'), 2, 'chaque carte choisie est posée à deux exemplaires');
  assert.equal(comptes.get('sort-doux'), 2, 'y compris les sorts choisis');
  assert.equal(comptes.get('renfort-a'), 2, 'le remplissage prend aussi deux exemplaires');
  for (const [id, nombre] of comptes) {
    assert.ok(nombre <= 2, `${id} : deux exemplaires au plus`);
  }
});

test('genererDeckAssiste respecte la mythique à un exemplaire et la collection', () => {
  const cartes = [
    carte('figure', { rarity: 'mythique', atk: 6, def: 6 }),
    carte('commune', {}),
    carte('verrouillee', { atk: 9, def: 9 }),
  ];
  const { cardIds } = genererDeckAssiste({
    couleurs: ['sable'],
    creatures: ['figure', 'commune'],
    sorts: [],
    collection: ['figure', 'commune'],
    catalogue: catalogueDe(cartes),
    taille: 8,
  });
  const comptes = new Map();
  for (const id of cardIds) comptes.set(id, (comptes.get(id) ?? 0) + 1);
  assert.equal(comptes.get('figure'), 1, 'la mythique reste unique');
  assert.equal(comptes.get('commune'), 2, 'la commune est posée à deux');
  assert.equal(comptes.get('verrouillee'), undefined, 'hors collection : jamais dans le deck');
  assert.equal(cardIds.length, 3, 'la collection trop petite rend un brouillon, pas un deck faux');
});

test('le remplissage privilégie les mécaniques des cartes choisies', () => {
  // Candidats même coût, même famille, mêmes chiffres : seuls les Serpents
  // partagent la tribu des cartes choisies, ils doivent passer devant.
  const cartes = [
    carte('chef-serpent', { typeLine: 'Créature — Serpent', atk: 3, def: 3 }),
    carte('guide-serpent', { typeLine: 'Créature — Serpent', atk: 3, def: 3 }),
    carte('allié-serpent', { typeLine: 'Créature — Serpent', atk: 3, def: 3 }),
    carte('allié2-serpent', { typeLine: 'Créature — Serpent', atk: 3, def: 3 }),
    carte('autre', { typeLine: 'Créature — Éclaireur', atk: 3, def: 3 }),
  ];
  const { cardIds } = genererDeckAssiste({
    couleurs: ['sable'],
    creatures: ['chef-serpent', 'guide-serpent'],
    sorts: [],
    catalogue: catalogueDe(cartes),
    taille: 8,
  });
  assert.equal(cardIds.filter((id) => id === 'allié-serpent').length, 2,
    'les Serpents complètent les Serpents choisis');
  assert.equal(cardIds.filter((id) => id === 'allié2-serpent').length, 2,
    'et les deux alliés passent avant l’étranger');
  assert.ok(!cardIds.includes('autre'), 'l’étranger à la mécanique n’est pas retenu');
});

test('le remplissage comble la courbe : les choix chers appellent du jeu précoce', () => {
  const cartes = [
    carte('colosse', { cost: 6, atk: 8, def: 8 }),
    carte('geant', { cost: 6, atk: 8, def: 8 }),
    carte('eclaireur', { cost: 1, atk: 2, def: 1 }),
    carte('guetteur', { cost: 1, atk: 2, def: 1 }),
    // Même valeur brute que les choix, mais chers : la courbe les écarte.
    carte('colosse-tard', { cost: 6, atk: 8, def: 8 }),
    carte('geant-tard', { cost: 6, atk: 8, def: 8 }),
  ];
  const { cardIds } = genererDeckAssiste({
    couleurs: ['sable'],
    creatures: ['colosse', 'geant'],
    sorts: [],
    catalogue: catalogueDe(cartes),
    taille: 8,
  });
  assert.equal(cardIds.filter((id) => id === 'eclaireur').length, 2, 'le jeu à 1 mana est complémentaire');
  assert.equal(cardIds.filter((id) => id === 'guetteur').length, 2, 'en deux exemplaires');
  assert.ok(!cardIds.includes('colosse-tard') && !cardIds.includes('geant-tard'),
    'les gros corps tardifs ne sont pas complémentaires d’un deck déjà cher');
});

test('le remplissage porte toutes les couleurs choisies', () => {
  const cartes = [
    carte('braise-fidele', { element: 'braise', atk: 3, def: 3 }),
    carte('braise-tardive', { element: 'braise', atk: 1, def: 1 }),
    carte('sable-utile', { element: 'sable', atk: 1, def: 1 }),
  ];
  const { cardIds } = genererDeckAssiste({
    couleurs: ['braise', 'sable'],
    creatures: ['braise-fidele', 'braise-tardive'],
    sorts: [],
    catalogue: catalogueDe(cartes),
    taille: 8,
  });
  assert.ok(cardIds.includes('sable-utile'),
    'le Sable, couleur choisie encore absente, appelle une carte de Sable');
});

test('la couverture des effets manquants compte dans le score', () => {
  const etat = {
    jetonsChoisis: new Set(['tribu:serpent']),
    jetonsDeck: new Set(['effet:degats']),
    parPalier: [0, 0, 8, 0, 0, 0, 0],
    parFamille: { creature: 8, magie: 0, arme: 0 },
    couleursDeck: new Set(['sable']),
    puissanceMin: 0,
    puissanceMax: 1,
  };
  const pioche = carte('pioche', { kind: 'magie', effet: { type: 'pioche', amount: 2 } });
  const secondDegat = carte('second-degat', { kind: 'magie', effet: { type: 'degats', amount: 2 } });
  assert.ok(scoreComplementarite(pioche, etat) > scoreComplementarite(secondDegat, etat),
    'un effet que le deck n’a pas encore est plus complémentaire qu’un effet déjà présent');
});

test('cartesPourEtape ne propose que les cartes possédées des couleurs choisies', () => {
  const cartes = [
    carte('crea-sable', {}),
    carte('crea-eau', { element: 'eau' }),
    carte('crea-melange', { colors: ['sable', 'eau'] }),
    carte('sort-sable', { kind: 'magie', effet: { type: 'pioche', amount: 1 } }),
  ];
  const catalogue = catalogueDe(cartes);
  const creatures = cartesPourEtape(['sable', 'eau'], 'creatures', catalogue, ['crea-sable', 'crea-eau', 'crea-melange', 'sort-sable']);
  assert.deepEqual(creatures.map((c) => c.id).sort(), ['crea-eau', 'crea-melange', 'crea-sable'].sort(),
    'les créatures des deux couleurs, y compris hybrides');
  const sorts = cartesPourEtape(['sable'], 'sorts', catalogue, ['sort-sable', 'crea-sable']);
  assert.deepEqual(sorts.map((c) => c.id), ['sort-sable'], 'les sorts de la couleur, possédés');
  assert.deepEqual(cartesPourEtape(['sable'], 'creatures', catalogue, ['sort-sable']).map((c) => c.id), [],
    'hors collection : rien n’est proposé');
});

test('suggestionsNomsDeck propose trois noms autour de la carte emblème', () => {
  const cartes = [
    carte('anqa-des-braises', { name: 'Anqa des braises', rarity: 'mythique', atk: 7, def: 7 }),
    carte('ghul', { name: 'Ghul des cendres', atk: 3, def: 3 }),
  ];
  const suggestions = suggestionsNomsDeck(['ghul', 'ghul', 'anqa-des-braises'], catalogueDe(cartes));
  assert.equal(suggestions.length, 3, 'trois propositions');
  assert.deepEqual(suggestions, [
    'Les Disciples d’Anqa',
    'Le Serment d’Anqa',
    'La Garde d’Anqa',
  ], 'la mythique emblème prête son premier mot, avec élision');
  assert.deepEqual(suggestionsNomsDeck([], catalogueDe(cartes)), ['Deck maison'], 'deck vide : nom par défaut');
  assert.equal(particuleDe('Takouba de Tin Hinan'), 'de Takouba', 'consonne : « de »');
  assert.equal(particuleDe('Éclaireur du Désert'), 'd’Éclaireur', 'voyelle : élision');
});

test('la création assistée du catalogue réel rend un deck maison légal', () => {
  const catalogue = {
    cartes: RPG_DUEL_CARDS,
    couleursDe: cardColors,
    limiteDe: cardCopyLimit,
  };
  const collection = collectionJoueur();
  const creatures = cartesPourEtape(['sable'], 'creatures', catalogue, collection).slice(0, 4).map((c) => c.id);
  const sorts = cartesPourEtape(['sable'], 'sorts', catalogue, collection).slice(0, 4).map((c) => c.id);
  assert.equal(creatures.length, 4, 'la dotation de départ offre assez de créatures Sable');
  assert.equal(sorts.length, 4, 'et assez de sorts Sable');
  const { cardIds, embleme } = genererDeckAssiste({
    couleurs: ['sable'],
    creatures,
    sorts,
    collection,
    catalogue,
  });
  assert.equal(cardIds.length, RPG_ASSISTANT_TAILLE, 'le deck réel compte 30 cartes');
  assert.ok(rpgValiderDeck(cardIds).ok, 'le format du duel est tenu');
  const validation = rpgValiderDeckMaison(cardIds, collection);
  assert.ok(validation.ok, `deck maison valide : ${validation.raisons.join(' · ')}`);
  for (const id of [...creatures, ...sorts]) {
    assert.ok(cardIds.includes(id), `${cardById(id)?.name} : la carte choisie est dans le deck`);
  }
  assert.ok(embleme && [...creatures, ...sorts].includes(embleme), 'l’emblème vient des cartes choisies');
});

test('RPG_STYLES_JEU propose aggro, contrôle et mix, chacun cohérent avec 30 cartes', () => {
  assert.deepEqual(RPG_STYLES_JEU.map((profil) => profil.id), ['aggro', 'controle', 'mix']);
  for (const profil of RPG_STYLES_JEU) {
    assert.equal(profil.courbe.length, 7, 'sept paliers de mana (1…6, 7+)');
    assert.equal(profil.courbe.reduce((total, palier) => total + palier, 0), RPG_ASSISTANT_TAILLE,
      `${profil.id} : la courbe cible totalise 30 places`);
    assert.equal(profil.creatures + profil.sorts, RPG_ASSISTANT_TAILLE,
      `${profil.id} : créatures et sorts totalisent 30`);
    assert.ok(profil.description && profil.label, `${profil.id} : le style porte un libellé et une description`);
  }
  assert.equal(profilStyle('inconnu').id, 'mix', 'un style inconnu retombe sur mix');
  assert.equal(profilStyle('aggro').creatures > profilStyle('controle').creatures, true,
    'l’aggro vise plus de créatures que le contrôle');
});

test('bonusStyle récompense la tempo en aggro, les retraits en contrôle, rien en mix', () => {
  const creatureBonMarche = carte('eclaire', { cost: 1, atk: 2, def: 1 });
  const creatureChere = carte('colosse', { cost: 6, atk: 7, def: 7 });
  const brulure = carte('brulure', { kind: 'magie', cost: 2, effet: { type: 'degats', amount: 3 } });
  const contresort = carte('contre', { kind: 'magie', cost: 3, effet: { type: 'contresort' } });
  const pioche = carte('pioche-style', { kind: 'magie', cost: 3, effet: { type: 'pioche', amount: 2 } });

  assert.equal(bonusStyle(creatureBonMarche, 'mix'), 0, 'mix reste neutre');
  assert.equal(bonusStyle(creatureChere, 'mix'), 0, 'mix reste toujours neutre');
  assert.ok(bonusStyle(creatureBonMarche, 'aggro') > bonusStyle(creatureChere, 'aggro'),
    'l’aggro préfère la carte bon marché au finisseur tardif');
  assert.ok(bonusStyle(creatureChere, 'controle') > bonusStyle(creatureBonMarche, 'controle'),
    'le contrôle préfère le finisseur tardif');
  assert.ok(bonusStyle(brulure, 'aggro') > 0, 'les dégâts servent le plan aggro');
  assert.ok(bonusStyle(contresort, 'controle') > 0, 'un contresort sert le plan contrôle');
  assert.ok(bonusStyle(pioche, 'controle') > 0, 'la pioche sert le plan contrôle');
});

test('le style aggro génère une courbe plus basse que le contrôle', () => {
  const cartes = [
    carte('piaf-a', { cost: 1, atk: 2, def: 1 }),
    carte('piaf-b', { cost: 1, atk: 2, def: 1 }),
    carte('loup-a', { cost: 2, atk: 3, def: 2 }),
    carte('loup-b', { cost: 2, atk: 3, def: 2 }),
    carte('garde', { cost: 4, atk: 4, def: 5 }),
    carte('geant-a', { cost: 5, atk: 6, def: 6 }),
    carte('geant-b', { cost: 6, atk: 7, def: 7 }),
    carte('colosse', { cost: 7, atk: 8, def: 8 }),
    carte('brulure', { kind: 'magie', cost: 1, effet: { type: 'degats', amount: 2 } }),
    carte('gel', { kind: 'magie', cost: 3, effet: { type: 'gel' } }),
    carte('contre', { kind: 'magie', cost: 3, effet: { type: 'contresort' } }),
    carte('pioche-style', { kind: 'magie', cost: 3, effet: { type: 'pioche', amount: 2 } }),
  ];
  const moyenne = (ids) => ids.reduce((total, id) => total + (cartes.find((c) => c.id === id)?.cost ?? 0), 0) / ids.length;
  const aggro = genererDeckAssiste({ couleurs: ['sable'], style: 'aggro', catalogue: catalogueDe(cartes), taille: 12 });
  const controle = genererDeckAssiste({ couleurs: ['sable'], style: 'controle', catalogue: catalogueDe(cartes), taille: 12 });
  assert.equal(aggro.cardIds.length, 12);
  assert.equal(controle.cardIds.length, 12);
  assert.ok(moyenne(aggro.cardIds) < moyenne(controle.cardIds),
    `l’aggro (${moyenne(aggro.cardIds).toFixed(2)}) coûte moins cher que le contrôle (${moyenne(controle.cardIds).toFixed(2)})`);
  const basseAggro = aggro.cardIds.filter((id) => cartes.find((c) => c.id === id)?.cost <= 2).length;
  const basseControle = controle.cardIds.filter((id) => cartes.find((c) => c.id === id)?.cost <= 2).length;
  assert.ok(basseAggro > basseControle, 'l’aggro aligne plus de cartes à deux mana ou moins');
  assert.ok(controle.cardIds.includes('contre') || controle.cardIds.includes('gel'),
    'le contrôle embarque un sort de contrôle (contre ou gel)');
});

test('chaque style génère un deck Sable légal dans la collection de départ', () => {
  const catalogue = {
    cartes: RPG_DUEL_CARDS,
    couleursDe: cardColors,
    limiteDe: cardCopyLimit,
  };
  const collection = collectionJoueur();
  for (const style of ['aggro', 'controle', 'mix']) {
    const { cardIds } = genererDeckAssiste({ couleurs: ['sable'], style, collection, catalogue });
    assert.equal(cardIds.length, RPG_ASSISTANT_TAILLE, `${style} : trente cartes`);
    assert.ok(rpgValiderDeck(cardIds).ok, `${style} : le format du duel est tenu`);
    const validation = rpgValiderDeckMaison(cardIds, collection);
    assert.ok(validation.ok, `${style} : deck maison valide — ${validation.raisons.join(' · ')}`);
    assert.ok(cardIds.every((id) => cardColors(cardById(id)).every((couleur) => couleur === 'sable')),
      `${style} : toutes les cartes respectent l’identité Sable`);
  }
});

test('sur catalogue riche, aggro et contrôle séparent leurs courbes et leurs sorts', () => {
  const catalogue = {
    cartes: RPG_DUEL_CARDS,
    couleursDe: cardColors,
    limiteDe: cardCopyLimit,
  };
  const collection = RPG_DUEL_CARDS.map((carte) => carte.id);
  const aggro = genererDeckAssiste({ couleurs: ['braise', 'sable'], style: 'aggro', collection, catalogue });
  const controle = genererDeckAssiste({ couleurs: ['braise', 'sable'], style: 'controle', collection, catalogue });
  const moyenne = (ids) => ids.reduce((total, id) => total + (cardById(id)?.cost ?? 0), 0) / ids.length;
  assert.ok(moyenne(aggro.cardIds) < moyenne(controle.cardIds),
    'l’aggro garde une courbe nettement plus basse que le contrôle');
  const creaAggro = aggro.cardIds.filter((id) => familleDeCarte(cardById(id)) === 'creature').length;
  const creaControle = controle.cardIds.filter((id) => familleDeCarte(cardById(id)) === 'creature').length;
  assert.ok(creaAggro > creaControle, 'l’aggro aligne plus de créatures que le contrôle');
});
