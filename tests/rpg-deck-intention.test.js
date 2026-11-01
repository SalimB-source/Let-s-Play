import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_DUEL_CARDS,
  cardById,
  cardColors,
  cardCopyLimit,
  carteJouableSansTerrain,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { rpgValiderDeckMaison } from '../src/games/rpgDeckBuilder.js';
import {
  RPG_ASSISTANT_TAILLE,
  bonusIntention,
  familleDeCarte,
  genererDeckAssiste,
  normaliserIntention,
  tribusDeCarte,
} from '../src/games/rpgDeckAuto.js';
import {
  RPG_DEMANDES_EXEMPLES,
  RPG_THEMES_DECK,
  cartesNommees,
  couleursDeTheme,
  lireIntention,
  resumerIntention,
  themesDuCatalogue,
  verifierIntention,
} from '../src/games/rpgDeckIntention.js';

/* Catalogue synthétique : trois couleurs, un thème viking, un sort et une arme —
 * de quoi vérifier la lecture sans dépendre du vrai catalogue. */
const carte = (id, surcharge = {}) => ({
  id,
  name: surcharge.name ?? id,
  kind: 'creature',
  cost: 2,
  rarity: 'commune',
  element: 'neige',
  typeLine: 'Créature — Habitant',
  atk: 2,
  def: 2,
  ...surcharge,
});

const catalogueDe = (cartes) => ({
  cartes,
  couleursDe: (c) => (Array.isArray(c?.colors) && c.colors.length ? c.colors : [c?.element].filter(Boolean)),
  limiteDe: (c) => (c?.rarity === 'mythique' ? 1 : 2),
});

const CATALOGUE_REEL = {
  cartes: RPG_DUEL_CARDS,
  couleursDe: cardColors,
  limiteDe: cardCopyLimit,
};

const lireSur = (texte, catalogue = CATALOGUE_REEL, collection = null) => verifierIntention(
  lireIntention(texte, catalogue),
  { catalogue, collection },
);

test('lireIntention lit les couleurs dites, avec accents, pluriels et mots anglais', () => {
  assert.deepEqual(lireIntention('un deck Neige et Ténèbres').couleurs, ['neige', 'tenebres']);
  assert.deepEqual(lireIntention('deck neige tenebres').couleurs, ['neige', 'tenebres'],
    'sans accents, la lecture reste la même');
  assert.deepEqual(lireIntention('des sables et des eaux').couleurs, ['eau', 'sable'],
    'les pluriels sont repliés, dans l’ordre canonique des couleurs');
  assert.deepEqual(lireIntention('an ice and shadow deck').couleurs, ['neige', 'tenebres'],
    'les mots anglais courants sont connus');
  assert.deepEqual(lireIntention('trois couleurs au plus : braise eau sable').couleurs,
    ['braise', 'eau', 'sable']);
});

test('lireIntention lit le style et son intensité', () => {
  assert.equal(lireIntention('un deck contrôle').style, 'controle');
  assert.equal(lireIntention('un deck agressif, très rapide').style, 'aggro');
  assert.equal(lireIntention('un deck équilibré').style, 'mix');
  assert.equal(lireIntention('avec quelques sorts de contrôle').poidsStyle, 0.55,
    '« quelques » allège le plan de jeu');
  assert.ok(lireIntention('beaucoup de retraits, deck contrôle').poidsStyle > 1,
    '« beaucoup » affirme le plan de jeu');
  assert.ok(lireIntention('un deck contrôle à fond').poidsStyle > 1,
    'l’intensité peut suivre le mot qu’elle porte');
  assert.equal(lireIntention('un deck contrôle').poidsStyle, 1, 'sans intensité dite, le poids est neutre');
});

test('lireIntention lit les effets, les familles, la courbe et les raretés', () => {
  const demande = lireIntention('deck avec de la pioche, des soins, des armes, courbe basse et des légendaires');
  assert.ok(demande.effets.includes('pioche') && demande.effets.includes('soin'), 'les effets sont reconnus');
  assert.ok(demande.familles.includes('arme'), 'les armes sont demandées');
  assert.equal(demande.courbe, 'basse');
  assert.deepEqual(demande.raretes, ['mythique'], '« légendaires » demande des mythiques');
});

