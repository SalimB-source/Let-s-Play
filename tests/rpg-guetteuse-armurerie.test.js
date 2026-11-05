import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgResoudreArriveeCiblee, rpgFinDeTour, rpgLancerMagie, rpgSortACibleValide } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';
function partie() { const d = rpgNouveauDuel({joueurDeck: [], sorcierDeck: []}); for (const c of ['joueur','sorcier']) d[c].mana = { sable: 30, eau: 30, braise: 30, neige: 30, tenebres: 30 }; return d; }
function pose(d,c,id) { d[c].main.push(id); let r=rpgJouerCreature(d,c,id); assert.equal(r.ok,true,JSON.stringify(r)); return r.entite; }
test('la Guetteuse exile un autre allié à son arrivée, puis il revient en fin de tour', () => {
 const d = partie(), a = pose(d, 'joueur', 'chien-du-guet');
 const fiche = cardById('guetteuse-des-marees');
 assert.equal(fiche.destruction, undefined);
 assert.deepEqual(fiche.arrivee, { type: 'exil-temporaire', cible: 'creature-amie', choisirCible: true });
 d.joueur.main.push(fiche.id);
 assert.equal(rpgJouerCreature(d, 'joueur', fiche.id).raison, 'cible');
 const g = rpgJouerCreature(d, 'joueur', fiche.id, null, { cibleDifferee: true });
 assert.ok(g.ok && g.arriveeEnAttente);
 assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', g.entite.id).ok, false, 'elle ne s’exile pas elle-même');
 assert.ok(rpgResoudreArriveeCiblee(d, 'joueur', a.id).ok);
 assert.equal(d.joueur.creatures.some((e) => e.id === a.id), false);
 assert.ok(d.joueur.exil.includes(a.carteId));
 rpgBlesserCreature(d, 'joueur', g.entite.id, 9, 'braise', null, 'magie');
 assert.ok(!d.destructionsEnAttente?.length, 'sa destruction ne déclenche plus la capacité');
 rpgFinDeTour(d);
 assert.equal(d.joueur.exil.includes(a.carteId), false);
 assert.equal(d.joueur.creatures.filter((e) => e.carteId === a.carteId).length, 1);
 assert.notEqual(d.joueur.creatures[0].id, a.id);
});
test('sans autre allié, la Guetteuse arrive sans attente et ne s’exile pas', () => {
 const d = partie(), g = pose(d, 'joueur', 'guetteuse-des-marees');
 assert.ok(d.joueur.creatures.includes(g)); assert.ok(!d.arriveeEnAttente);
 rpgBlesserCreature(d, 'joueur', g.id, 9, 'braise', null, 'magie');
 assert.ok(!d.destructionsEnAttente?.length);
});
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
test('en PvP la Guetteuse du second joueur choisit sa cible à son arrivée', () => {
 const d = partie(); d.pvp = true;
 const a = pose(d, 'sorcier', 'chien-du-guet');
 d.sorcier.main.push('guetteuse-des-marees');
 const g = rpgJouerCreature(d, 'sorcier', 'guetteuse-des-marees', null, { cibleDifferee: true });
 assert.ok(g.ok && g.arriveeEnAttente);
 assert.equal(d.arriveeEnAttente.cote, 'sorcier');
 assert.ok(rpgResoudreArriveeCiblee(d, 'sorcier', a.id).ok);
 assert.equal(d.sorcier.creatures.length, 1);
 rpgFinDeTour(d);
 assert.ok(d.sorcier.creatures.some((e) => e.carteId === 'chien-du-guet'));
});

test('PvP : l’arrivée de la Guetteuse se résout en deux intentions, sans déclencheur de mort', async () => {
 const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
 const d = partie(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
 const allie = pose(d, 'joueur', 'chien-du-guet');
 const ennemi = pose(d, 'sorcier', 'chien-du-guet');
 d.joueur.main.push('guetteuse-des-marees');
 const res = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'guetteuse-des-marees', cibleDifferee: true });
 assert.ok(res.ok && d.arriveeEnAttente);
 assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: ennemi.id }).ok, false);
 assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: allie.id }).ok);
 assert.ok(d.joueur.exil.includes('chien-du-guet'));
 assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'fin-de-tour' }).ok);
 assert.ok(d.joueur.creatures.some((entite) => entite.carteId === 'chien-du-guet'));
});

test('l’IA privilégie une alliée blessée pour l’exil temporaire de la Guetteuse', async () => {
 const { choisirCarteIA, choisirCibleAutoIA } = await import('../src/games/rpgAI.js');
 const { cardById } = await import('../src/games/rpgCards.js');
 const d = partie();
 d.tour = 'sorcier';
 const sain = pose(d, 'sorcier', 'chien-du-guet');
 const blesse = pose(d, 'sorcier', 'chien-du-guet');
 blesse.pv -= 1;
 d.sorcier.main.push('guetteuse-des-marees');
 const id = choisirCibleAutoIA(d, 'sorcier', cardById('guetteuse-des-marees'));
 assert.equal(id, blesse.id); assert.notEqual(id, sain.id);
 const coup = choisirCarteIA(d, 'sorcier', { profil: { niveau: 'recit', style: 'equilibre', profondeur: 0, tauxErreur: 0 } });
 assert.equal(coup?.carteId, 'guetteuse-des-marees'); assert.equal(coup?.cibleId, blesse.id);
});
