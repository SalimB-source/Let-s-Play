import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, duelCardById, cardHasPrintedType } from '../src/games/rpgCards.js';
import { pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgConditionEmbuscadeRemplie, rpgResoudreEffetCreatureEnAttente, rpgSorcierResoudreAnnonce, rpgResonanceEnJeu, rpgBonusResonance } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';
function partie() { const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 }); for (const c of ['joueur','sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); return d; }
function poser(d,c,id) { d[c].main.push(id); const r=rpgJouerCreature(d,c,id); assert.ok(r.ok,r.raison); return r.entite; }
test('tous les Vampires jouables possèdent la pastille Embuscade', () => {
  const vampires = RPG_DUEL_CARDS.filter(c => ['creature','hero'].includes(c.kind) && cardHasPrintedType(c,'vampire'));
  assert.ok(vampires.length >= 14);
  for (const c of vampires) { assert.equal(c.reactionTourAdverse, true, c.id); assert.ok(pastillesPourCarte(c).some(p => p.label === 'Embuscade'), c.id); assert.match(c.text, /Embuscade/, c.id); }
});
test('Sentinelle, Danseuse et Archonte respectent leurs conditions en PvP', () => {
  for (const id of ['sentinelle-des-sables', 'danseuse-des-ombres-de-dune', 'archonte-du-sablier-noir']) {
    const d=partie(); d.pvp=true; d.mulliganFait={joueur:true,sorcier:true}; d.tour='sorcier'; d.phase='principale'; d.joueur.main.push(id);
    assert.equal(rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:id,cibleDifferee:true}).ok, false, `${id} : sans condition`);
    if (id === 'danseuse-des-ombres-de-dune') d.joueur.pv = 20;
    else {
      d.sorcier.main.push('chien-du-guet');
      const ennemi = rpgJouerCreature(d, 'sorcier', 'chien-du-guet').entite;
      ennemi.ready = true;
      if (id === 'archonte-du-sablier-noir') {
        d.tour = 'joueur'; d.joueur.main.push('danseuse-des-ombres-de-dune');
        const vampire = rpgJouerCreature(d, 'joueur', 'danseuse-des-ombres-de-dune').entite;
        d.tour = 'sorcier';
        assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [ennemi.id] }).ok);
        assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'preparer-blocage', blocages: { [ennemi.id]: [vampire.id] } }).ok);
      } else assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [ennemi.id] }).ok);
    }
    const r=rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:id,cibleDifferee:true});
    assert.ok(r.ok, `${id}: ${r.raison}`); assert.ok(d.joueur.creatures.some(x=>x.carteId===id));
    if (id === 'sentinelle-des-sables') assert.ok(d.arriveeEnAttente);
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

const conditions = [
  ['vampire-des-braises', 'adversaire-blesse'],
  ['sentinelle-des-sables', 'attaquant'],
  ['garde-du-trone-givre', 'attaquant'],
  ['general-du-croissant-noir', 'autre-vampire'],
  ['fleau-de-la-lune-noire', 'trois-adversaires'],
  ['eclipse-silencieuse', 'attaquant-force-2'],
  ['gardienne-du-croissant', 'allie-cible'],
  ['traqueur-des-nuits-sans-lune', 'deux-attaquants'],
  ['sanguinaire-des-dunes', 'adversaire-blesse'],
  ['porte-etendard-de-leclipse', 'vampire-attaque'],
  ['veilleuse-de-la-lune-givree', 'attaquant-force-3'],
  ['archonte-du-sablier-noir', 'vampire-bloqueur'],
  ['danseuse-des-ombres-de-dune', 'vie-inferieure'],
  ['veilleur-du-dernier-crepuscule', 'attaque-ciblee'],
  ['souverain-de-la-lune-noire', 'adversaire-force-4'],
];

