import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaLancerMagie,rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

for (const card of ['eclipse-silencieuse','veilleuse-de-la-lune-givree','sentinelle-des-sables','traqueur-des-nuits-sans-lune']) test(`Réanimation de ${card} : l’arrivée ne vise jamais la voie voisine`, () => {
  const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
  assert.ok(rpgMulligan(d,'joueur',[]).ok && rpgMulligan(d,'sorcier',[]).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main=['gardienne-des-portes-de-sable']; d.joueur.mana.sable=20;
  const enemy=rpgMobaJouerCreature(d,'joueur','gardienne-des-portes-de-sable','left',0).entite; assert.ok(enemy);
  rpgFinDeTour(d); if (d.sorcier.manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(d,'sorcier',d.sorcier.couleurs[0]).ok);
  d.sorcier.cimetiere=[card]; d.sorcier.main=['reanimation']; d.sorcier.mana.sable=20;
  const before={atk:enemy.atk,pv:enemy.pv,gel:enemy.gelToursRestants};
  const result=rpgMobaLancerMagie(d,'sorcier','reanimation',null,'right',null,{emplacementReanimation:0});
  assert.ok(result.ok,JSON.stringify(result)); assert.ok(d.sorcier.creatures.some(e=>e.carteId===card));
  assert.deepEqual({atk:enemy.atk,pv:enemy.pv,gel:enemy.gelToursRestants},before);
  assert.ok(d.joueur.creatures.includes(enemy)); assert.ok(rpgMobaPlacementCoherent(d));
});

for (const card of ['eclipse-silencieuse','veilleuse-de-la-lune-givree','sentinelle-des-sables','traqueur-des-nuits-sans-lune']) test(`Réanimation de ${card} : cible de la même voie ou aucune attaque déclarée`, () => {
  const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
  assert.ok(rpgMulligan(d,'joueur',[]).ok && rpgMulligan(d,'sorcier',[]).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main=['gardienne-des-portes-de-sable'];d.joueur.mana.sable=20;
  const enemy=rpgMobaJouerCreature(d,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.ok(enemy);
  rpgFinDeTour(d);if (d.sorcier.manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(d,'sorcier',d.sorcier.couleurs[0]).ok);
  d.sorcier.cimetiere=[card];d.sorcier.main=['reanimation'];d.sorcier.mana.sable=20;
  assert.ok(rpgMobaLancerMagie(d,'sorcier','reanimation',null,'left',null,{emplacementReanimation:0}).ok);
  if(card==='eclipse-silencieuse') assert.equal(enemy.atk,0);
  if(card==='veilleuse-de-la-lune-givree') assert.ok(enemy.gelToursRestants>0);
  if(card==='sentinelle-des-sables') {assert.ok(d.joueur.creatures.includes(enemy));assert.equal(enemy.pv,enemy.pvMax);}
  if(card==='traqueur-des-nuits-sans-lune') assert.ok(!d.joueur.creatures.includes(enemy));
  assert.ok(rpgMobaPlacementCoherent(d));
});