test('« sans sorts » refuse les magies et les armes, « pas mal de » affirme', () => {
  const refus = lireIntention('un deck viking sans sorts');
  assert.ok(refus.exclusions.familles.includes('magie') && refus.exclusions.familles.includes('arme'),
    'dans ce jeu, « sort » couvre la magie et l’arme : les deux sont refusés');
  assert.ok(!refus.familles.length, 'un refus n’est pas une demande');
  const eviter = lireIntention('éviter les créatures, beaucoup de sorts');
  assert.ok(eviter.exclusions.familles.includes('creature'), '« éviter » refuse aussi');
  assert.ok(eviter.familles.includes('magie') && eviter.familles.includes('arme'),
    '« sorts » demande les magies et les armes');
  const affirmation = lireIntention('pas mal de dégâts');
  assert.ok(affirmation.effets.includes('degats'), '« pas mal de » n’est pas un refus');
  assert.ok(!affirmation.exclusions.effets.length);
});

test('le thème viking est lu, ses couleurs déduites, et le thème impossible est écarté', () => {
  const cartes = [
    carte('viking-givre', { typeLine: 'Créature — Guerrier viking', element: 'neige' }),
    carte('viking-loup', { typeLine: 'Créature — Loup viking', element: 'neige' }),
    carte('sort-de-gel', { kind: 'magie', element: 'neige', effet: { type: 'gel' } }),
    carte('hache-givre', { kind: 'magie', element: 'neige', effet: { type: 'arme' } }),
    carte('bete-de-braise', { typeLine: 'Créature — Bête', element: 'braise' }),
  ];
  const catalogue = catalogueDe(cartes);
  const { intention, alertes } = lireSur('un deck viking, avec des armes', catalogue);
  assert.deepEqual(intention.couleurs, ['neige'], 'les couleurs sont déduites du thème');
  assert.equal(intention.themes.length, 1);
  assert.ok(intention.cartesTheme.includes('viking-givre') && intention.cartesTheme.includes('viking-loup'),
    'les cartes du thème sont nommées');
  assert.ok(intention.familles.includes('arme'));
  assert.ok(alertes.some((alerte) => /Couleurs déduites/.test(alerte.texte)),
    'la déduction des couleurs est annoncée');

  const impossible = lireSur('un deck viking braise', catalogue);
  assert.deepEqual(impossible.intention.couleurs, ['braise'], 'les couleurs dites gagnent sur le thème');
  assert.equal(impossible.intention.themes.length, 0, 'un thème sans carte dans l’identité est écarté');
  assert.ok(impossible.alertes.some((alerte) => /aucune carte en Braise/.test(alerte.texte)),
    'et son retrait est dit au joueur');
});

test('une demande muette le dit, au lieu de générer au hasard', () => {
  const { intention, alertes } = lireSur('un truc quelconque');
  assert.equal(intention.couleurs.length, 0);
  assert.equal(intention.themes.length, 0);
  assert.equal(intention.style, '');
  assert.equal(resumerIntention(intention), 'rien de reconnu');
  assert.ok(alertes.some((alerte) => /Aucun mot du jeu reconnu/.test(alerte.texte)));
});

test('la demande de la maison — Vikings, Neige et Ténèbres, quelques sorts de contrôle', () => {
  const demande = 'un deck viking neige ténèbres, avec quelques sorts de contrôle';
  const { intention } = lireSur(demande);
  assert.deepEqual(intention.couleurs, ['neige', 'tenebres'], 'les deux couleurs dites sont retenues');
  assert.equal(intention.themes[0]?.id, 'viking', 'les Vikings sont reconnus comme thème');
  assert.ok(intention.tribus.includes('viking'), 'le thème porte ses tribus imprimées');
  assert.equal(intention.style, 'controle');
  assert.ok(intention.poidsStyle < 1, '« quelques sorts de contrôle » pèse un contrôle léger');
  assert.ok(intention.effets.includes('degats'), 'le contrôle appelle des retraits');
  assert.ok(intention.familles.includes('magie') && intention.familles.includes('arme'),
    '« sorts » demande des magies et des armes');
  const vikings = intention.cartesTheme.filter((id) => tribusDeCarte(cardById(id)).has('viking'));
  assert.ok(vikings.length >= 8, 'le catalogue compte assez de Vikings dans cette identité');
  assert.ok(intention.cartesTheme.every((id) => cardColors(cardById(id))
    .every((couleur) => ['neige', 'tenebres'].includes(couleur))),
    'les cartes du thème tiennent toutes dans l’identité dite');
  assert.match(intention.resume, /Neige \+ Ténèbres · Vikings · Contrôle léger/);
});