function remplirCondition(d, condition) {
  const ajouter = (cote, carteId) => {
    d[cote].main.push(carteId);
    const res = rpgJouerCreature(d, cote, carteId);
    assert.ok(res.ok, res.raison);
    return res.entite;
  };
  const combat = (n = 1, force = 2) => {
    const attaquants = Array.from({ length: n }, () => ajouter('sorcier', 'dune-marchante'));
    attaquants.forEach((attaquant) => { attaquant.atk = force; attaquant.ready = true; });
    d.combatDeclare = { cote: 'sorcier', attaquants: attaquants.map((e) => e.id), ciblesAttaque: {} };
    return attaquants;
  };
  const vampire = () => { d.tour = 'joueur'; const allie = ajouter('joueur', 'vampire-des-braises'); d.tour = 'sorcier'; return allie; };
  switch (condition) {
    case 'adversaire-blesse': {
      const cible = ajouter('sorcier', 'dune-marchante');
      rpgBlesserCreature(d, 'sorcier', cible.id, 1, 'eau', null, 'attaque');
      break;
    }
    case 'attaquant': combat(); break;
    case 'attaquant-force-2': combat(1, 2); break;
    case 'attaquant-force-3': combat(1, 3); break;
    case 'autre-vampire': vampire(); break;
    case 'trois-adversaires': for (let i = 0; i < 3; i++) ajouter('sorcier', 'chien-du-guet'); break;
    case 'allie-cible': {
      d.tour = 'joueur'; const allie = ajouter('joueur', 'chien-du-guet'); d.tour = 'sorcier';
      d.annonce = { cote: 'sorcier', carteId: 'trait-de-braise', cibleId: allie.id };
      break;
    }
    case 'deux-attaquants': combat(2); break;
    case 'vampire-attaque': {
      const allie = vampire(); const [attaquant] = combat();
      d.combatDeclare.ciblesAttaque[attaquant.id] = allie.id;
      break;
    }
    case 'vampire-bloqueur': {
      const allie = vampire(); const [attaquant] = combat();
      d.combatDeclare.blocages = { [attaquant.id]: [allie.id] };
      break;
    }
    case 'vie-inferieure': d.joueur.pv = 20; break;
    case 'attaque-ciblee': {
      d.tour = 'joueur'; const allie = ajouter('joueur', 'chien-du-guet'); d.tour = 'sorcier';
      const [attaquant] = combat(); attaquant.coupRapide = true;
      d.combatDeclare.ciblesAttaque[attaquant.id] = allie.id;
      break;
    }
    case 'adversaire-force-4': { const ennemi = ajouter('sorcier', 'dune-marchante'); ennemi.atk = 4; break; }
    default: assert.fail(condition);
  }
}

test('les quinze Vampires refusent une Embuscade hors condition sans dépenser de mana, puis la jouent si elle est remplie', () => {
  assert.equal(conditions.length, RPG_DUEL_CARDS.filter((c) => c.reactionTourAdverse && cardHasPrintedType(c, 'Vampire')).length);
  for (const [id, condition] of conditions) {
    const d = partie(); d.tour = 'sorcier'; d.fenetreReponse = true; d.pvp = true;
    d.joueur.main.push(id);
    const carte = cardById(id);
    assert.equal(carte.conditionEmbuscade, condition, id);
    const mana = JSON.stringify(d.joueur.mana);
    assert.equal(rpgJouerCreature(d, 'joueur', id, null, { cibleDifferee: true }).raison, 'condition-embuscade', id);
    assert.equal(JSON.stringify(d.joueur.mana), mana, id);
    assert.ok(d.joueur.main.includes(id), id);
    remplirCondition(d, condition);
    assert.ok(rpgConditionEmbuscadeRemplie(d, 'joueur', carte), id);
    const res = rpgJouerCreature(d, 'joueur', id, null, { cibleDifferee: true });
    assert.ok(res.ok, `${id}: ${res.raison}`);
  }
});

test('en PvP les blocages préparés sont validés avant de rendre l’Archonte jouable', () => {
  const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const vampire = poser(d, 'joueur', 'vampire-des-braises');
  const chien = poser(d, 'joueur', 'chien-du-guet');
  const attaquant = poser(d, 'sorcier', 'dune-marchante'); attaquant.ready = true;
  d.tour = 'sorcier'; d.joueur.main.push('archonte-du-sablier-noir');
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [attaquant.id] }).ok);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'preparer-blocage', blocages: { [attaquant.id]: ['inconnu'] } }).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'preparer-blocage', blocages: { [attaquant.id]: [vampire.id, vampire.id] } }).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'preparer-blocage', blocages: { [attaquant.id]: [chien.id] } }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'archonte-du-sablier-noir' }).ok, false);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'preparer-blocage', blocages: { [attaquant.id]: [vampire.id] } }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'archonte-du-sablier-noir' }).ok);
});

