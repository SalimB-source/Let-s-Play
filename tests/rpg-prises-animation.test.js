import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgPrisesEnCale } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { instantanePrisesAnimation, prisesPourAnimation } from '../src/games/rpgPrisesAnimation.js';
import { instantaneSansSacrificesAnimes } from '../src/games/rpgSacrificeAnimation.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .9 });
  d.mulliganFait = { joueur: true, sorcier: true };
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].main = [];
    d[cote].mana = { braise: 30, eau: 30, sable: 30, neige: 30, tenebres: 30 };
  }
  return d;
}
function poser(d, cote, carte, cible = null) {
  d.tour = cote; d[cote].invocationNormaleJouee = false; d[cote].main.push(carte);
  const r = rpgJouerCreature(d, cote, carte, cible);
  assert.ok(r.ok, JSON.stringify(r));
  return r.entite;
}
const relever = d => instantanePrisesAnimation(d, rpgPrisesEnCale(d));
const prises = (d, avant) => prisesPourAnimation(d, avant, rpgPrisesEnCale(d));

test('une ancienne prise libérée ne transforme pas une mort en combat contre un navire en abordage', () => {
  for (const coteVictime of ['joueur', 'sorcier']) {
    const capteur = coteVictime === 'joueur' ? 'sorcier' : 'joueur';
    const d = partie();
    const victime = poser(d, coteVictime, 'mousse-des-galiotes');
    const avantPrise = relever(d);
    const rais = poser(d, capteur, 'rais-de-la-galiote', victime.id);
    assert.equal(prises(d, avantPrise).get(victime.id), rais.id, 'une vraie prise anime les chaînes');
    assert.ok(rpgBlesserCreature(d, capteur, rais.id, 99).ok);
    assert.ok(d[coteVictime].creatures.includes(victime), 'la victime revient avec le même identifiant');
    const navire = poser(d, capteur, 'le-brulot');
    navire.ready = true; navire.malInvocation = false; navire.atk = 4;
    d.tour = capteur;
    const avantCombat = relever(d);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, capteur, navire.id, victime.id).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, capteur).ok);
    assert.ok(!d[coteVictime].creatures.includes(victime), 'la créature est détruite');
    assert.equal(prises(d, avantCombat).has(victime.id), false, 'aucune ancienne chaîne à sa mort');
    assert.equal(rpgPrisesEnCale(d).length, 1, 'le correctif ne modifie pas l’historique de prise');
  }
});

test('une créature libérée puis recapturée reçoit de nouveau les chaînes', () => {
  const d = partie();
  const victime = poser(d, 'sorcier', 'mousse-des-galiotes');
  const rais = poser(d, 'joueur', 'rais-de-la-galiote', victime.id);
  assert.ok(rpgBlesserCreature(d, 'joueur', rais.id, 99).ok);
  const avant = relever(d);
  const autre = poser(d, 'joueur', 'rais-de-la-galiote', victime.id);
  assert.equal(prises(d, avant).get(victime.id), autre.id);
});

test('PvP : le flux sérialisé ne rejoue pas les anciennes prises même quand il est tronqué', () => {
  const capture = { id: 'capture-1', type: 'prise', victim: { id: 'victime' }, killers: [{ id: 'navire' }] };
  const ancien = { combatFeed: [capture, ...Array.from({ length: 11 }, (_, i) => ({ id: `autre-${i}`, type: 'hit' }))] };
  const avant = instantanePrisesAnimation(ancien);
  const mort = { id: 'mort-1', type: 'death', victim: { id: 'victime' } };
  const apres = JSON.parse(JSON.stringify({ combatFeed: [...ancien.combatFeed.slice(1), mort] }));
  assert.equal(prisesPourAnimation(apres, avant).has('victime'), false);
  const nouvelle = { id: 'capture-2', type: 'prise', victim: { id: 'victime' }, killers: [{ id: 'second-navire' }] };
  apres.combatFeed = [...ancien.combatFeed.slice(2), nouvelle];
  assert.equal(prisesPourAnimation(apres, avant).get('victime'), 'second-navire');
  apres.combatFeed.push(mort);
  assert.equal(prisesPourAnimation(apres, avant).has('victime'), false, 'une mort ultérieure prime sur une prise dans le même lot');
});

test('les métadonnées de prise survivent au filtrage des sacrifices animés', () => {
  const d = partie();
  const avant = [{ entityId: 'sacrifice' }, { entityId: 'victime' }];
  avant.prisesAnimation = relever(d);
  const apres = instantaneSansSacrificesAnimes(avant, ['sacrifice']);
  assert.equal(apres.prisesAnimation, avant.prisesAnimation);
  assert.deepEqual(apres.map(e => e.entityId), ['victime']);
});

test('le fantôme montre les chaînes seulement pour une prise fraîche', async () => {
  const { createServer } = await import('vite');
  const { default: React } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { FantomeCarteDetruite } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const d = partie();
    const victime = poser(d, 'sorcier', 'mousse-des-galiotes');
    const avant = relever(d);
    const rais = poser(d, 'joueur', 'rais-de-la-galiote', victime.id);
    const rendre = (capteurId) => renderToStaticMarkup(React.createElement(FantomeCarteDetruite, {
      effet: { entityId: victime.id, cardId: victime.carteId, name: victime.name, capteurId,
        left: 10, top: 10, width: 120, height: 150, abordage: capteurId ? { dx: 100, dy: 50 } : null },
    }));
    const captureHtml = rendre(prises(d, avant).get(victime.id));
    assert.match(captureHtml, /rpg-abordage-liens/);
    assert.match(captureHtml, /is-abordage/);
    assert.ok(rpgBlesserCreature(d, 'joueur', rais.id, 99).ok);
    const avantMort = relever(d);
    assert.ok(rpgBlesserCreature(d, 'sorcier', victime.id, 99).ok);
    const mortHtml = rendre(prises(d, avantMort).get(victime.id));
    assert.doesNotMatch(mortHtml, /rpg-abordage-liens|is-abordage/);
    assert.match(mortHtml, /rpg-carte-delitee/);
  } finally {
    await vite.close();
  }
});
