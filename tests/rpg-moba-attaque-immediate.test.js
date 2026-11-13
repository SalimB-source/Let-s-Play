import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgPeutAttaquer, rpgChoisirBloqueurs, rpgOuvrirFinDeTour, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaLancerMagie, rpgMobaJouerArme, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaPeutEmbuscade, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';

function commencer(moba = false, pvp = false) {
  const deck = Array(30).fill('chien-du-guet');
  const options = { joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, pvp, rng: () => .5 };
  const d = moba ? rpgMobaNouveauDuel(options) : rpgNouveauDuel(options);
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function poser(d, side, id, slot = 0) {
  d[side].main = [id];
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, 'left', slot) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function passer(d) { const avant = d.tour; rpgFinDeTour(d); assert.notEqual(d.tour, avant); }

for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`${moba ? 'MOBA' : 'classique'} ${side} : mal à l’arrivée, levé au début du prochain tour`, () => {
    const d = commencer(moba); if (side === 'sorcier') passer(d);
    const e = poser(d, side, 'gardienne-des-portes-de-sable');
    assert.equal(e.malInvocation, true); assert.equal(rpgPeutAttaquer(e), false);
    if (moba) assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, e.id, null, 'left').raison, 'pas-pret');
    passer(d); assert.equal(e.malInvocation, true); assert.equal(rpgPeutAttaquer(e), false);
    passer(d); assert.equal(e.malInvocation, false); assert.equal(rpgPeutAttaquer(e), true);
  });
  test(`${moba ? 'MOBA' : 'classique'} ${side} : Rapidité et autres interdictions`, () => {
    const d = commencer(moba); if (side === 'sorcier') passer(d);
    const e = poser(d, side, 'fennec-des-decombres');
    assert.equal(e.rapidite, true); assert.equal(rpgPeutAttaquer(e), true);
    e.gelToursRestants = 1; assert.equal(rpgPeutAttaquer(e), false);
    e.gelToursRestants = 0; e.attaquee = true; assert.equal(rpgPeutAttaquer(e), false);
  });
}

test('PvP : le serveur refuse une attaque prématurée, puis accepte au tour suivant', () => {
  const d = commencer(false, true); d.joueur.main = ['chien-du-guet'];
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'chien-du-guet' }).ok);
  const e = d.joueur.creatures[0];
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [e.id] }).raison, 'pas-pret');
  passer(d); passer(d);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [e.id] }).ok);
});

test('IA MOBA ne sélectionne pas une créature malade', () => {
  const d = commencer(true); passer(d); const e = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgMobaChoisirAttaqueIndividuelleIA(d, 'sorcier'), null);
  passer(d); passer(d);
  assert.equal(rpgMobaChoisirAttaqueIndividuelleIA(d, 'sorcier')?.attaquantId, e.id);
});

test('une créature fraîche défend : le mal ne désactive pas le blocage', () => {
  const d = commencer(); const defenseur = poser(d, 'joueur', 'chien-du-guet');
  passer(d); const attaquant = poser(d, 'sorcier', 'fennec-des-decombres');
  assert.equal(rpgPeutAttaquer(defenseur), false);
  assert.deepEqual(rpgChoisirBloqueurs(d, 'sorcier', [attaquant.id]), { [attaquant.id]: [defenseur.id] });
});

for (const moba of [false, true]) test(`${moba ? 'MOBA' : 'classique'} : la réanimation est une nouvelle arrivée`, () => {
  const d = commencer(moba); d.joueur.main = ['reanimation']; d.joueur.cimetiere = ['chien-du-guet'];
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'left', null, { emplacementReanimation: 0 }) : rpgLancerMagie(d, 'joueur', 'reanimation');
  assert.ok(r.ok, JSON.stringify(r)); const e = d.joueur.creatures[0];
  assert.equal(e.carteId, 'chien-du-guet'); assert.equal(rpgPeutAttaquer(e), false);
  passer(d); passer(d); assert.equal(rpgPeutAttaquer(e), true);
});

test('Sandales classiques : gain, retrait, puis expiration normale du mal', () => {
  const d = commencer(); const e = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main = ['sandales-de-tislit', 'cuirasse-de-sel'];
  assert.ok(rpgJouerArme(d, 'joueur', 'sandales-de-tislit', e.id).ok); assert.equal(rpgPeutAttaquer(e), true);
  assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', e.id).ok); assert.equal(rpgPeutAttaquer(e), false);
  passer(d); passer(d); assert.equal(rpgPeutAttaquer(e), true);
});

