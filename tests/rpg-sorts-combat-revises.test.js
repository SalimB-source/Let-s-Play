import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgFinDeTour, rpgJouerCreature, rpgLancerMagie, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function partie(moba) {
  const d=(moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({joueurDeck:Array(30).fill('chien-du-guet'),sorcierDeck:Array(30).fill('chien-du-guet'),modeMana:'essai',pvp:true,rng:()=>.5});
  d.mulliganFait={joueur:true,sorcier:true};d.manaEssaiDemarre=true;
  for(const s of ['joueur','sorcier']) { d[s].main=[];d[s].manaChoixEnAttente=null; }
  return d;
}
function poser(d, side, id, voie='left', slot=0) {
  d.tour=side; d[side].main=[id];d[side].invocationNormaleJouee=false; if(d.moba) d.moba.creaturesJouees[side]=false;
  const r=d.moba ? rpgMobaJouerCreature(d,side,id,voie,slot) : rpgJouerCreature(d,side,id);
  assert.ok(r.ok,JSON.stringify(r));r.entite.ready=true;r.entite.malInvocation=false;return r.entite;
}

test('les cartes ne mentionnent plus de blocage forcé et gardent leurs identités', () => {
  const appat=cardById('appat-de-la-meute'), embuscade=cardById('embuscade');
  assert.equal(appat.instant,true);assert.equal(appat.effet.type,'debuff');assert.equal(appat.effet.atk,-2);
  assert.equal(embuscade.effet.blocageForce,undefined);assert.equal(embuscade.effet.minimum,1);
  assert.doesNotMatch(appat.text,/bloqu/i); assert.doesNotMatch(embuscade.text,/bloqu/i);
});

for(const moba of [false,true]) for(const lanceur of ['joueur','sorcier']) {
  const mode=moba?'MOBA':'Duel'; const adverse=lanceur==='joueur'?'sorcier':'joueur';
  test(`${mode} ${lanceur} : Appât affaiblit une seule cible et expire en fin de tour`,()=>{
    const d=partie(moba);const cible=poser(d,adverse,'chien-du-guet');const autre=poser(d,adverse,'viking-des-neiges','right',0);
    d.tour=lanceur;d[lanceur].main=['appat-de-la-meute'];const atk=cible.atk;
    const r=moba?rpgMobaLancerMagie(d,lanceur,'appat-de-la-meute',cible.id):rpgLancerMagie(d,lanceur,'appat-de-la-meute',cible.id);
    assert.ok(r.ok,JSON.stringify(r));assert.equal(cible.atk,Math.max(0,atk-2));assert.equal(autre.atk,cardById(autre.carteId).atk);assert.ok(!cible.blocageForce);
    rpgFinDeTour(d);assert.equal(cible.atk,atk);if(moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${mode} ${lanceur} : Embuscade affaiblit sans tuer et ne force aucun blocage`,()=>{
    const d=partie(moba);const cible=poser(d,adverse,'chien-du-guet');const allie=poser(d,lanceur,'viking-des-neiges');
    d.tour=lanceur;d[lanceur].main=['embuscade'];const initial={atk:cible.atk,pv:cible.pv,allie:allie.atk};
    const r=moba?rpgMobaLancerMagie(d,lanceur,'embuscade',null,'left'):rpgLancerMagie(d,lanceur,'embuscade');
    assert.ok(r.ok,JSON.stringify(r));assert.equal(cible.atk,Math.max(1,initial.atk-2));assert.equal(cible.pv,Math.max(1,initial.pv-2));
    assert.equal(allie.atk,initial.allie);assert.ok(!cible.blocageForce);
    rpgFinDeTour(d);assert.equal(cible.atk,initial.atk);assert.equal(cible.pv,initial.pv);if(moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}

test('PvP : Appât peut répondre à une attaque et réduit les dégâts annoncés',()=>{
  const d=partie(false), a=poser(d,'joueur','chien-du-guet');d.tour='joueur';d.sorcier.main=['appat-de-la-meute'];
  assert.ok(rpgPvpAppliquer(d,'joueur',{type:'attaquer',declarer:true,attaquants:[a.id]}).ok);
  const pv=d.sorcier.pv; assert.ok(rpgPvpAppliquer(d,'sorcier',{type:'jouer-carte',carteId:'appat-de-la-meute',cibleId:a.id}).ok);
  assert.equal(a.atk,0);assert.ok(rpgPvpAppliquer(d,'sorcier',{type:'bloquer',blocages:{}}).ok);assert.equal(d.sorcier.pv,pv);
});

test('MOBA : Appât est contrable et son effet ne se résout pas si contrecarré',()=>{
  const d=partie(true), cible=poser(d,'sorcier','chien-du-guet');d.tour='joueur';d.joueur.main=['appat-de-la-meute'];d.sorcier.main=['contresort-des-abimes'];
  const avant=cible.atk;assert.ok(rpgMobaLancerMagie(d,'joueur','appat-de-la-meute',cible.id,null,null,{ouvrirReponse:true}).sortEnAttente);
  assert.ok(rpgMobaLancerMagie(d,'sorcier','contresort-des-abimes').ok);assert.equal(cible.atk,avant);
});

test('MOBA : Embuscade ne touche que la voie choisie et une parade bloque son malus',()=>{
  const d=partie(true), gauche=poser(d,'sorcier','chien-du-guet','left',0), expose=poser(d,'sorcier','viking-des-neiges','left',1), droite=poser(d,'sorcier','viking-des-neiges','right',0);
  const initial=[gauche.atk,gauche.pv,expose.atk,expose.pv,droite.atk,droite.pv];gauche.bouclier=1;
  d.tour='joueur';d.joueur.main=['embuscade'];
  assert.ok(rpgMobaLancerMagie(d,'joueur','embuscade',null,'left',null,{ouvrirReponse:true}).sortEnAttente);
  assert.ok(rpgMobaPasserSort(d,'sorcier').ok);
  assert.equal(gauche.bouclier,0);assert.deepEqual([gauche.atk,gauche.pv],initial.slice(0,2));
  assert.deepEqual([expose.atk,expose.pv], [Math.max(1,initial[2]-2),Math.max(1,initial[3]-2)]);
  assert.deepEqual([droite.atk,droite.pv],initial.slice(4));
});

test('MOBA : Appât en réponse est proposé et peut réduire l’attaque annoncée',async()=>{
  const {rpgMobaDeclarerAttaqueIndividuelle,rpgMobaResoudreAttaqueIndividuelle}=await import('../src/games/rpgMobaLocal.js');
  const {rpgMobaPeutRepondreAttaque}=await import('../src/games/rpgMobaReponseAttaque.js');
  const d=partie(true), a=poser(d,'joueur','chien-du-guet');d.tour='joueur';d.sorcier.main=['appat-de-la-meute'];
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d,'joueur',a.id,null,'left').ok);
  assert.equal(rpgMobaPeutRepondreAttaque(d,'sorcier'),true);
  assert.ok(rpgMobaLancerMagie(d,'sorcier','appat-de-la-meute',a.id).ok);assert.equal(a.atk,0);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d,'joueur').ok);
});

test('les IA classiques et MOBA peuvent évaluer les sorts révisés sans modifier la partie', async () => {
  const { choisirCarteIA } = await import('../src/games/rpgAI.js');
  const { rpgMobaChoisirMagieIA } = await import('../src/games/rpgMobaAI.js');
  for (const moba of [false, true]) for (const spell of ['appat-de-la-meute', 'embuscade']) {
    const d = partie(moba);
    const cible = poser(d, 'joueur', 'viking-des-neiges', 'left');
    if (spell === 'embuscade') poser(d, 'joueur', 'viking-des-neiges', 'left', 1);
    d.tour = 'sorcier'; d.sorcier.main = [spell];
    const avant = JSON.stringify(d);
    const choix = moba ? rpgMobaChoisirMagieIA(d, 'sorcier') : choisirCarteIA(d, 'sorcier', { rng: () => .5 });
    assert.equal(JSON.stringify(d), avant, `${spell} : la simulation ne modifie pas la partie`);
    assert.ok(choix, `${spell} : une menace suffisante rend le sort utile`);
    {
      assert.equal(moba ? choix.id : choix.carteId, spell);
      if (spell === 'appat-de-la-meute') assert.equal(moba ? choix.cible : choix.cibleId, cible.id);
      if (moba && spell === 'embuscade') assert.equal(choix.lane, 'left');
    }
  }
});
