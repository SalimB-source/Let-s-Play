import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { RPG_DECKS_PRECONSTRUITS, cardById, cardHasPrintedType, rpgValiderDeck } from '../src/games/rpgCards.js';
import { RPG_MANA_ESSAI_DECKS, validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { carteCorrespondMateriau, combinaisonsAscension, materiauAscensionValide, validerMateriauxAscension } from '../src/games/rpgAscension.js';
import { planRenfortAscension } from '../src/games/rpgRenforts.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgFinDeTour, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi } from '../src/games/rpgDuel.js';
import { MOBA_DECKS, rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';

const THEMES = ['ascension-dragon', 'ascension-rempart', 'ascension-eclipse', 'ascension-verre'];
const deck = id => RPG_DECKS_THEMATIQUES.find(d => d.id === id);
const compte = (d, id) => d.cardIds.filter(c => c === id).length;
const presences = d => d.cardIds.filter(id => ['creature', 'hero'].includes(cardById(id).kind))
  .map((carteId, i) => ({ id: `copie-${i}`, carteId, pv: cardById(carteId).def }));

for (const id of THEMES) for (const moba of [false, true]) test(`${id} : 30 cartes réelles, couvertures et réserve séparée (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = deck(id); assert.ok(d); assert.equal(d.cardIds.length, 30);
  assert.ok(rpgValiderDeck(d.cardIds).ok); assert.deepEqual(validerDeckManaEssai(d), { ok: true });
  assert.deepEqual(rpgMobaValiderDeck(d), { ok: true }); assert.equal(MOBA_DECKS.find(t => t.id === id), d);
  assert.ok(cardById(d.boxArt).ascension); assert.ok(!d.cardIds.includes(d.boxArt));
  assert.ok(d.cardIds.every(c => !cardById(c).ascension));
  assert.equal(RPG_DECKS_PRECONSTRUITS.find(t => t.id === `preconstruit-${id}`).cardIds, d.cardIds);
  assert.equal(RPG_MANA_ESSAI_DECKS.find(t => t.id === `essai-mana-${id}`).cardIds, d.cardIds);
  const partie = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: d.cardIds, sorcierDeck: d.cardIds, rng: () => .5 });
  assert.equal(partie.joueur.main.length, 5); assert.equal(partie.joueur.deck.length, 25);
  assert.ok(partie.joueur.reserveAscension.includes(d.boxArt));
  assert.ok([...partie.joueur.main, ...partie.joueur.deck].every(c => !cardById(c).ascension));
});

for (const [id, minimum] of [['ascension-dragon', 4], ['ascension-rempart', 4], ['ascension-eclipse', 8], ['ascension-verre', 8]]) test(`${id} : tous les rôles sont représentés en plusieurs exemplaires, combinaisons pures`, () => {
  const d = deck(id), camp = { creatures: presences(d) }, avant = JSON.stringify(camp);
  // Potentiel de la liste, pas un champ illégal : on énumère les couples ou
  // triplets distincts qui pourront être réunis au fil de la partie.
  const groupes = combinaisonsAscension(camp, d.boxArt);
  assert.ok(groupes.length >= minimum, `${groupes.length} possibilités, attendu au moins ${minimum}`);
  for (const g of groupes) assert.ok(validerMateriauxAscension(camp, d.boxArt, g.map(e => e.id)).ok);
  assert.equal(JSON.stringify(camp), avant);
});

test('Dragon : seules les deux cartes nommées constituent la recette', () => {
  const d = deck('ascension-dragon');
  for (const id of ['ronin-du-soleil-rouge','onna-musha-des-cendres']) assert.equal(compte(d,id),2);
  const groupes = combinaisonsAscension({ creatures: presences(d) }, d.boxArt);
  assert.equal(groupes.length,4);
  assert.ok(groupes.every(g => g.map(e=>e.carteId).sort().join(',') === ['ronin-du-soleil-rouge','onna-musha-des-cendres'].sort().join(',')));
  assert.equal(compte(d, 'reanimation'), 2); assert.equal(compte(d, 'rapport-du-greffier'), 2);
});
test('Jarl : Berserk et Jarl nommés en deux exemplaires, soutenus par Ralliement', () => {
  const d = deck('ascension-rempart');
  for (const id of ['berserk-des-trois-hivers','jarl-au-marteau-de-guerre']) assert.equal(compte(d,id),2);
  assert.equal(compte(d, 'ralliement-des-neiges'), 1); assert.equal(compte(d, 'valkyrie-au-corbeau'), 2);
});
test('Scorpion : pas de petit Sable parasite pour le Convoi ; pioche et attaques ciblées pour la proie', () => {
  const d = deck('ascension-eclipse'), effet = cardById('convoi-des-dunes').arrivee;
  const cibles = d.cardIds.filter(id => id !== 'convoi-des-dunes' && carteCorrespondMateriau(id, effet.roles[0]));
  assert.deepEqual(cibles, ['scorpion-du-seuil','scorpion-du-seuil']);
  assert.equal(compte(d, 'rapport-du-greffier'), 2); assert.equal(compte(d, 'javelot-du-beffroi'), 1);
  assert.equal(compte(d, 'ureus-du-seuil'), 2);
});
test('Colosse : deux exemplaires de chaque soutien et du matériau recherché dans la pioche', () => {
  const d = deck('ascension-verre');
  for (const id of ['confluence-des-etincelles','eveil-des-dunes','dune-marchante']) assert.equal(compte(d, id), 2);
  const plan = planRenfortAscension({ main: [...d.cardIds] }, cardById('confluence-des-etincelles').effet);
  assert.equal(plan.length, 2); assert.equal(new Set(plan.map(p => p.index)).size, 2);
  assert.equal(planRenfortAscension({ deck: [...d.cardIds] }, cardById('eveil-des-dunes').effet)[0].id, 'dune-marchante');
});

/** Répartition contrôlée d'un vrai préconstruit : aucune carte inventée ou
 * dépassant son nombre d'exemplaires ; les autres cartes restent en pioche. */
function partie(id, moba, main, cimetiere = []) {
  const d = deck(id), reste = [...d.cardIds];
  for (const c of [...main, ...cimetiere]) { const i = reste.indexOf(c); assert.ok(i >= 0, `${id} ne contient pas ${c}`); reste.splice(i, 1); }
  const p = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: d.cardIds, sorcierDeck: d.cardIds, modeMana: 'essai', rng: () => .5 });
  p.mulliganFait = { joueur: true, sorcier: true }; p.manaEssaiDemarre = true;
  p.joueur.main = [...main]; p.joueur.deck = reste; p.joueur.cimetiere = [...cimetiere];
  for (const s of ['joueur','sorcier']) p[s].manaChoixEnAttente = false;
  return p;
}
function poser(p, id, lane = 'left', slot = 0, sacrificeIds = []) {
  const r = p.moba ? rpgMobaJouerCreature(p, 'joueur', id, lane, slot, { sacrificeIds }) : rpgJouerCreature(p, 'joueur', id, null, { sacrificeIds });
  assert.ok(r.ok, `${id} : ${r.raison}`); return r.entite;
}
function sort(p, id, lane = 'right', slot = 1) {
  const r = p.moba ? (cardById(id).effet.type === 'reanimation'
    ? rpgMobaLancerMagie(p, 'joueur', id, null, lane, null, { emplacementReanimation: slot })
    : rpgMobaLancerMagie(p, 'joueur', id)) : rpgLancerMagie(p, 'joueur', id);
  assert.ok(r.ok, `${id} : ${r.raison}`); return r;
}
function tourSuivant(p) { rpgFinDeTour(p); assert.equal(p.tour, 'sorcier'); rpgFinDeTour(p); assert.equal(p.tour, 'joueur'); }
function ascension(p, id, materiaux) {
  assert.equal(p.moba ? p.moba.creaturesJouees.joueur : p.joueur.invocationNormaleJouee, true, 'quota normal déjà dépensé par une vraie pose');
  const es = materiaux.map(c => p.joueur.creatures.find(e => e.carteId === c)); assert.ok(es.every(Boolean));
  const physique = p.moba && p.moba.lanes.find(l => l.slots.joueur.includes(es[0].id));
  const e = poser(p, id, physique?.id, physique?.slots.joueur.indexOf(es[0].id), es.map(e => e.id));
  assert.ok(e); assert.equal(p.moba ? p.moba.creaturesJouees.joueur : p.joueur.invocationNormaleJouee, true);
  assert.ok(es.every(e => !p.joueur.creatures.includes(e))); assert.ok(!p.joueur.reserveAscension.includes(id));
  if (p.moba) assert.ok(rpgMobaPlacementCoherent(p));
}
for (const moba of [false, true]) {
  const mode = moba ? 'MOBA' : 'Duel';
  test(`Dragon (${mode}) : vrai Rōnin posé + Onna réanimée, puis Ascension sans autre quota`, () => {
    const p = partie('ascension-dragon', moba, ['ronin-du-soleil-rouge','reanimation'], ['onna-musha-des-cendres']);
    poser(p, 'ronin-du-soleil-rouge'); sort(p, 'reanimation');
    ascension(p, 'samourai-du-dragon-rouge', ['ronin-du-soleil-rouge','onna-musha-des-cendres']);
  });
  test(`Jarl (${mode}) : le Ralliement invoque le Berserk nommé après la pose du Jarl`, () => {
    const p = partie('ascension-rempart', moba, ['viking-des-neiges','jarl-au-marteau-de-guerre','ralliement-des-neiges']);
    const petit = poser(p, 'viking-des-neiges'); tourSuivant(p);
    poser(p, 'jarl-au-marteau-de-guerre', 'left', 0, [petit.id]); sort(p, 'ralliement-des-neiges');
    const choix = rpgCartesRenfortChoisi(p, 'joueur').find(c => c.id === 'berserk-des-trois-hivers');
    assert.ok(choix);
    const r = moba ? rpgMobaResoudreRecherche(p, 'joueur', choix.id, choix.index) : rpgResoudreRenfortChoisi(p, 'joueur', choix.index);
    assert.ok(r.ok, JSON.stringify(r));
    ascension(p, 'jarl-du-dernier-rempart', ['jarl-au-marteau-de-guerre','berserk-des-trois-hivers']);
  });
  test(`Scorpion (${mode}) : le Convoi trouve le Scorpion, Retour relève la Momie, puis trois sacrifices`, () => {
    const p = partie('ascension-eclipse', moba, ['ureus-du-seuil','convoi-des-dunes','scorpion-du-seuil','retour-des-ensevelis'], ['momie-de-lin']);
    poser(p, 'ureus-du-seuil'); tourSuivant(p); poser(p, 'convoi-des-dunes', 'left', 1); sort(p, 'retour-des-ensevelis');
    ascension(p, 'scorpion-de-l-eclipse', ['scorpion-du-seuil','ureus-du-seuil','momie-de-lin']);
  });
  test(`Colosse (${mode}) : invocation normale consommée, Confluence + Éveil, puis trois sacrifices`, () => {
    const p = partie('ascension-verre', moba, ['fennec-des-decombres','confluence-des-etincelles','eveil-des-dunes','djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante']);
    // Une vraie petite pose du paquet consomme le quota sans être un matériau.
    poser(p, 'fennec-des-decombres'); sort(p, 'confluence-des-etincelles'); sort(p, 'eveil-des-dunes');
    ascension(p, 'colosse-du-verre-ardent', ['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante','dune-marchante']);
  });
}


test('le guide reproduit les quantités, coûts et matériaux nommés de chaque liste', () => {
  const guide = readFileSync(new URL('../docs/rpg/32-decks-ascension.md', import.meta.url), 'utf8');
  for (const id of THEMES) {
    const d = deck(id), section = guide.split(`. ${d.name}\n`)[1]?.split('\n## ')[0]; assert.ok(section, id);
    const lignes = [...section.matchAll(/^\| (\d+)× \| ([^|]+) \| (\d+) \| ([^|]+) \|$/gm)];
    assert.equal(lignes.length, new Set(d.cardIds).size, id);
    assert.equal(lignes.reduce((n, l) => n + Number(l[1]), 0), 30, id);
    for (const l of lignes) {
      const carteId = d.cardIds.find(c => cardById(c).name === l[2].trim()); assert.ok(carteId, l[2]);
      const c = cardById(carteId); assert.equal(Number(l[1]), compte(d, carteId)); assert.equal(Number(l[3]), c.cost);
      assert.equal(l[4].includes('Oui'), materiauAscensionValide(cardById(d.boxArt), { carteId, pv: c.def }), `${id} : ${c.name}`);
    }
  }
  assert.match(guide, /\| 2× \| Berserk des trois hivers \| 3 \| \*\*Oui/);
});

for (const [theme, ascensionId] of [
  ['ascension-dragon', 'samourai-du-dragon-rouge'], ['lionne', 'samourai-du-dragon-rouge'],
  ['ascension-eclipse', 'scorpion-de-l-eclipse'],
  ['ascension-verre', 'colosse-du-verre-ardent'], ['sahir', 'colosse-du-verre-ardent'],
  ['vikings', 'valkyrie-de-la-derniere-aurore'], ['ascension-rempart', 'valkyrie-de-la-derniere-aurore'],
  ['corsaires', 'amiral-des-abysses'], ['corsaires', 'serpent-des-deux-rivages'],
  ['vikings', 'jarl-du-dernier-rempart'], ['ascension-rempart', 'jarl-du-dernier-rempart'],
]) test(`${theme} : matériaux nommés et Ascension ${ascensionId} dans la réserve`, () => {
  const d = deck(theme), carte = cardById(ascensionId);
  assert.equal(d.cardIds.length, 30); assert.ok(rpgValiderDeck(d.cardIds).ok);
  assert.deepEqual(rpgMobaValiderDeck(d), { ok: true });
  for (const role of carte.ascension.materiaux) {
    const attendu = theme === 'vikings' && role.carteId === 'jarl-au-marteau-de-guerre' ? 1 : 2;
    assert.equal(compte(d, role.carteId), attendu, `${theme} : ${role.carteId}`);
  }
  assert.ok(combinaisonsAscension({ creatures: presences(d) }, ascensionId).length > 0);
  assert.ok(!d.cardIds.includes(ascensionId));
  for (const creer of [rpgNouveauDuel, rpgMobaNouveauDuel]) {
    const p = creer({ joueurDeck: d.cardIds, sorcierDeck: d.cardIds, rng: () => .5 });
    assert.ok(p.joueur.reserveAscension.includes(ascensionId));
    assert.ok([...p.joueur.main, ...p.joueur.deck].every(id => !cardById(id).ascension));
  }
});

for (const moba of [false, true]) for (const theme of ['vikings', 'ascension-rempart']) test(`${theme} : invocation réelle de la Valkyrie (${moba ? 'MOBA' : 'Duel'})`, () => {
  const p = partie(theme, moba, ['guerrier-au-bouclier-rond', 'gardien-viking-du-fjord']);
  poser(p, 'guerrier-au-bouclier-rond'); tourSuivant(p); poser(p, 'gardien-viking-du-fjord', 'left', 1);
  ascension(p, 'valkyrie-de-la-derniere-aurore', ['guerrier-au-bouclier-rond', 'gardien-viking-du-fjord']);
});
for (const moba of [false, true]) test(`corsaires : invocation réelle de l’Amiral (${moba ? 'MOBA' : 'Duel'})`, () => {
  const p = partie('corsaires', moba, ['rais-de-la-galiote', 'la-vengeance-de-la-reine-anne']);
  poser(p, 'rais-de-la-galiote'); tourSuivant(p); poser(p, 'la-vengeance-de-la-reine-anne', 'left', 1);
  ascension(p, 'amiral-des-abysses', ['rais-de-la-galiote', 'la-vengeance-de-la-reine-anne']);
});

for (const moba of [false, true]) test(`Forge des samouraïs : invocation réelle du Dragon (${moba ? 'MOBA' : 'Duel'})`, () => {
  const p = partie('lionne', moba, ['ronin-du-soleil-rouge', 'onna-musha-des-cendres']);
  poser(p, 'ronin-du-soleil-rouge'); tourSuivant(p); poser(p, 'onna-musha-des-cendres', 'left', 1);
  ascension(p, 'samourai-du-dragon-rouge', ['ronin-du-soleil-rouge', 'onna-musha-des-cendres']);
});
for (const moba of [false, true]) test(`Meute des braises : invocation réelle du Colosse (${moba ? 'MOBA' : 'Duel'})`, () => {
  const p = partie('sahir', moba, ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante', 'confluence-des-etincelles']);
  poser(p, 'dune-marchante', 'left', 0); sort(p, 'confluence-des-etincelles');
  ascension(p, 'colosse-du-verre-ardent', ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante']);
  assert.ok(p.moba ? p.mobaRechercheEnAttente : p.renfortChoixEnAttente);
});