test('Sandales MOBA : elles ne donnent pas Rapidité', () => {
  const d = commencer(true); const e = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main = ['sandales-de-tislit']; assert.ok(rpgMobaJouerArme(d, 'joueur', 'sandales-de-tislit', e.id).ok);
  assert.equal(e.rapidite, false); assert.equal(rpgPeutAttaquer(e), false);
});

test('Embuscade sans Rapidité pendant le tour adverse : défense puis prochain tour', () => {
  const d = commencer(); const ennemi = poser(d, 'joueur', 'chien-du-guet');
  d.sorcier.main = ['pilote-de-la-carreira']; assert.ok(rpgOuvrirFinDeTour(d));
  const r = rpgJouerCreature(d, 'sorcier', 'pilote-de-la-carreira'); assert.ok(r.ok, JSON.stringify(r));
  const e = r.entite; assert.equal(rpgPeutAttaquer(e), false);
  assert.deepEqual(rpgChoisirBloqueurs(d, 'joueur', [ennemi.id]), { [ennemi.id]: [e.id] });
  passer(d); assert.equal(e.malInvocation, false); assert.equal(rpgPeutAttaquer(e), true);
});

test('les fiches conservent Rapidité et Embuscade, ainsi que Rapidité des jetons', () => {
  const c = rpgMobaCartePourApercu(cardById('fennec-des-decombres'));
  assert.equal(c.rapidite, true); assert.match(c.text, /Invocation spéciale/); assert.match(c.text, /Rapidité/);
  const labels = effetsDetailles(c).pastilles.map(p => p.cle);
  assert.ok(labels.includes('rapidite') && labels.includes('reactionTourAdverse'));
  assert.match(rpgMobaNotesCarte(cardById('fennec-des-decombres')).join(' '), /Rapidité/);
  for (const id of ['chien-de-sable', 'guepard']) {
    const token = rpgMobaCartePourApercu(cardById(id)); assert.equal(token.rapidite, true); assert.match(token.text, /Rapidité/);
  }
});

for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`${moba ? 'MOBA' : 'classique'} ${side} : retour programmé en début de tour reste malade`, () => {
    const d = commencer(moba); if (side === 'joueur') passer(d);
    d[side].cimetiere = ['chien-du-guet'];
    d[side].retoursProgrammes.push({ carteId: 'chien-du-guet', toursRestants: 1, ...(moba ? { mobaLane: 'left' } : {}) });
    passer(d); assert.equal(d.tour, side);
    const e = d[side].creatures.find(x => x.carteId === 'chien-du-guet'); assert.ok(e);
    assert.equal(e.malInvocation, true); assert.equal(rpgPeutAttaquer(e), false);
    passer(d); passer(d); assert.equal(rpgPeutAttaquer(e), true);
  });
  test(`${moba ? 'MOBA' : 'classique'} ${side} : retour d’exil en fin de tour est une arrivée`, () => {
    const d = commencer(moba); if (side === 'sorcier') passer(d);
    (d[side].exil ??= []).push('chien-du-guet');
    d.retoursExilFinTour = [{ cote: side, carteId: 'chien-du-guet', ...(moba ? { mobaLane: 'left', mobaSlot: 0 } : {}) }];
    passer(d); const e = d[side].creatures.find(x => x.carteId === 'chien-du-guet');
    assert.ok(e); assert.equal(rpgPeutAttaquer(e), false);
    passer(d); assert.equal(rpgPeutAttaquer(e), true);
  });
}

for (const moba of [false, true]) for (const [id, token] of [['tarek', 'chien-de-sable'], ['kusayla-roi-des-imazighen', 'guepard']]) {
  test(`${moba ? 'MOBA' : 'classique'} : ${id} crée un jeton avec Rapidité`, () => {
    const d = commencer(moba); const sacrifice = poser(d, 'joueur', 'chien-du-guet');
    passer(d); passer(d); d.joueur.main = [id];
    const r = moba ? rpgMobaJouerCreature(d, 'joueur', id, 'left', 0, { sacrificeIds: [sacrifice.id] })
      : rpgJouerCreature(d, 'joueur', id, null, { sacrificeIds: [sacrifice.id] });
    assert.ok(r.ok, JSON.stringify(r));
    const e = d.joueur.creatures.find(x => x.carteId === token); assert.ok(e);
    assert.equal(e.rapidite, true); assert.equal(rpgPeutAttaquer(e), true);
    assert.equal(rpgPeutAttaquer(r.entite), false);
  });
}

