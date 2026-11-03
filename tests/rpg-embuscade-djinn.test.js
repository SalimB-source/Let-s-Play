import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardHasPrintedType } from '../src/games/rpgCards.js';
import { pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgResonanceEnJeu, rpgBonusResonance } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
function partie() { const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 }); for (const c of ['joueur','sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); return d; }
function poser(d,c,id) { d[c].main.push(id); const r=rpgJouerCreature(d,c,id); assert.ok(r.ok,r.raison); return r.entite; }
test('tous les Vampires jouables possèdent la pastille Embuscade', () => {
  const vampires = RPG_DUEL_CARDS.filter(c => ['creature','hero'].includes(c.kind) && cardHasPrintedType(c,'vampire'));
  assert.ok(vampires.length >= 14);
  for (const c of vampires) { assert.equal(c.reactionTourAdverse, true, c.id); assert.ok(pastillesPourCarte(c).some(p => p.label === 'Embuscade'), c.id); assert.match(c.text, /Embuscade/, c.id); }
});
test('Sentinelle, Danseuse et Archonte sont jouables en PvP pendant le tour adverse', () => {
  for (const id of ['sentinelle-des-sables','danseuse-des-ombres-de-dune','archonte-du-sablier-noir']) {
    const d=partie(); d.pvp=true; d.mulliganFait={joueur:true,sorcier:true}; d.tour='sorcier'; d.phase='principale'; d.joueur.main.push(id);
    const r=rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:id,cibleDifferee:true});
    assert.ok(r.ok, `${id}: ${r.raison}`); assert.ok(d.joueur.creatures.some(x=>x.carteId===id));
    assert.ok(!d.arriveeEnAttente, 'aucune cible d’attaque disponible');
  }
});
test('Résonance Djinn : +2/+0 aux autres Djinns des deux camps, sans soins ni bonus aux autres types', () => {
  const d=partie(); const allie=poser(d,'joueur','djinn-de-foudre'); const ennemi=poser(d,'sorcier','djinn-des-braises-voilees'); const chien=poser(d,'joueur','chien-du-guet');
  const ifrit=poser(d,'joueur','ifrit-al-ahmar');
  assert.deepEqual([ifrit.atk,ifrit.def,ifrit.pv], [3,7,7]);
  assert.deepEqual([allie.atk,allie.def,allie.pv,ennemi.atk,ennemi.def,chien.atk], [4,1,1,4,1,2]);
  assert.equal(rpgResonanceEnJeu(d,'djinn'),2); assert.equal(rpgResonanceEnJeu(d,'djinn','def'),0);
  assert.equal(rpgBonusResonance(d,cardById('djinn-de-foudre'),'def'),0);
  assert.ok(pastillesPourCarte(cardById('ifrit-al-ahmar')).some(p=>p.label==='Résonance djinn'));
  assert.match(effetsDetailles(cardById('ifrit-al-ahmar')).pastilles.find(p=>p.cle==='resonance').description, /\+2\/\+0/);
  rpgBlesserCreature(d,'joueur',ifrit.id,99); assert.deepEqual([allie.atk,allie.def,ennemi.atk,ennemi.def], [2,1,2,1]);
});
test('deux Ifrits se renforcent mutuellement mais pas eux-mêmes', () => {
  const d=partie(); const premier=poser(d,'joueur','ifrit-al-ahmar'); const second=poser(d,'sorcier','ifrit-al-ahmar');
  assert.deepEqual([premier.atk,premier.def,second.atk,second.def],[5,7,5,7]);
  rpgBlesserCreature(d,'sorcier',second.id,99); assert.deepEqual([premier.atk,premier.def],[3,7]);
});
test('la résonance ne soigne pas et le Bouclier adverse bloque cette capacité', () => {
  const d=partie(); const allie=poser(d,'joueur','djinn-de-la-flamme-mourante');
  rpgBlesserCreature(d,'joueur',allie.id,1);
  const ennemi=poser(d,'sorcier','djinn-de-la-flamme-mourante'); ennemi.bouclier=1;
  const ifrit=poser(d,'joueur','ifrit-al-ahmar');
  assert.deepEqual([allie.atk,allie.pv,allie.pvMax], [4,1,2]);
  assert.deepEqual([ennemi.atk,ennemi.pv,ennemi.bouclier], [2,2,0]);
  rpgBlesserCreature(d,'joueur',ifrit.id,99);
  assert.deepEqual([allie.atk,allie.pv,allie.pvMax], [2,1,2]);
});

test('Ghul des cendres est un Djinn et bénéficie de la Résonance sans perdre son effet de destruction', () => {
  const carte = cardById('ghul-des-cendres');
  assert.ok(cardHasPrintedType(carte, 'djinn'));
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity], [1, 1, 1, 'commune']);
  assert.deepEqual(carte.destruction, { type: 'degats', amount: 1, cible: 'creature' });
  const d = partie();
  const ghul = poser(d, 'joueur', 'ghul-des-cendres');
  const ifrit = poser(d, 'joueur', 'ifrit-al-ahmar');
  assert.deepEqual([ghul.atk, ghul.def], [3, 1]);
  rpgBlesserCreature(d, 'joueur', ifrit.id, 99);
  assert.deepEqual([ghul.atk, ghul.def], [1, 1]);
});
