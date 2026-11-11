import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgJouerArme,
  rpgReglerHasard, rpgBlesserCreature,
} from '../src/games/rpgDuel.js';
import { degatsApresEsquive } from '../src/games/rpgAI.js';

function duelVide() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  for (const cote of ['joueur', 'sorcier']) {
    Object.assign(duel[cote].mana, { braise: 30, eau: 30, sable: 30, neige: 30, tenebres: 30 });
  }
  return duel;
}

function poser(duel, cote, carteId, cibleId = null, options = {}) {
  duel.tour = cote;
  duel[cote].main.push(carteId);
  const resultat = rpgJouerCreature(duel, cote, carteId, cibleId, options);
  assert.ok(resultat.ok, `${carteId} : ${JSON.stringify(resultat)}`);
  return resultat.entite;
}

test('une capacité hostile ciblée s’esquive ou non au seuil de 15 %', () => {
  for (const [jet, esquive] of [[0.14, true], [0.15, false]]) {
    const duel = duelVide();
    const cible = poser(duel, 'joueur', 'onna-musha-des-cendres');
    rpgReglerHasard(duel, () => jet);
    poser(duel, 'sorcier', 'vipere-de-verre', cible.id);
    assert.equal(cible.atk, esquive ? 3 : 1);
    assert.equal((cible.empecheAttaqueToursRestants ?? 0) > 0, !esquive);
    assert.equal(duel.log.some((ligne) => ligne.includes('esquive la capacité')), esquive);
  }
});

test('le souffle du Géant ne lance qu’un jet par créature et annule aussi son gel', () => {
  const duel = duelVide();
  const esquiveuse = poser(duel, 'joueur', 'onna-musha-des-cendres');
  const touchee = poser(duel, 'joueur', 'onna-musha-des-cendres');
  esquiveuse.ready = true;
  touchee.ready = true;
  const sacrifice = poser(duel, 'sorcier', 'ashigaru-des-braises');
  let jets = 0;
  rpgReglerHasard(duel, () => (++jets === 1 ? 0 : 0.9));
  poser(duel, 'sorcier', 'geant-des-banquises', null, { sacrificeId: sacrifice.id });
  assert.equal(jets, 2, 'un seul jet pour les dégâts et le gel de chaque cible');
  assert.equal(esquiveuse.pv, 3);
  assert.equal(esquiveuse.gelToursRestants ?? 0, 0);
  assert.equal(touchee.pv, 2);
  assert.ok(touchee.gelToursRestants > 0);
});

test('le gel de zone sans dégâts est aussi esquivé, sans perdre la cible non esquivante', () => {
  const duel = duelVide();
  const esquiveuse = poser(duel, 'joueur', 'onna-musha-des-cendres');
  const touchee = poser(duel, 'joueur', 'onna-musha-des-cendres');
  const sacrifice = poser(duel, 'sorcier', 'ashigaru-des-braises');
  let jets = 0;
  rpgReglerHasard(duel, () => (++jets === 1 ? 0 : 0.9));
  poser(duel, 'sorcier', 'le-cavalier-du-ressac-gele', null, { sacrificeId: sacrifice.id });
  assert.equal(jets, 2);
  assert.equal(esquiveuse.gelToursRestants ?? 0, 0);
  assert.ok(touchee.gelToursRestants > 0);
});

test('une vague qui frappe les deux camps peut être esquivée aussi par les alliés touchés', () => {
  const duel = duelVide();
  const alliee = poser(duel, 'sorcier', 'onna-musha-des-cendres');
  const adversaire = poser(duel, 'joueur', 'onna-musha-des-cendres');
  const sacrifice = poser(duel, 'sorcier', 'ashigaru-des-braises');
  let jets = 0;
  rpgReglerHasard(duel, () => { jets += 1; return 0; });
  poser(duel, 'sorcier', 'valkyrie-des-glaces', null, { sacrificeId: sacrifice.id });
  assert.equal(jets, 2, 'chaque créature touchée, alliée ou adverse, tente son propre jet');
  assert.equal(alliee.pv, 3);
  assert.equal(adversaire.pv, 3);
});

test('un effet allié ne s’esquive pas, y compris la blessure du porteur de la Hache', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'onna-musha-des-cendres');
  let jets = 0;
  rpgReglerHasard(duel, () => { jets += 1; return 0; });
  duel.joueur.main.push('hache-de-la-banquise');
  duel.tour = 'joueur';
  assert.ok(rpgJouerArme(duel, 'joueur', 'hache-de-la-banquise', porteur.id).ok);
  assert.equal(jets, 0, 'le prix de son propre équipement ne tente pas de jet');
  assert.equal(porteur.pv, 2);
  const blessureAlliee = rpgBlesserCreature(duel, 'joueur', porteur.id, 1,
    'neige', null, 'capacite', null, null, 'joueur');
  assert.equal(blessureAlliee.esquive, false);
  assert.equal(jets, 0);
});

test('l’IA estime aussi les capacités et la chance cumulée d’Esquive', () => {
  assert.equal(degatsApresEsquive({ esquive: true, esquiveChance: 0.3 }, 10, 'capacite'), 7);
  assert.equal(degatsApresEsquive({ esquive: true, esquiveChance: 0.3 }, 10, 'magie'), 7);
  assert.equal(degatsApresEsquive({ esquive: true, esquiveChance: 0.3 }, 10, 'poison'), 10);
});