test('Retirer Rapidité en réponse ne rend pas illégale une attaque PvP déjà déclarée', () => {
  const d = commencer(false, true); const e = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main = ['sandales-de-tislit']; assert.ok(rpgJouerArme(d, 'joueur', 'sandales-de-tislit', e.id).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [e.id] }).ok);
  d.sorcier.main = ['brise-lame']; assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'brise-lame', cibleId: e.id }).ok);
  assert.equal(e.rapidite, false); assert.equal(rpgPeutAttaquer(e), false);
  const r = rpgPvpAppliquer(d, 'sorcier', { type: 'bloquer', blocages: {} });
  assert.ok(r.ok, JSON.stringify(r));
});

for (const side of ['joueur', 'sorcier']) test(`MOBA : Embuscade de ${side} avec Rapidité conserve les deux capacités`, () => {
  const d = commencer(true); const actif = side === 'joueur' ? 'sorcier' : 'joueur';
  if (actif === 'sorcier') passer(d);
  const adversaire = poser(d, actif, 'chien-du-guet'); adversaire.pv--;
  d[side].main = ['fennec-des-decombres'];
  assert.ok(rpgMobaTerminerTour(d, actif).ok); assert.ok(rpgMobaPeutEmbuscade(d, side, 'fennec-des-decombres'));
  const r = rpgMobaJouerCreature(d, side, 'fennec-des-decombres', 'left', 0); assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.entite.rapidite, true); assert.equal(rpgPeutAttaquer(r.entite), true);
  assert.ok(rpgMobaPasserFinDeTour(d, side).ok); assert.equal(d.tour, side); assert.equal(r.entite.malInvocation, false);
});

test('MOBA : une créature malade défend contre une attaque individuelle', () => {
  const d = commencer(true); const defenseur = poser(d, 'joueur', 'chien-du-guet');
  passer(d); const a = poser(d, 'sorcier', 'fennec-des-decombres');
  assert.equal(rpgPeutAttaquer(defenseur), false);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', a.id, defenseur.id, 'left').ok);
  const r = rpgMobaResoudreAttaqueIndividuelle(d, 'sorcier'); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.resume.paires.length > 0);
});

test('MOBA : la prisonnière libérée de la cale revient avec le mal d’invocation', () => {
  const d = commencer(true); const victime = poser(d, 'joueur', 'chien-du-guet');
  passer(d); d.sorcier.prochaineArriveeAbordage = true;
  const capteur = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  assert.equal(capteur.enCale?.entite.id, victime.id);
  passer(d); d.joueur.main = ['effacement-des-faibles'];
  const r = rpgMobaLancerMagie(d, 'joueur', 'effacement-des-faibles', capteur.id);
  assert.ok(r.ok, JSON.stringify(r)); assert.ok(d.joueur.creatures.includes(victime));
  assert.equal(victime.malInvocation, true); assert.equal(rpgPeutAttaquer(victime), false);
  passer(d); passer(d); assert.equal(rpgPeutAttaquer(victime), true);
});

for (const side of ['joueur', 'sorcier']) test(`PvP ${side} : attaque refusée à l’arrivée et autorisée avec Rapidité`, () => {
  const d = commencer(false, true); if (side === 'sorcier') passer(d);
  d[side].main = ['chien-du-guet'];
  assert.ok(rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: 'chien-du-guet' }).ok);
  const e = d[side].creatures[0];
  assert.equal(rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [e.id] }).raison, 'pas-pret');
  passer(d); passer(d);
  assert.ok(rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [e.id] }).ok);

  const rapide = commencer(false, true); if (side === 'sorcier') passer(rapide);
  rapide[side].main = ['fennec-des-decombres'];
  assert.ok(rpgPvpAppliquer(rapide, side, { type: 'jouer-carte', carteId: 'fennec-des-decombres' }).ok);
  assert.ok(rpgPvpAppliquer(rapide, side, { type: 'attaquer', declarer: true, attaquants: [rapide[side].creatures[0].id] }).ok);
});

test('IA classique ne propose une attaque que lorsque le mal est tombé', () => {
  const d = commencer(); passer(d); const e = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier'), null);
  passer(d); passer(d);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier')?.attaquantId, e.id);
});