test('chaque thème déclaré existe vraiment au catalogue, et chaque exemple se lit', () => {
  const themes = themesDuCatalogue(CATALOGUE_REEL);
  for (const theme of RPG_THEMES_DECK) {
    assert.ok((themes.get(theme.id) ?? []).length > 0,
      `le thème « ${theme.label} » correspond à des cartes réelles`);
    assert.ok(theme.alias.length >= 3, `le thème « ${theme.label} » se reconnaît sur plusieurs mots`);
  }
  for (const exemple of RPG_DEMANDES_EXEMPLES) {
    const { intention } = lireSur(exemple.texte);
    assert.ok(intention.couleurs.length > 0 || intention.themes.length > 0,
      `l’exemple « ${exemple.texte} » donne au moins des couleurs ou un thème`);
    assert.ok(exemple.accroche.length > 0, 'l’exemple porte une accroche cliquable');
  }
});

test('les cartes nommées se reconnaissent, les mots génériques non', () => {
  assert.deepEqual(cartesNommees('un deck avec le Kraken', CATALOGUE_REEL), ['kraken']);
  assert.deepEqual(cartesNommees('Takouba de Tin Hinan en deux exemplaires', CATALOGUE_REEL),
    ['takouba-de-tin-hinan'], 'le nom entier lève l’ambiguïté entre les deux Takouba');
  assert.deepEqual(cartesNommees('un deck braise ténèbres neige', CATALOGUE_REEL), [],
    'une couleur n’est pas une carte nommée');
  assert.deepEqual(cartesNommees('des vikings et des serpents', CATALOGUE_REEL), [],
    'un thème n’est pas une carte nommée');
});

test('couleursDeTheme trouve la plus petite identité qui couvre le thème', () => {
  const cartes = [
    carte('a', { element: 'neige' }),
    carte('b', { element: 'neige' }),
    carte('c', { colors: ['neige', 'tenebres'] }),
  ];
  const catalogue = catalogueDe(cartes);
  assert.deepEqual(couleursDeTheme(cartes, catalogue.couleursDe), ['neige'],
    'une seule couleur suffit à couvrir le thème');
  assert.deepEqual(couleursDeTheme([carte('d', { element: 'sable' }), ...cartes], catalogue.couleursDe).length <= 3, true,
    'l’identité ne dépasse jamais trois couleurs');
});

test('normaliserIntention rend null quand rien n’est demandé : le score historique est intact', () => {
  assert.equal(normaliserIntention(null), null);
  assert.equal(normaliserIntention(undefined), null);
  assert.equal(normaliserIntention({ texte: '', couleurs: ['neige'] }), null,
    'des couleurs seules ne sont pas une intention : elles passent par `couleurs`');
  const intention = normaliserIntention({
    tribus: ['viking', 'viking'],
    cartesTheme: ['a'],
    effets: ['degats'],
    familles: ['arme'],
    exclusions: { familles: ['magie'] },
    poidsStyle: 0.55,
    partTheme: 0.6,
    signature: ['b'],
  });
  assert.deepEqual(intention.tribus, ['viking'], 'les doublons tombent');
  assert.equal(intention.poidsStyle, 0.55);
  assert.deepEqual(intention.exclureFamilles, ['magie']);
  const bornes = normaliserIntention({ tribus: ['viking'], poidsStyle: 99, partTheme: 99 });
  assert.ok(bornes.poidsStyle <= 1.6 && bornes.partTheme <= 0.95, 'les poids sont bornés');
});

