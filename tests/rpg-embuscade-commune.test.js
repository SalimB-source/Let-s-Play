import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_CREATURE_CARDS } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgCarteEmbuscade, rpgConditionEmbuscadeCommune, rpgTexteConditionEmbuscade } from '../src/games/rpgEmbuscade.js';
import { MOBA_EMBUSCADES_CONDITIONS } from '../src/games/rpgMobaEmbuscades.js';
import { MOBA_RAPIDITE_EMBUSCADES } from '../src/games/rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES } from '../src/games/rpgMobaEmbuscadesImprimees.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgOuvrirFinDeTour, rpgPeutRepondre, rpgSorcierMagieRapide } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { conditionEmbuscadePourApercu } from '../src/games/rpgCardResume.js';
import { effetsDetailles } from '../src/games/effetIcons.js';

function partie(pvp = false) {
  const deck = Array(30).fill('chien-du-guet');
  const d = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, pvp, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function poser(d, cote, id) {
  d.tour = cote; d[cote].invocationNormaleJouee = false; d[cote].main = [id];
  const res = rpgJouerCreature(d, cote, id);
  assert.ok(res.ok, JSON.stringify(res)); return res.entite;
}

test('tous les registres MOBA sont reconnus avec leur condition dans les deux camps et modes', () => {
  const d = partie();
  const a = poser(d, 'joueur', 'gardienne-des-portes-de-sable'); a.pv--;
  poser(d, 'sorcier', 'ashigaru-des-braises');
  for (const id of new Set([...Object.keys(MOBA_EMBUSCADES_CONDITIONS), ...Object.keys(MOBA_RAPIDITE_EMBUSCADES), ...Object.keys(MOBA_EMBUSCADES_IMPRIMEES)])) {
    assert.ok(rpgCarteEmbuscade(id), id);
    assert.ok(rpgTexteConditionEmbuscade(id), id);
    for (const cote of ['joueur', 'sorcier']) {
      const normal = rpgConditionEmbuscadeCommune(d, cote, id);
      d.moba = {};
      assert.equal(rpgConditionEmbuscadeCommune(d, cote, id), normal, `${id} ${cote}`);
      delete d.moba;
    }
  }
  for (const c of RPG_CREATURE_CARDS.filter(c => c.reactionTourAdverse)) assert.ok(rpgCarteEmbuscade(c), c.id);
});

for (const defenseur of ['joueur', 'sorcier']) for (const pvp of [false, true]) {
  test(`les trois catégories ne répondent pas pendant le tour adverse (${defenseur}, ${pvp ? 'PvP' : 'solo'})`, () => {
    const d = partie(pvp); const actif = defenseur === 'joueur' ? 'sorcier' : 'joueur';
    const allie = poser(d, defenseur, 'gardienne-des-portes-de-sable'); allie.pv--;
    const ennemi = poser(d, actif, 'chien-du-guet'); ennemi.pv--;
    d[defenseur].main = ['pilote-de-la-carreira', 'fennec-des-decombres', 'sentinelle-des-sables'];
    assert.equal(rpgPeutRepondre(d, defenseur), false);
    assert.ok(rpgOuvrirFinDeTour(d));
    for (const id of d[defenseur].main) {
      const avant = JSON.stringify(d);
      const res = pvp ? rpgPvpAppliquer(d, defenseur, { type: 'jouer-carte', carteId: id }) : rpgJouerCreature(d, defenseur, id);
      assert.equal(res.ok, false, id);
      assert.equal(JSON.stringify(d), avant);
    }
  });
  test(`condition non remplie refuse sans mutation (${defenseur}, ${pvp ? 'PvP' : 'solo'})`, () => {
    const d = partie(pvp); d.tour = defenseur === 'joueur' ? 'sorcier' : 'joueur';
    d[defenseur].main = ['ronin-du-soleil-rouge']; d.fenetreReponse = true;
    assert.equal(rpgPeutRepondre(d, defenseur), false);
    const avant = JSON.stringify(d);
    const res = pvp ? rpgPvpAppliquer(d, defenseur, { type: 'jouer-carte', carteId: 'ronin-du-soleil-rouge' }) : rpgJouerCreature(d, defenseur, 'ronin-du-soleil-rouge');
    assert.equal(res.ok, false); assert.equal(JSON.stringify(d), avant);
  });
}

test('le Sorcier du ressac ne peut plus répondre pendant le tour adverse', () => {
  const d = partie(true);
  poser(d, 'sorcier', 'sentinelle-des-sables');
  poser(d, 'joueur', 'chien-du-guet');
  d.sorcier.cimetiere = ['trait-de-braise']; d.sorcier.main = ['sorcier-du-ressac-noir'];
  d.fenetreReponse = true;
  const avant = JSON.stringify(d);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'sorcier-du-ressac-noir' }).ok, false);
  assert.equal(JSON.stringify(d), avant);
});

test('IA solo ne répond plus avec une créature Invocation spéciale', () => {
  const d = partie(); const ennemi = poser(d, 'joueur', 'chien-du-guet'); ennemi.pv--;
  d.sorcier.main = ['fennec-des-decombres']; d.fenetreReponse = true;
  assert.equal(rpgSorcierMagieRapide(d, () => .5), null);
});

test('les aperçus indiquent la condition commune et la pastille Embuscade', () => {
  for (const id of ['veilleuse-des-citernes', 'fennec-des-decombres', 'tojiro-le-pourfendeur']) {
    const carte = cardById(id);
    assert.equal(conditionEmbuscadePourApercu(carte), rpgTexteConditionEmbuscade(id));
    const lecture = effetsDetailles(carte);
    assert.ok(lecture.pastilles.some(p => p.cle === 'reactionTourAdverse'));
    assert.equal(lecture.pastilles.some(p => p.cle === 'rapidite'), Boolean(carte.rapidite));
    assert.ok(!lecture.texte.includes('pendant le tour adverse seulement'));
  }
});

test('une Embuscade reste une invocation normale à son tour, même si sa condition manque', () => {
  const d = partie(true);
  d.joueur.main = ['tojiro-le-pourfendeur'];
  assert.equal(rpgJouerCreature(d, 'joueur', 'tojiro-le-pourfendeur').raison, 'sacrifice-requis');
  const victime = poser(d, 'joueur', 'gardienne-des-portes-de-sable');
  d.joueur.invocationNormaleJouee = false; d.joueur.main = ['tojiro-le-pourfendeur'];
  const res = rpgJouerCreature(d, 'joueur', 'tojiro-le-pourfendeur', null, { sacrificeIds: [victime.id] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.equal(d.joueur.invocationNormaleJouee, true);
  assert.ok(!d.joueur.creatures.includes(victime));
});

test('une créature sans Embuscade ne peut pas être invoquée pendant le tour adverse', () => {
  for (const pvp of [false, true]) {
    const d = partie(pvp); d.sorcier.main = ['chien-du-guet']; d.fenetreReponse = true;
    const res = pvp ? rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'chien-du-guet' }) : rpgJouerCreature(d, 'sorcier', 'chien-du-guet');
    assert.equal(res.ok, false);
  }
});