test('le Gardien peut répondre à une Attaque ciblée en PvP et à une magie annoncée en solo', () => {
  for (const pvp of [true, false]) {
    const d = partie(); d.pvp = pvp; d.tour = 'joueur';
    const allie = poser(d, 'joueur', 'chien-du-guet');
    const ennemi = poser(d, 'sorcier', 'chien-du-guet'); ennemi.ready = true;
    d.tour = 'sorcier'; d.joueur.main.push('gardienne-du-croissant');
    if (pvp) {
      d.mulliganFait = { joueur: true, sorcier: true }; ennemi.coupRapide = true;
      assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true,
        attaquants: [ennemi.id], ciblesAttaque: { [ennemi.id]: allie.id } }).ok);
      assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'gardienne-du-croissant', cibleDifferee: true }).ok);
      assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: allie.id }).ok);
    } else {
      d.fenetreReponse = true;
      d.annonce = { cote: 'sorcier', carteId: 'trait-de-braise', cibleId: allie.id };
      assert.ok(rpgJouerCreature(d, 'joueur', 'gardienne-du-croissant', allie.id).ok);
    }
    assert.equal(allie.bouclier, 1);
  }
});

test('les conditions d’Embuscade ne restreignent jamais la pose pendant son propre tour', () => {
  for (const [id] of conditions) {
    const d = partie(); d.joueur.main.push(id);
    const res = rpgJouerCreature(d, 'joueur', id, null, { cibleDifferee: true });
    assert.ok(res.ok, `${id}: ${res.raison}`);
  }
});

test('un attaquant retiré du plateau ne satisfait plus les conditions de combat', () => {
  const d = partie(); d.tour = 'sorcier'; d.pvp = true;
  remplirCondition(d, 'vampire-attaque');
  const [attaquantId] = d.combatDeclare.attaquants;
  assert.ok(rpgConditionEmbuscadeRemplie(d, 'joueur', cardById('porte-etendard-de-leclipse')));
  d.sorcier.creatures = d.sorcier.creatures.filter((entite) => entite.id !== attaquantId);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'joueur', cardById('porte-etendard-de-leclipse')), false);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'joueur', cardById('gardienne-du-croissant')), false);
});

test('PvP : les deux sièges attendent une réponse d’Embuscade en fin de tour, puis le passe clôt le tour', () => {
  for (const [attaquant, defenseur] of [['sorcier', 'joueur'], ['joueur', 'sorcier']]) {
    const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    d.tour = attaquant;
    d[defenseur].pv = 20;
    d[defenseur].main.push('danseuse-des-ombres-de-dune');
    const fin = rpgPvpAppliquer(d, attaquant, { type: 'fin-de-tour' });
    assert.ok(fin.ok, `${attaquant}: ${fin.raison}`);
    assert.equal(d.tour, attaquant, 'le tour attend la réponse');
    assert.equal(d.finDeTour?.cote, attaquant);
    assert.equal(rpgPvpAppliquer(d, attaquant, { type: 'passer-fin-de-tour' }).ok, false);
    assert.ok(rpgPvpAppliquer(d, defenseur, {
      type: 'jouer-carte', carteId: 'danseuse-des-ombres-de-dune', cibleDifferee: true,
    }).ok);
    assert.equal(d.tour, attaquant, 'la carte ne ferme pas la fenêtre');
    assert.ok(rpgPvpAppliquer(d, defenseur, { type: 'passer-fin-de-tour' }).ok);
    assert.equal(d.tour, defenseur);
    assert.equal(d.finDeTour, null);
    assert.equal(d.fenetreReponse, false);
  }
});

test('l’arrivée ciblée attend la réponse du défenseur en PvP ; son bouclier pare ensuite l’effet', () => {
  const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const allie = poser(d, 'joueur', 'chien-du-guet');
  d.tour = 'sorcier'; d.sorcier.main.push('maitre-du-marteau'); d.joueur.main.push('gardienne-du-croissant');
  const pose = rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'maitre-du-marteau', cibleId: allie.id });
  assert.ok(pose.ok, pose.raison);
  assert.equal(allie.pv, 2, 'la cible reste indemne jusqu’au passe');
  assert.equal(d.effetCreatureEnAttente?.cibleId, allie.id);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'fin-de-tour' }).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, false);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'gardienne-du-croissant', cibleDifferee: true }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: allie.id }).ok);
  assert.equal(allie.bouclier, 1);
  assert.equal(allie.pv, 4);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'passer-effet' }).ok);
  assert.equal(d.effetCreatureEnAttente, null);
  assert.equal(allie.pv, 4);
  assert.equal(allie.bouclier, 0, 'le bouclier bloque le marteau après la réponse');
});

