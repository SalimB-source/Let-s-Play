/** Qui couvre le sorcier dans un duel à deux lignes ?
 *
 *  - une **mêlée** ne frappe pas le sorcier tant qu'une créature **à distance**
 *    adverse est en jeu — même avec une volante devant, et même si l'attaquant
 *    vole ;
 *  - une créature **à distance** sans Attaque ciblée ne frappe pas le sorcier
 *    tant qu'une **mêlée** adverse fait écran ;
 *  - l'**Attaque ciblée** passe les lignes, mais ni une volante ni un
 *    Défenseur.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgAttaquerSorcier } from '../src/games/rpgDuel.js';
import {
  rpgCiblesIndividuellesClassique,
  rpgDeclarerAttaqueIndividuelleClassique,
} from '../src/games/rpgCombatIndividuelClassique.js';
import { attaqueDirecteSurLesLignes } from '../src/games/rpgLignes.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'chien-du-guet';
const TIREUR = 'ashigaru-des-braises';
const ARCHERE = 'archere-viking-du-givre'; // à distance, Attaque ciblée

function table(cote = 'joueur') {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = cote;
  const poser = (camp, id, patch = null) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    if (patch) Object.assign(resultat.entite, patch);
    return resultat.entite;
  };
  return { d, poser, adv: cote === 'joueur' ? 'sorcier' : 'joueur' };
}

/** La frappe directe proposée par le moteur, et son refus à la déclaration. */
function directe(d, cote, attaquant) {
  const choix = rpgCiblesIndividuellesClassique(d, cote, attaquant.id);
  const declaration = rpgDeclarerAttaqueIndividuelleClassique(d, cote, attaquant.id, null);
  assert.equal(choix.directe, declaration.ok, 'la cible proposée et la déclaration concordent');
  return choix.directe;
}

test('règle 1 : une créature à distance derrière couvre le sorcier contre les mêlées', () => {
  {
    const { d, poser } = table();
    const melee = poser('joueur', MELEE);
    assert.equal(directe(d, 'joueur', melee), true, 'champ adverse vide : le sorcier est à découvert');
  }
  {
    const { d, poser } = table();
    const melee = poser('joueur', MELEE);
    const tireur = poser('sorcier', TIREUR);
    assert.equal(tireur.emplacement >= 4, true, 'le tireur se range au fond');
    assert.equal(directe(d, 'joueur', melee), false, 'un tireur adverse couvre son sorcier');
    assert.equal(rpgAttaquerSorcier(d, 'joueur', melee.id).ok, false, 'le raccourci suit la même règle');
  }
});

test('règle 1 : une volante devant ne découvre pas le sorcier', () => {
  const { d, poser } = table();
  const melee = poser('joueur', MELEE);
  const volante = poser('sorcier', MELEE, { envol: true });
  poser('sorcier', TIREUR);
  // La volante hors de portée laissait le sorcier à découvert : le tireur du
  // fond le couvre désormais.
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).cibles.length, 0);
  assert.equal(directe(d, 'joueur', melee), false);
  assert.ok(volante.envol);
});

test('règle 1 : une mêlée volante ne passe pas non plus un tireur adverse', () => {
  const { d, poser } = table();
  const melee = poser('joueur', MELEE, { envol: true });
  poser('sorcier', TIREUR);
  assert.equal(directe(d, 'joueur', melee), false, 'Envol ne lève pas la couverture à distance');
  const { d: sansTireur, poser: poser2 } = table();
  const voleur = poser2('joueur', MELEE, { envol: true });
  poser2('sorcier', MELEE);
  assert.equal(directe(d, 'joueur', melee), false);
  assert.equal(directe(sansTireur, 'joueur', voleur), true, 'sans créature à distance en face, Envol passe');
});

test('règle 2 : un tireur sans Attaque ciblée ne passe pas une mêlée en face', () => {
  const { d, poser } = table();
  const tireur = poser('joueur', TIREUR, { coupRapide: false });
  assert.equal(tireur.coupRapide, false);
  assert.equal(directe(d, 'joueur', tireur), true, 'champ adverse vide : il tire au but');
  poser('sorcier', MELEE);
  assert.equal(directe(d, 'joueur', tireur), false, 'une mêlée adverse fait écran');
});

test('règle 2 : l’écran tient même quand la mêlée est hors d’atteinte', () => {
  // Une mêlée infiltrée n’est pas une cible légale : sans la règle, le sorcier
  // serait à découvert.
  const { d, poser } = table();
  const tireur = poser('joueur', TIREUR, { coupRapide: false });
  poser('sorcier', MELEE, { infiltration: true });
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', tireur.id).cibles.length, 0);
  assert.equal(directe(d, 'joueur', tireur), false);
});

test('Attaque ciblée : le tireur passe les lignes, mais ni une volante ni un Défenseur', () => {
  const { d, poser } = table();
  const archere = poser('joueur', ARCHERE);
  assert.equal(archere.distance, true);
  assert.equal(archere.coupRapide, true, 'l’Archère a l’Attaque ciblée');
  poser('sorcier', MELEE);
  assert.equal(directe(d, 'joueur', archere), true, 'une mêlée en face ne couvre plus le sorcier');
  const { d: vole, poser: poser2 } = table();
  const tireuse = poser2('joueur', ARCHERE);
  poser2('sorcier', MELEE, { envol: true });
  assert.equal(directe(vole, 'joueur', tireuse), false, 'une volante adverse attire les coups');
  const { d: garde, poser: poser3 } = table();
  const archereGardee = poser3('joueur', ARCHERE);
  poser3('sorcier', MELEE, { defenseurAccorde: true });
  assert.equal(directe(garde, 'joueur', archereGardee), false, 'un Défenseur attire les coups');
});

test('la règle est symétrique : le sorcier attaque sous les mêmes conditions', () => {
  const { d, poser, adv } = table('sorcier');
  const melee = poser('sorcier', MELEE);
  poser(adv, TIREUR);
  assert.equal(directe(d, 'sorcier', melee), false);
});

test('hors des lignes, la règle historique reste intacte', () => {
  // Une volante hors de portée ne protège plus le sorcier, tireur derrière ou
  // pas : c’est `attaqueDirectePermise` qui décide seul.
  const volante = { id: 'vol', carteId: MELEE, envol: true };
  const tireur = { id: 'tir', carteId: TIREUR, distance: true };
  const melee = { id: 'mel', carteId: MELEE };
  assert.equal(attaqueDirecteSurLesLignes({}, melee, [volante, tireur], []), true);
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true, moba: true }, melee, [volante, tireur], []), true);
  // Les mêmes créatures, en duel à lignes : la couverture s’applique.
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, melee, [volante, tireur], []), false);
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { ...tireur, coupRapide: false }, [melee], []), false);
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { ...tireur, coupRapide: true }, [melee], []), true);
});