test('bonusIntention sert le thème puis ce qui le complète, et punit les refus', () => {
  const viking = carte('viking', { typeLine: 'Créature — Guerrier viking' });
  const autre = carte('autre', { typeLine: 'Créature — Habitant' });
  const hache = carte('hache', { kind: 'magie', effet: { type: 'arme' } });
  const sort = carte('sort', { kind: 'magie', effet: { type: 'degats', amount: 3 } });
  const demande = normaliserIntention({ tribus: ['viking'], effets: ['degats'], partTheme: 0.6 });
  const etatOuvert = { cibleTheme: 4, themePose: 0, themeIds: new Set() };
  const etatServi = { cibleTheme: 4, themePose: 4, themeIds: new Set() };

  assert.ok(bonusIntention(viking, demande, etatOuvert) > bonusIntention(autre, demande, etatOuvert),
    'tant que la part du thème n’est pas servie, le thème passe devant');
  assert.ok(bonusIntention(autre, demande, etatServi) > 0,
    'une fois le thème servi, ce qui complète reprend l’avantage');
  assert.ok(bonusIntention(sort, demande, etatServi) > bonusIntention(autre, demande, etatServi),
    'les effets demandés pèsent sur le complément');
  assert.ok(bonusIntention(hache, normaliserIntention({ tribus: ['viking'], familles: ['arme'] }), etatServi)
    > bonusIntention(sort, normaliserIntention({ tribus: ['viking'], familles: ['arme'] }), etatServi),
    'les armes demandées passent devant un sort neutre');
  assert.ok(bonusIntention(sort, normaliserIntention({ exclusions: { familles: ['magie'] } }), etatOuvert) < -3,
    'un refus coûte cher');
  assert.equal(bonusIntention(viking, null, etatOuvert), 0, 'sans intention, aucun bonus');
});

test('une intention guide la génération, sans jamais casser le format', () => {
  const cartes = [
    carte('viking-a', { typeLine: 'Créature — Guerrier viking', cost: 2, atk: 3, def: 2 }),
    carte('viking-b', { typeLine: 'Créature — Valkyrie viking', cost: 4, atk: 4, def: 3 }),
    carte('hache-givre', { name: 'Hache de givre', kind: 'magie', cost: 3, effet: { type: 'arme' } }),
    carte('sort-de-gel', { kind: 'magie', cost: 3, effet: { type: 'gel' } }),
    carte('habitant-a', { typeLine: 'Créature — Habitant', cost: 1, atk: 1, def: 1 }),
    carte('habitant-b', { typeLine: 'Créature — Habitant', cost: 2, atk: 2, def: 2 }),
  ];
  const catalogue = catalogueDe(cartes);
  const { intention } = lireSur('un deck viking, avec des armes', catalogue);
  const { cardIds } = genererDeckAssiste({
    couleurs: ['neige'],
    style: 'mix',
    intention,
    catalogue,
    taille: 6,
  });
  assert.equal(cardIds.length, 6);
  const theme = new Set(intention.cartesTheme);
  assert.equal(cardIds.filter((id) => theme.has(id)).length, 4,
    'la part du thème est servie d’abord');
  assert.ok(cardIds.includes('hache-givre'), 'l’arme qui va avec complète le deck');
});

test('sans intention, la génération reste exactement celle d’avant l’invite de texte', () => {
  const collection = RPG_DUEL_CARDS.map((carte) => carte.id);
  for (const style of ['aggro', 'controle', 'mix']) {
    const avant = genererDeckAssiste({ couleurs: ['sable'], style, collection, catalogue: CATALOGUE_REEL });
    const apres = genererDeckAssiste({
      couleurs: ['sable'],
      style,
      intention: null,
      collection,
      catalogue: CATALOGUE_REEL,
    });
    assert.deepEqual(apres.cardIds, avant.cardIds, `${style} : l’intention absente ne change rien`);
    assert.equal(apres.embleme, avant.embleme, `${style} : l’emblème non plus`);
  }
});

