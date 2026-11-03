import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgResoudreDestructionCiblee, rpgFinDeTour, rpgLancerMagie, rpgSortACibleValide } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';
function partie() { const d = rpgNouveauDuel({joueurDeck: [], sorcierDeck: []}); for (const c of ['joueur','sorcier']) d[c].mana = { sable: 30, eau: 30, braise: 30, neige: 30, tenebres: 30 }; return d; }
function pose(d,c,id) { d[c].main.push(id); let r=rpgJouerCreature(d,c,id); assert.equal(r.ok,true,JSON.stringify(r)); return r.entite; }
test('la Guetteuse protège un allié, qui revient en jeu à la fin du tour', () => {
 const d=partie(), a=pose(d,'joueur','chien-du-guet'), g=pose(d,'joueur','guetteuse-des-marees');
 rpgBlesserCreature(d,'joueur',g.id,9,'braise',null,'magie');
 assert.equal(d.destructionsEnAttente[0].carteId,g.carteId);
 assert.equal(rpgResoudreDestructionCiblee(d,'joueur',a.id).ok,true);
 assert.equal(d.joueur.creatures.some(e=>e.id===a.id),false); assert.ok(d.joueur.exil.includes(a.carteId));
 rpgFinDeTour(d); assert.equal(d.joueur.exil.includes(a.carteId),false);
 assert.equal(d.joueur.creatures.filter(e=>e.carteId===a.carteId).length,1); assert.notEqual(d.joueur.creatures[0].id,a.id);
});
test('sans allié, la Guetteuse ne bloque pas la partie',()=>{const d=partie(); const g=pose(d,'joueur','guetteuse-des-marees'); rpgBlesserCreature(d,'joueur',g.id,9,'braise',null,'magie'); assert.ok(!d.destructionsEnAttente?.length);});
test('Mémoire équipe une arme choisie du cimetière sans payer son coût',()=>{
 const d=partie(), a=pose(d,'joueur','chien-du-guet'); const id='memoire-de-l-armurerie';
 d.joueur.cimetiere.push('sabre-maudit'); d.joueur.main.push(id); const avant=a.atk;
 assert.equal(rpgSortACibleValide(d,'joueur',cardById(id)),true);
 assert.equal(rpgLancerMagie(d,'joueur',id,a.id,'sabre-maudit').ok,true);
 assert.ok(a.armes.includes('sabre-maudit')); assert.equal(a.atk,avant+2); assert.ok(!d.joueur.cimetiere.includes('sabre-maudit')); assert.ok(d.joueur.cimetiere.includes(id));
});
test('Mémoire refuse une arme absente sans payer ni consommer le sort',()=>{
 const d=partie(), a=pose(d,'joueur','chien-du-guet'); const id='memoire-de-l-armurerie'; d.joueur.main.push(id); const mana=JSON.stringify(d.joueur.mana);
 assert.equal(rpgLancerMagie(d,'joueur',id,a.id,'sabre-maudit').ok,false); assert.ok(d.joueur.main.includes(id)); assert.equal(JSON.stringify(d.joueur.mana),mana);
});
test('Mémoire équipe aussi une arme classique et remplace l’équipement précédent',()=>{
 const d=partie(), a=pose(d,'joueur','chien-du-guet'); const id='memoire-de-l-armurerie';
 d.joueur.cimetiere.push('takouba-de-tin-hinan'); d.joueur.main.push(id);
 const r=rpgLancerMagie(d,'joueur',id,a.id,'takouba-de-tin-hinan'); assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(a.arme.carteId,'takouba-de-tin-hinan'); assert.ok(!d.joueur.cimetiere.includes('takouba-de-tin-hinan'));
});
test('en PvP la Guetteuse du second joueur attend son choix',()=>{
 const d=partie(); d.pvp=true; const a=pose(d,'sorcier','chien-du-guet'), g=pose(d,'sorcier','guetteuse-des-marees');
 rpgBlesserCreature(d,'sorcier',g.id,9,'braise',null,'magie');
 assert.equal(d.destructionsEnAttente[0].cote,'sorcier');
 assert.equal(rpgResoudreDestructionCiblee(d,'sorcier',a.id).ok,true); assert.equal(d.sorcier.creatures.length,0);
 rpgFinDeTour(d); assert.equal(d.sorcier.creatures[0].carteId,'chien-du-guet');
});