test('une magie rapide peut répondre à l’arrivée ciblée, ou laisser sa cible disparaître', () => {
  const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const allie = poser(d, 'joueur', 'chien-du-guet');
  d.tour = 'sorcier'; d.sorcier.main.push('maitre-du-marteau'); d.joueur.main.push('parade-du-verre');
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'maitre-du-marteau', cibleId: allie.id }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'parade-du-verre', cibleId: allie.id }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'passer-effet' }).ok);
  assert.equal(allie.pv, 2);
  assert.equal(allie.bouclier, 0);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'passer-effet' }).ok, false);
});

test('l’annonce solo montre déjà la cible d’une créature et son arrivée attend une autre réponse', () => {
  const d = partie(); const allie = poser(d, 'joueur', 'chien-du-guet');
  d.tour = 'sorcier'; d.sorcier.main.push('maitre-du-marteau'); d.joueur.main.push('gardienne-du-croissant');
  d.annonce = { cote: 'sorcier', carteId: 'maitre-du-marteau', cibleId: allie.id };
  d.fenetreReponse = true;
  assert.ok(rpgSorcierResoudreAnnonce(d).ok);
  assert.equal(allie.pv, 2);
  assert.ok(d.effetCreatureEnAttente);
  assert.ok(rpgJouerCreature(d, 'joueur', 'gardienne-du-croissant', allie.id).ok);
  assert.ok(rpgResoudreEffetCreatureEnAttente(d, 'joueur').ok);
  assert.equal(allie.pv, 4);
  assert.equal(allie.bouclier, 0);
});

test('PvP : choisir la cible après la pose ouvre aussi une réponse avant l’effet', () => {
  const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const victime = poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.main.push('maitre-du-marteau'); d.sorcier.main.push('parade-du-verre');
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'maitre-du-marteau', cibleDifferee: true }).ok);
  assert.ok(d.arriveeEnAttente);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: victime.id }).ok);
  assert.equal(victime.pv, 2);
  assert.equal(rpgPvpVue(d, 'sorcier').effetCreatureEnAttente.cote, 'sorcier');
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'parade-du-verre', cibleId: victime.id }).ok);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok);
  assert.equal(victime.pv, 2);
});

test('une capacité de créature ciblée attend aussi ; si la cible disparaît, elle se dissipe sans rendre le mana', () => {
  const carte = duelCardById('chien-du-guet');
  const activation = carte.activation;
  carte.activation = { cout: 1, couleur: 'neige', effet: { type: 'degats', amount: 1, cible: 'creature' } };
  try {
    const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    const victime = poser(d, 'joueur', 'chien-du-guet');
    const source = poser(d, 'sorcier', 'chien-du-guet');
    d.tour = 'sorcier'; d.joueur.main.push('gardienne-du-croissant');
    const mana = d.sorcier.mana.neige;
    assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'activer', entiteId: source.id, cibleId: victime.id }).ok);
    assert.equal(d.sorcier.mana.neige, mana - 1);
    assert.equal(victime.pv, 2);
    assert.ok(d.effetCreatureEnAttente);
    d.joueur.creatures = d.joueur.creatures.filter((entite) => entite.id !== victime.id);
    const res = rpgResoudreEffetCreatureEnAttente(d, 'joueur');
    assert.ok(res.ok && res.dissipe);
    assert.equal(d.effetCreatureEnAttente, null);
    assert.equal(d.sorcier.mana.neige, mana - 1);
  } finally {
    carte.activation = activation;
  }
});

test('une capacité ciblée PvP laisse jouer une Embuscade protectrice avant de blesser', () => {
  const carte = duelCardById('chien-du-guet');
  const activation = carte.activation;
  carte.activation = { cout: 1, couleur: 'neige', effet: { type: 'degats', amount: 1, cible: 'creature' } };
  try {
    const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    const victime = poser(d, 'joueur', 'chien-du-guet');
    const source = poser(d, 'sorcier', 'chien-du-guet');
    d.tour = 'sorcier'; d.joueur.main.push('gardienne-du-croissant');
    assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'activer', entiteId: source.id, cibleId: victime.id }).ok);
    assert.equal(victime.pv, 2);
    assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'gardienne-du-croissant', cibleId: victime.id }).ok);
    assert.equal(victime.bouclier, 1);
    assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'passer-effet' }).ok);
    assert.equal(victime.pv, 4, 'le Gardien a aussi renforcé la créature protégée');
    assert.equal(victime.bouclier, 0, 'la capacité annoncée est absorbée par le bouclier');
    assert.equal(d.effetCreatureEnAttente, null);
  } finally {
    carte.activation = activation;
  }
});