test('le deck dicté « viking neige ténèbres » est légal, dans l’identité, et porte son thème', () => {
  const collection = RPG_DUEL_CARDS.map((carte) => carte.id);
  const demande = 'un deck viking neige ténèbres, avec quelques sorts de contrôle';
  const { intention } = lireSur(demande, CATALOGUE_REEL, collection);
  const { cardIds, embleme } = genererDeckAssiste({
    couleurs: intention.couleurs,
    style: intention.style || 'mix',
    intention,
    collection,
    catalogue: CATALOGUE_REEL,
  });
  assert.equal(cardIds.length, RPG_ASSISTANT_TAILLE, 'trente cartes');
  assert.ok(rpgValiderDeck(cardIds).ok, 'le format du duel est tenu');
  const stock = Object.fromEntries(RPG_DUEL_CARDS.map((carte) => [carte.id, 4]));
  const validation = rpgValiderDeckMaison(cardIds, collection, stock);
  assert.ok(validation.ok, `le deck maison est valide — ${validation.raisons.join(' · ')}`);
  assert.ok(cardIds.every((id) => cardColors(cardById(id))
    .every((couleur) => intention.couleurs.includes(couleur))),
    'toutes les cartes respectent l’identité Neige + Ténèbres');
  const theme = new Set(intention.cartesTheme);
  const copiesDeTheme = cardIds.filter((id) => theme.has(id)).length;
  assert.ok(copiesDeTheme >= 12, `le thème est servi (${copiesDeTheme} copies)`);
  const vikings = cardIds.filter((id) => tribusDeCarte(cardById(id)).has('viking')).length;
  assert.ok(vikings >= 8, `les Vikings sont bien là (${vikings} copies)`);
  assert.ok(cardIds.some((id) => familleDeCarte(cardById(id)) === 'arme'),
    'des armes complètent le deck, comme demandé');
  assert.ok(cardIds.some((id) => familleDeCarte(cardById(id)) === 'magie'),
    'et des sorts aussi');
  assert.ok(embleme && theme.has(embleme), 'un deck dicté porte un emblème de son thème');
});

test('le deck dicté tient dans la collection de départ, ou reste un brouillon honnête', () => {
  const collection = collectionJoueur();
  const { intention } = lireSur('un deck du désert, très rapide, avec des armes et des sorts',
    CATALOGUE_REEL, collection);
  assert.ok(intention.couleurs.length > 0, 'la demande donne des couleurs');
  const { cardIds } = genererDeckAssiste({
    couleurs: intention.couleurs,
    style: intention.style || 'mix',
    intention,
    collection,
    catalogue: { ...CATALOGUE_REEL, limiteDe: () => 2 },
  });
  assert.ok(cardIds.every((id) => collection.includes(id)), 'rien n’est posé hors collection');
  assert.ok(cardIds.every((id) => cardColors(cardById(id))
    .every((couleur) => intention.couleurs.includes(couleur))), 'l’identité est tenue');
  if (cardIds.length === RPG_ASSISTANT_TAILLE) {
    assert.ok(rpgValiderDeck(cardIds).ok, 'un deck complet est jouable');
  } else {
    assert.ok(cardIds.length < RPG_ASSISTANT_TAILLE, 'sinon c’est un brouillon, jamais un deck faux');
  }
});

test('une carte nommée devient la signature du deck', () => {
  const collection = RPG_DUEL_CARDS.map((carte) => carte.id);
  const nom = RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
    && carte.rarity !== 'mythique'
    && cardColors(carte).every((couleur) => couleur === 'sable'))[0];
  const { intention } = lireSur(`un deck sable avec ${nom.name}`, CATALOGUE_REEL, collection);
  assert.ok(intention.signature.includes(nom.id), 'la carte dite est reconnue');
  const { cardIds, embleme } = genererDeckAssiste({
    couleurs: intention.couleurs,
    style: intention.style || 'mix',
    intention,
    collection,
    catalogue: CATALOGUE_REEL,
  });
  assert.equal(cardIds.filter((id) => id === nom.id).length, 2, 'elle est posée en deux exemplaires');
  assert.equal(embleme, nom.id, 'et elle illustre le boîtier');
});

test('la lecture ne dépend d’aucun réseau : le module reste pur', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../src/games/rpgDeckIntention.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|supabase/i,
    'aucun appel réseau dans la lecture de la demande');
  const premiere = lireIntention('un deck viking neige ténèbres, avec quelques sorts de contrôle', CATALOGUE_REEL);
  const seconde = lireIntention('un deck viking neige ténèbres, avec quelques sorts de contrôle', CATALOGUE_REEL);
  assert.deepEqual(premiere, seconde, 'deux lectures de la même demande rendent la même intention');
});
