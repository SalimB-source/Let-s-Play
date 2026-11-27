import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, magieById } from '../src/games/rpgCards.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import {
  rpgActiverCapacite, rpgCiblesActivationLegales, rpgChampionsActivationLegales, rpgConsommerSoins, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai,
  rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel, rpgPeutActiverCapacite,
  rpgPeutAttaquer, rpgLancerMagie, rpgResoudreEffetCreatureEnAttente, rpgResoudreContresortBoualem, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgSorcierActiverCapacitesIA,
} from '../src/games/rpgDuel.js';
import { texteActivation } from '../src/games/rpgActivationTexte.js';
import { choisirActivationIA } from '../src/games/rpgAI.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';

const hotes = RPG_DUEL_CARDS.filter((carte) => carte.activation);

function duel(rng = () => 0.9) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  for (const c of ['joueur', 'sorcier']) {
    d[c].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 20]));
    d[c].deck = Array(12).fill('gerboise-des-ruines');
  }
  return d;
}

function poser(d, cote, id, { malade = false } = {}) {
  const tour = d.tour; d.tour = cote; d[cote].invocationNormaleJouee = false;
  d[cote].main.push(id);
  const monnaie = ['chien-du-guet', 'porteuse-de-cruches', 'gerboise-des-ruines'];
  const retourIds = [];
  for (let i = 0; i < retoursAuDeckInvocation(cardById(id)); i++) { d[cote].main.push(monnaie[i]); retourIds.push(monnaie[i]); }
  const res = rpgJouerCreature(d, cote, id, null, retourIds.length ? { retourIds } : {});
  d.tour = tour;
  assert.equal(res.ok, true, `pose ${id} : ${res.raison}`);
  res.entite.ready = !malade; res.entite.malInvocation = malade;
  return res.entite;
}

function activer(d, sourceId, cibleId = null) {
  const avant = Number(d.combatAnimationSeq) || 0;
  rpgConsommerSoins(d);
  const res = rpgActiverCapacite(d, 'joueur', sourceId, cibleId);
  const tirs = (d.combatAnimations ?? []).filter((a) => a.id > avant && a.type === 'projectile-combat');
  return { res, tirs: tirs.map((t) => ({ v: t.variante, c: t.cible })) };
}

// ── Demande 3 : le mal d'invocation tient aussi l'effet activé ──────────────

test('une créature qui vient d’arriver n’active pas son effet', () => {
  const d = duel();
  d.tour = 'joueur';
  const scribe = poser(d, 'joueur', 'scribe-de-la-liste', { malade: true });
  poser(d, 'sorcier', 'dune-marchante');
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', scribe.id), false,
    'le bouton ne se propose pas');
  assert.equal(rpgActiverCapacite(d, 'joueur', scribe.id).raison, 'mal-invocation',
    'le moteur refuse pour la même raison que l’attaque');
  assert.equal(d.joueur.main.length, 0, 'rien n’est pioché');

  scribe.ready = true; scribe.malInvocation = false;   // le tour suivant
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', scribe.id), true);
  assert.equal(activer(d, scribe.id).res.ok, true);
  assert.equal(d.joueur.main.length, 1, 'l’effet part une fois la créature dégagée');
});

test('l’attaque et l’effet sont le même geste : ni l’un après l’autre', () => {
  const d = duel();
  d.tour = 'joueur';
  const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const proie = poser(d, 'sorcier', 'dune-marchante');

  // L'effet d'abord : la créature retombe, l'attaque ne se propose plus.
  assert.equal(rpgPeutAttaquer(oni), true, 'elle pouvait frapper');
  assert.equal(activer(d, oni.id, proie.id).res.ok, true);
  assert.equal(oni.ready, false, 'activer fait tomber `ready`');
  assert.equal(rpgPeutAttaquer(oni), false, 'et donc l’attaque du tour');

  // L'attaque d'abord : le bouton ⚡ ne doit pas rester allumé.
  const tojiro = poser(d, 'joueur', 'vampire-des-braises');
  const coup = rpgLancerAttaque(d, 'joueur', [tojiro.id]);
  assert.equal(coup.ok, true, `attaque : ${coup.raison}`);
  assert.equal(tojiro.attaquee, true);
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', tojiro.id), false,
    'la fenêtre d’effet ne se propose plus après la frappe');
  assert.equal(rpgActiverCapacite(d, 'joueur', tojiro.id).raison, 'deja-attaquee');
});

// ── Demande 2 : les sorts confiés à des créatures ───────────────────────────

test('chaque effet activé est annoncé, jouable et dit ce qu’il fait', () => {
  assert.ok(hotes.length >= 19, `${hotes.length} créatures portent un effet activé`);
  for (const carte of hotes) {
    const { activation } = carte;
    assert.equal(activation.uneFoisParMatch, true, `${carte.id} : une fois par présence`);
    assert.ok(['aucune', 'creature', 'creature-amie'].includes(activation.cible),
      `${carte.id} : portée lisible (${activation.cible})`);
    assert.ok(activation.effet?.type, `${carte.id} : un effet, pas seulement un coût`);

    const phrase = texteActivation(carte);
    assert.ok(activation.nom?.trim(), `${carte.id} possède un nom de capacité`);
    assert.ok(phrase.startsWith(`${activation.nom} — `), `${carte.id} : « ${phrase} »`);
    assert.doesNotMatch(phrase, /1\s*\/\s*(?:tour|présence)/u);
    assert.match(phrase, /\.$/u);
    assert.doesNotMatch(phrase, /undefined|NaN|\[object/u, `${carte.id} : « ${phrase} »`);

    // La liste de cibles suit la portée : rien à désigner, ou des identifiants.
    const d = duel();
    d.tour = 'joueur';
    const source = poser(d, 'joueur', carte.id);
    if (!d.renfortChoixEnAttente) poser(d, 'sorcier', 'dune-marchante');
    const legales = rpgCiblesActivationLegales(d, 'joueur', source.id);
    if (activation.cible === 'aucune') assert.equal(legales, null, `${carte.id} ne désigne personne`);
    else assert.ok(Array.isArray(legales), `${carte.id} : une liste de cibles`);
  }
});

test('la Dévoreuse mange sous son seuil, et rien au-dessus', () => {
  const d = duel();
  d.tour = 'joueur';
  const devoreuse = poser(d, 'joueur', 'la-devoreuse');
  const proie = poser(d, 'sorcier', 'chien-du-guet');          // coût 2
  const tropGrosse = poser(d, 'sorcier', 'dune-marchante');    // coût 3
  const legales = rpgCiblesActivationLegales(d, 'joueur', devoreuse.id);
  assert.deepEqual(legales, [proie.id], 'le seuil de coût est lu comme pour le sort');
  assert.equal(rpgActiverCapacite(d, 'joueur', devoreuse.id, tropGrosse.id).raison, 'cible');

  const { res, tirs } = activer(d, devoreuse.id, proie.id);
  assert.equal(res.ok, true);
  assert.equal(d.sorcier.creatures.length, 1, 'la proie tombe');
  assert.equal(d.sorcier.cimetiere.length, 1);
  assert.deepEqual(tirs.map((t) => t.v), ['ruine'], 'la tête de ce qui tombe');
});

test('le Lecteur du dernier nom vide une carte de la main adverse', () => {
  const d = duel();
  d.tour = 'joueur';
  const lecteur = poser(d, 'joueur', 'lecteur-du-dernier-nom');
  d.sorcier.main.push('chien-du-guet', 'gerboise-des-ruines');
  assert.equal(rpgCiblesActivationLegales(d, 'joueur', lecteur.id), null);
  const { res, tirs } = activer(d, lecteur.id);
  assert.equal(res.ok, true);
  assert.equal(d.sorcier.main.length, 1);
  assert.equal(d.sorcier.cimetiere.length, 1);
  assert.deepEqual(tirs.map((t) => t.c.type), ['sorcier'], 'la plume part au sorcier adverse');
});

test('l’Embuscade du Gardien maigrit la table adverse jusqu’à la fin du tour', () => {
  const d = duel();
  d.tour = 'joueur';
  const gardien = poser(d, 'joueur', 'gardien-viking-du-fjord');
  const adverse = poser(d, 'sorcier', 'dune-marchante');       // 2/4
  const { res } = activer(d, gardien.id);
  assert.equal(res.ok, true);
  assert.equal(adverse.atk, 1, '-2/+0, sans descendre sous 1');
  assert.equal(adverse.def, 2, '0/+2');
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(adverse.atk, 2, 'le maléfice tombe avec le tour');
});

test('l’Ifrit brise une arme équipée, puis pioche', () => {
  const d = duel();
  d.tour = 'joueur';
  const ifrit = poser(d, 'joueur', 'ifrit-des-ergs');
  const porteur = poser(d, 'sorcier', 'dune-marchante');
  const nu = poser(d, 'sorcier', 'chien-du-guet');
  porteur.arme = { carteId: 'lame-de-mer', restant: 2 };
  assert.deepEqual(rpgCiblesActivationLegales(d, 'joueur', ifrit.id), [porteur.id],
    'seule une créature équipée se brise');
  const avant = d.joueur.main.length;
  const { res } = activer(d, ifrit.id, porteur.id);
  assert.equal(res.ok, true);
  assert.equal(porteur.arme, null);
  assert.equal(d.joueur.main.length, avant + 1);
  assert.ok(nu, 'le porteur reste en jeu, son arme non');
});

test('Kagutsuchi déclenche le Grand Hiver dans une colonne, source comprise', () => {
  const d = duel();
  d.tour = 'joueur';
  const kagutsuchi = poser(d, 'joueur', 'kagutsuchi-flamme-originelle');
  const allie = poser(d, 'joueur', 'porteuse-de-cruches');
  const adverse = poser(d, 'sorcier', 'porteuse-de-cruches');
  kagutsuchi.emplacement = 0; allie.emplacement = 4; adverse.emplacement = 0;
  const pvAllie = allie.pv; const pvAdverse = adverse.pv; const pvKagutsuchi = kagutsuchi.pv;
  const res = rpgActiverCapacite(d, 'joueur', kagutsuchi.id, null, { zone: { forme: 'colonne', colonne: 0 } });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(allie.pv, pvAllie - 1);
  assert.equal(adverse.pv, pvAdverse - 1);
  assert.equal(kagutsuchi.pv, pvKagutsuchi - 1, 'la source est dans la zone');
});

test('l’annonce de l’effet précède son résultat dans le journal', () => {
  const d = duel();
  d.tour = 'joueur';
  const devoreuse = poser(d, 'joueur', 'la-devoreuse');
  const proie = poser(d, 'sorcier', 'chien-du-guet');
  d.log.length = 0;
  activer(d, devoreuse.id, proie.id);
  const annonce = d.log.findIndex((ligne) => ligne.includes('active son effet'));
  assert.ok(annonce >= 0, `journal : ${JSON.stringify(d.log)}`);
  assert.equal(annonce, 0, 'l’effet n’est pas annoncé après son propre résultat');
});

test('l’IA active ses créatures, et jamais une créature qui vient d’arriver', () => {
  const d = duel();
  d.tour = 'sorcier';
  const devoreuse = poser(d, 'sorcier', 'la-devoreuse', { malade: true });
  const proie = poser(d, 'joueur', 'chien-du-guet');
  assert.equal(choisirActivationIA(d, 'sorcier', { rng: () => 0.9 }), null,
    'le mal d’invocation retient aussi l’IA');

  devoreuse.ready = true; devoreuse.malInvocation = false;
  assert.deepEqual(choisirActivationIA(d, 'sorcier', { rng: () => 0.9 }),
    { entiteId: devoreuse.id, cibleId: proie.id }, 'elle mange ce qui passe sous son seuil');

  // Une main pleine n’appelle pas la pioche, et un sorcier intact n’appelle
  // pas le soin : l’effet se paie d’une attaque, l’IA ne le dépense pas pour rien.
  const d2 = duel();
  d2.tour = 'sorcier';
  poser(d2, 'sorcier', 'scribe-de-la-liste');
  d2.sorcier.main = Array(7).fill('chien-du-guet');
  poser(d2, 'joueur', 'dune-marchante');
  assert.equal(choisirActivationIA(d2, 'sorcier', { rng: () => 0.9 }), null);
});

// ── Demande 1 : les boutons passent au-dessus de la carte ───────────────────

test('attaquer et effet activé s’ouvrent au-dessus de la carte, plus grands et centrés', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const blocs = (selecteur) => css.match(new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`, 'gu')) ?? [];

  // Une seule définition du menu : la seconde contredisait la première.
  const menus = blocs('.rpg-card__effet-menu');
  assert.equal(menus.length, 1, 'une seule définition du menu');
  assert.match(menus[0], /position:\s*absolute/u, 'menu sur la couche du duel');
  assert.match(menus[0], /z-index:\s*44/u);
  assert.match(menus[0], /justify-content:\s*center/u);

  // Les boutons sont des cases de la barre, plus des boîtes absolues : c'est le
  // menu qui se place, et la paire reste centrée sur la carte.
  const bouton = blocs('.rpg-card__effet-btn')[0];
  assert.ok(bouton, 'le bouton d’effet a sa règle');
  assert.match(bouton, /position:\s*static/u, 'le bouton ne se place plus tout seul');
  assert.doesNotMatch(bouton, /transform:/u, 'aucun `transform` que l’animation viendrait figer');
  assert.match(bouton, /width:\s*52px/u);
  assert.match(bouton, /height:\s*52px/u);
  assert.match(bouton, /justify-content:\s*center/u);
  assert.match(bouton, /touch-action:\s*manipulation/u, 'la case reste la cible au doigt');

  // L'apparition ne joue que sur `scale`/`opacity` : un `transform` en image
  // clé remplacerait celui du bouton et, remplissage `both` oblige, le
  // laisserait décalé d'une demi-largeur — les deux cases se chevauchaient.
  const pop = css.match(/@keyframes rpgEffetBtnPop\s*\{[^@]*?\}\s*\}/u)?.[0] ?? '';
  assert.ok(pop.length > 0, 'l’animation d’apparition existe');
  assert.doesNotMatch(pop, /transform/u, 'aucun `transform` dans les images clés');

  // Le retour à l'appui se voit, sinon le clic semble perdu.
  assert.match(css, /\.rpg-card__effet-btn:active\s*\{[^}]*transform:\s*translateY\(2px\)/u);
  assert.match(css, /\.rpg-card__effet-btn:focus-visible\s*\{/u);

  // Au doigt, la case grandit encore.
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\)\s*\{[^@]*?\.rpg-card__effet-btn\s*\{[^}]*width:\s*58px/su);
});

test('le badge d’effet activé chevauche le milieu du bord inférieur', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const bloc = css.match(/\.rpg-battle \.rpg-card--img \.rpg-card__effet-badge\s*\{[^}]*\}/u)?.[0] ?? '';
  assert.match(bloc, /top:\s*auto/u);
  assert.match(bloc, /bottom:\s*0/u);
  assert.match(bloc, /left:\s*50%/u);
  assert.match(bloc, /transform:\s*translate\(-50%,\s*50%\)/u);
  assert.match(bloc, /width:\s*30px/u);
  assert.match(bloc, /height:\s*27px/u);
});

test('la colonne des effets de Salem ne descend plus à cause du badge d’activation', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /rpg-card-icones--sous-activation/u);
  const css = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /rpg-card-icones--sous-activation/u);
});

test('Salem endurcit une alliée : +0/+2 jusqu’à la fin du tour', () => {
  const d = duel();
  d.tour = 'joueur';
  const salem = poser(d, 'joueur', 'salem');
  const allie = poser(d, 'joueur', 'dune-marchante');
  const adverse = poser(d, 'sorcier', 'chien-du-guet');
  const legales = rpgCiblesActivationLegales(d, 'joueur', salem.id);
  assert.deepEqual(legales, [salem.id, allie.id], 'le Sondeur ne vise que son camp, lui compris');
  assert.ok(!legales.includes(adverse.id), 'jamais une créature adverse');
  const { res, tirs } = activer(d, salem.id, allie.id);
  assert.equal(res.ok, true);
  assert.equal(allie.def, 6, '+0/+2');
  assert.equal(allie.atk, 2, 'l’attaque ne bouge pas');
  assert.deepEqual(tirs.map((t) => t.v), ['renfort']);
  assert.match(texteActivation(cardById('salem')), /\+0\/\+2 jusqu’à la fin du tour/u);
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(allie.def, 4, 'le renfort tombe avec le tour');
});

test('l’aperçu au survol s’efface devant la fenêtre d’effet ouverte', () => {
  const jsx = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  // Devenu interactif après 450 ms, l'aperçu prend les clics des deux boutons
  // s'il les recouvre : la créature au menu ouvert n'a donc plus d'aperçu.
  const rendus = jsx.match(/apercuSurvol\.entiteId !== menuEffetEntiteId/gu) ?? [];
  assert.equal(rendus.length, 2, 'les deux emplacements de l’aperçu gardent la même priorité');
  // Les boutons arrêtent la propagation : un clic sur ⚔ ou ⚡ ne referme pas le
  // menu en déclenchant le clic de la carte.
  const menu = jsx.slice(jsx.indexOf('function MenuActionsCreature'), jsx.indexOf('export function TableCard'));
  assert.equal((menu.match(/event\.stopPropagation\(\)/gu) ?? []).length, 4,
    'clics, pointeur et Échap restent dans le menu');
  assert.match(menu, /createPortal/u, 'commandes séparées du bouton de carte');
});

test('trois associations reprennent l’effet de base du sort, sans Lien ni contresort', () => {
  for (const [id, sort] of [
    ['scribe-des-feuillets', 'les-feuillets'],
    ['celui-qui-juge', 'le-jugement-des-colosses'],
  ]) {
    const activation = cardById(id).activation;
    assert.equal(activation.sortAssocie, sort);
    assert.deepEqual(activation.effet, magieById(sort).effet);
    assert.equal(activation.uneFoisParMatch, true);
    assert.notEqual(activation.effet.type, 'contresort');
  }
});

test('Rapport du greffier et Les feuillets font bien piocher une et meuler trois', () => {
  const d = duel();
  const guetteur = poser(d, 'joueur', 'guetteur-du-beffroi');
  const scribe = poser(d, 'joueur', 'scribe-des-feuillets');
  const main = d.joueur.main.length, deck = d.sorcier.deck.length, cimetiere = d.sorcier.cimetiere.length;
  assert.ok(rpgActiverCapacite(d, 'joueur', guetteur.id).ok);
  assert.equal(d.joueur.main.length, main + 1);
  assert.ok(rpgActiverCapacite(d, 'joueur', scribe.id).ok);
  assert.equal(d.sorcier.deck.length, deck - 3);
  assert.equal(d.sorcier.cimetiere.length, cimetiere + 3);
});

test('Le Jugement des colosses ne touche que les créatures de coût 4 ou plus', () => {
  const d = duel();
  const juge = poser(d, 'joueur', 'celui-qui-juge');
  const petite = poser(d, 'sorcier', 'chien-du-guet');
  const grande = poser(d, 'sorcier', 'dame-des-neuf-mondes');
  assert.ok(!rpgCiblesActivationLegales(d, 'joueur', juge.id).includes(petite.id));
  assert.ok(rpgCiblesActivationLegales(d, 'joueur', juge.id).includes(grande.id));
  assert.ok(rpgActiverCapacite(d, 'joueur', juge.id, grande.id).ok);
  assert.ok(!d.sorcier.creatures.some(e => e.id === grande.id));
});

test('la limite est individuelle, persistante après sérialisation et réinitialisée au retour en jeu', () => {
  let d = duel();
  const a = poser(d, 'joueur', 'scribe-de-la-liste');
  const b = poser(d, 'joueur', 'scribe-de-la-liste');
  assert.ok(rpgActiverCapacite(d, 'joueur', a.id).ok);
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', b.id), true, 'un autre exemplaire garde son activation');
  d = JSON.parse(JSON.stringify(d));
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', a.id), false);
  assert.equal(rpgActiverCapacite(d, 'joueur', a.id).raison, 'deja-activee');
  d.tour = 'sorcier'; d.sorcier.main.push('ressac');
  assert.ok(rpgLancerMagie(d, 'sorcier', 'ressac', a.id).ok, 'la créature retourne en main');
  d.tour = 'joueur'; d.joueur.invocationNormaleJouee = false;
  const resultat = rpgJouerCreature(d, 'joueur', 'scribe-de-la-liste');
  assert.ok(resultat.ok, JSON.stringify(resultat));
  const nouvelle = resultat.entite;
  assert.notEqual(nouvelle.id, a.id);
  nouvelle.malInvocation = false; nouvelle.ready = true;
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', nouvelle.id), true);
  assert.ok(rpgActiverCapacite(d, 'joueur', nouvelle.id).ok);
});

test('une activation dont la cible disparaît en réponse reste dépensée', () => {
  const d = duel();
  const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const cible = poser(d, 'sorcier', 'chien-du-guet');
  d.sorcier.main.push('trait-de-braise');
  const annonce = rpgActiverCapacite(d, 'joueur', oni.id, cible.id, { attendreReponse: true });
  assert.ok(annonce.ok && annonce.effetEnAttente, JSON.stringify(annonce));
  assert.equal(oni.activationUtiliseeMatch, true);
  d.sorcier.creatures = d.sorcier.creatures.filter(e => e.id !== cible.id);
  const resultat = rpgResoudreEffetCreatureEnAttente(d, 'sorcier');
  assert.ok(resultat.ok && resultat.dissipe);
  assert.equal(rpgActiverCapacite(d, 'joueur', oni.id, null).raison, 'deja-activee');
});

test('PvP : l’arbitre refuse la seconde activation au tour suivant', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'scribe-de-la-liste');
  const intention = { type: 'activer', capacite: true, entiteId: source.id };
  assert.ok(rpgPvpAppliquer(d, 'joueur', intention).ok);
  rpgFinDeTour(d); rpgFinDeTour(d);
  const result = rpgPvpAppliquer(d, 'joueur', intention);
  assert.equal(result.ok, false);
  assert.equal(result.raison, 'deja-activee');
});

test('les nouvelles capacités reprennent leurs sorts de base sans le Lien', () => {
  for (const [id, sort] of [
    ['bakunawa', 'le-routier'],
    ['le-chasseur-d-ocracoke', 'lettre-de-marque'],
    ['maitre-des-corbeaux', 'la-derniere-pesee'],
  ]) {
    const carte = cardById(id); const magie = magieById(sort);
    assert.equal(carte.activation.sortAssocie, sort);
    assert.deepEqual(carte.activation.effet, magie.effet);
    assert.ok(texteActivation(carte).startsWith(`${carte.activation.nom} — `));
    assert.doesNotMatch(texteActivation(carte), /Active son effet/u);
  }
  assert.equal(cardById('maitre-des-corbeaux').cost, 7, 'la destruction totale est confiée à une grosse créature');
});

test('La Dernière Pesée du Maître des corbeaux détruit toutes les créatures, source comprise', () => {
  const d = duel();
  const maitre = poser(d, 'joueur', 'maitre-des-corbeaux');
  const allie = poser(d, 'joueur', 'chien-du-guet');
  const adversaire = poser(d, 'sorcier', 'chien-du-guet');
  assert.ok(rpgActiverCapacite(d, 'joueur', maitre.id).ok);
  assert.ok(!d.joueur.creatures.some(e => [maitre.id, allie.id].includes(e.id)));
  assert.ok(!d.sorcier.creatures.some(e => e.id === adversaire.id));
  assert.ok(d.joueur.cimetiere.includes('maitre-des-corbeaux'));
  assert.ok(d.joueur.retoursProgrammes?.some(e => e.carteId === 'maitre-des-corbeaux'), 'Ténacité reste possible');
});

test('Lettre de marque du Chasseur : une pioche et un Abordage coût moins un, sans bonus de Lien', () => {
  const d = duel();
  const chasseur = poser(d, 'joueur', 'le-chasseur-d-ocracoke');
  const avant = d.joueur.main.length;
  assert.ok(rpgActiverCapacite(d, 'joueur', chasseur.id).ok);
  assert.equal(d.joueur.main.length, avant + 1);
  assert.equal(d.joueur.prochaineArriveeAbordage, true);
  assert.equal(d.joueur.prochaineArriveeAbordageSeuilPlein, false);
});

for (const cote of ['joueur', 'sorcier']) test(`Le Routier de Bakunawa : pioche puis choix de défausse pour le siège PvP ${cote}`, () => {
  const d = duel(); d.pvp = true;
  const bakunawa = poser(d, cote, 'bakunawa');
  d.tour = cote;
  const avant = d[cote].main.length;
  assert.ok(rpgActiverCapacite(d, cote, bakunawa.id).ok);
  assert.equal(d[cote].main.length, avant + 2, 'le Lien ne s’applique pas');
  assert.equal(d.defausseEnAttente?.cote, cote);
  assert.equal(d.defausseEnAttente?.restant, 1);
});

test('les trois effets supplémentaires reproduisent le sort sans Lien et mentionnent leur prix', () => {
  for (const [id, sort] of [
    ['la-barbe-rousse', 'le-grand-debarquement'],
    ['momie-de-lin', 'offrande-de-lin'],
    ['passeur-au-masque-de-chacal', 'la-grande-pesee'],
  ]) {
    const carte = cardById(id); const magie = magieById(sort);
    assert.equal(carte.activation.sortAssocie, sort);
    assert.deepEqual(carte.activation.effet, magie.effet);
    assert.equal(carte.activation.prixPv ?? 0, magie.prixPv ?? 0);
    if (magie.prixPv) assert.match(texteActivation(carte), /Payez 1 PV/u);
    assert.doesNotMatch(texteActivation(carte), /Active son effet/u);
  }
  assert.equal(cardById('passeur-au-masque-de-chacal').cost, 6);
});

test('Offrande de lin paie 1 PV et renforce aussi sa source, puis expire', () => {
  const d = duel(); const momie = poser(d, 'joueur', 'momie-de-lin');
  const allie = poser(d, 'joueur', 'chien-du-guet');
  const avant = [momie.atk, allie.atk, d.joueur.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', momie.id).ok);
  assert.equal(d.joueur.pv, avant[2] - 1);
  assert.equal(momie.atk, avant[0] + 1); assert.equal(allie.atk, avant[1] + 1);
  assert.equal(momie.tribut, 1); assert.equal(allie.tribut, 1);
  rpgFinDeTour(d);
  assert.equal(momie.atk, avant[0]); assert.equal(allie.atk, avant[1]);
  assert.equal(momie.tribut, 0);
});

test('un prix PV impayable ne consomme pas l’activation', () => {
  const d = duel(); const momie = poser(d, 'joueur', 'momie-de-lin');
  d.joueur.pv = 1;
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', momie.id), false);
  assert.equal(rpgActiverCapacite(d, 'joueur', momie.id).ok, false);
  assert.ok(!momie.activationUtiliseeMatch);
});

test('Grand Débarquement renforce les cales pleines, y compris celle de la source', () => {
  const d = duel(); const barbe = poser(d, 'joueur', 'la-barbe-rousse');
  // Remplir les cales directement : la prise elle-même est testée ailleurs.
  const allie = d.joueur.creatures.find(e => e.id !== barbe.id);
  const sansCale = poser(d, 'joueur', 'chien-du-guet');
  barbe.enCale = { carteId: 'chien-du-guet' }; allie.enCale = { carteId: 'chien-du-guet' };
  const avant = [barbe.atk, allie.atk, sansCale.atk];
  assert.ok(rpgActiverCapacite(d, 'joueur', barbe.id).ok);
  assert.equal(barbe.atk, avant[0] + 2); assert.equal(allie.atk, avant[1] + 2);
  assert.equal(sansCale.atk, avant[2]); assert.equal(allie.overkill, true);
});

test('La Grande Pesée coûte 1 PV, transfère 3 et pioche 2 sans le Lien', () => {
  const d = duel(); const passeur = poser(d, 'joueur', 'passeur-au-masque-de-chacal');
  // Le Passeur peut ouvrir un choix d’arrivée sans rapport avec l’activation.
  d.renfortChoixEnAttente = null;
  d.joueur.pv = 10; d.sorcier.pv = 15;
  const avant = d.joueur.main.length;
  assert.ok(rpgActiverCapacite(d, 'joueur', passeur.id).ok);
  assert.equal(d.joueur.pv, 12); assert.equal(d.sorcier.pv, 12);
  assert.equal(d.joueur.main.length, avant + 2);
});

for (const cote of ['joueur', 'sorcier']) test(`PvP : ${cote} choisit la défausse après l’activation de Bakunawa`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, cote, 'bakunawa'); d.tour = cote;
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: source.id }).ok);
  assert.equal(d.defausseEnAttente?.cote, cote);
  const carte = d[cote].main[0];
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'defausser', index: 0 }).ok);
  assert.ok(d[cote].cimetiere.includes(carte));
  assert.ok(!d.defausseEnAttente);
});

test('PvP : capacité de créature équipée ne se confond pas avec son arme', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'scribe-de-la-liste');
  source.armeId = 'faux-id';
  const main = d.joueur.main.length;
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: source.id });
  assert.ok(res.ok, JSON.stringify(res));
  assert.equal(d.joueur.main.length, main + 1);
});

test('Conquête : une capacité à prix PV est refusée tant que le choix de voie manque', () => {
  const d = duel(); const momie = poser(d, 'joueur', 'momie-de-lin');
  d.moba = {}; const avant = d.joueur.pv;
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', momie.id), false);
  assert.equal(rpgActiverCapacite(d, 'joueur', momie.id).raison, 'prix-voie-non-pris-en-charge');
  assert.equal(d.joueur.pv, avant); assert.ok(!momie.activationUtiliseeMatch);
});

test('une créature capturée puis libérée en jeu retrouve son activation', () => {
  const d = duel(); const scribe = poser(d, 'joueur', 'scribe-de-la-liste');
  assert.ok(rpgActiverCapacite(d, 'joueur', scribe.id).ok);
  d.tour = 'sorcier'; d.sorcier.invocationNormaleJouee = false;
  const pirateId = 'la-vengeance-de-la-reine-anne';
  d.sorcier.main.push(pirateId);
  const monnaie = ['chien-du-guet', 'porteuse-de-cruches', 'gerboise-des-ruines'];
  const retourIds = monnaie.slice(0, retoursAuDeckInvocation(cardById(pirateId)));
  d.sorcier.main.push(...retourIds);
  const pirate = rpgJouerCreature(d, 'sorcier', pirateId, scribe.id, { retourIds });
  assert.ok(pirate.ok, JSON.stringify(pirate));
  assert.equal(pirate.entite.enCale?.entite?.id, scribe.id);
  d.tour = 'joueur';
  const juge = poser(d, 'joueur', 'celui-qui-juge');
  assert.ok(rpgActiverCapacite(d, 'joueur', juge.id, pirate.entite.id).ok);
  const revenue = d.joueur.creatures.find(e => e.id === scribe.id);
  assert.ok(revenue, 'la prisonnière revient sur le champ');
  assert.equal(revenue.activationUtiliseeMatch, false);
  revenue.malInvocation = false; revenue.ready = true;
  assert.ok(rpgActiverCapacite(d, 'joueur', revenue.id).ok);
});

test('IA : la destruction totale est gardée pour une table adverse plus précieuse', () => {
  const d = duel();
  const maitre = poser(d, 'sorcier', 'maitre-des-corbeaux');
  d.tour = 'sorcier';
  assert.equal(choisirActivationIA(d, 'sorcier'), null);
  poser(d, 'joueur', 'kraken'); poser(d, 'joueur', 'seigneur-des-machoires');
  assert.equal(choisirActivationIA(d, 'sorcier')?.entiteId, maitre.id);
});

test('PvP : le prix en PV est payé par l’arbitre, et refusé à 1 PV', () => {
  for (const pv of [1, 2]) {
    const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    const momie = poser(d, 'joueur', 'momie-de-lin'); d.joueur.pv = pv;
    const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: momie.id });
    assert.equal(res.ok, pv === 2);
    assert.equal(d.joueur.pv, 1);
    assert.equal(Boolean(momie.activationUtiliseeMatch), pv === 2);
  }
});

test('aucune nouvelle association ne copie une magie rapide ou un contresort', () => {
  for (const carte of RPG_DUEL_CARDS.filter(c => c.activation?.sortAssocie)) {
    const sort = magieById(carte.activation.sortAssocie);
    assert.ok(sort, `${carte.id} : sort existant`);
    assert.notEqual(sort.instant, true, `${carte.id} : ${sort.id} est une magie rapide`);
    assert.notEqual(sort.vitesse, 'rapide', `${carte.id} : ${sort.id} est une magie rapide`);
    assert.notEqual(sort.effet?.type, 'contresort', `${carte.id} : contresort exclu`);
  }
  assert.notEqual(cardById('souverain-de-la-lune-noire').activation?.sortAssocie, 'voile-de-la-lune-noire');
  assert.ok(!cardById('dame-des-neuf-mondes').activation);
  assert.ok(cardById('guetteuse-des-marees').activation, 'la capacité préexistante reste indépendante');
});

for (const cote of ['joueur', 'sorcier']) for (const sort of ['voile-de-la-lune-noire', 'grand-voile-blanc']) {
  test(`la magie rapide ${sort} reste jouable en réponse par ${cote}`, () => {
    const d = duel(); const allie = poser(d, cote, 'chien-du-guet');
    d.tour = cote === 'joueur' ? 'sorcier' : 'joueur';
    d.fenetreReponse = true; d[cote].main.push(sort);
    assert.equal(magieById(sort).instant, true);
    const res = rpgLancerMagie(d, cote, sort, sort === 'voile-de-la-lune-noire' ? allie.id : null);
    assert.ok(res.ok, JSON.stringify(res));
    assert.ok(d[cote].cimetiere.includes(sort));
    if (sort === 'voile-de-la-lune-noire') assert.equal(allie.bouclier, 1);
    else assert.equal(d.brouillardCombat, true);
  });
}

for (const cote of ['joueur', 'sorcier']) for (const sort of ['voile-de-la-lune-noire', 'grand-voile-blanc']) {
  test(`PvP : ${cote} conserve ${sort} en réponse au tour adverse`, () => {
    const d = duel(); const allie = poser(d, cote, 'chien-du-guet');
    d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    d.tour = cote === 'joueur' ? 'sorcier' : 'joueur';
    d.fenetreReponse = true; d[cote].main.push(sort);
    const res = rpgPvpAppliquer(d, cote, { type: 'jouer-carte', carteId: sort,
      cibleId: sort === 'voile-de-la-lune-noire' ? allie.id : null });
    assert.ok(res.ok, JSON.stringify(res));
    assert.ok(d[cote].cimetiere.includes(sort));
    if (sort === 'voile-de-la-lune-noire') assert.equal(allie.bouclier, 1);
    else assert.equal(d.brouillardCombat, true);
  });
}

for (const sort of ['voile-de-la-lune-noire', 'grand-voile-blanc']) {
  test(`Conquête : ${sort} reste une réponse au tour adverse`, () => {
    const deck = Array(30).fill('chien-du-guet');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok);
    assert.ok(rpgDemarrerManaEssai(d).ok);
    d.joueur.main = ['chien-du-guet', 'chien-du-guet'];
    const allie = rpgMobaJouerCreature(d, 'joueur', 'chien-du-guet', 'left', 0, { choixCoutAuto: true });
    assert.ok(allie.ok, JSON.stringify(allie));
    rpgFinDeTour(d);
    d.sorcier.main = ['ashigaru-des-braises', 'chien-du-guet'];
    const attaquant = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0, { choixCoutAuto: true });
    assert.ok(attaquant.ok, JSON.stringify(attaquant));
    attaquant.entite.ready = true; attaquant.entite.malInvocation = false;
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', attaquant.entite.id, allie.entite.id, 'left').ok);
    d.joueur.main = [sort];
    const res = rpgMobaLancerMagie(d, 'joueur', sort, sort === 'voile-de-la-lune-noire' ? allie.entite.id : null,
      sort === 'grand-voile-blanc' ? 'left' : null);
    assert.ok(res.ok, JSON.stringify(res));
    assert.ok(d.joueur.cimetiere.includes(sort));
    if (sort === 'voile-de-la-lune-noire') assert.equal(allie.entite.bouclier, 1);
    else assert.ok(d.brouillardCombatVoies.includes('left'));
  });
}

test('les neuf nouvelles associations reprennent les effets imprimés hors Lien', () => {
  for (const [id, sort] of [
    ['drakkar-a-tete-de-dragon', 'mur-de-boucliers'],
    ['seigneur-des-machoires', 'lame-de-mer'],
    ['ifrit-al-ahmar', 'confluence-des-etincelles'],
    ['veilleuse-des-citernes', 'appel-des-marees'],
    ['valkyrie-au-corbeau', 'ralliement-des-neiges'],
    ['souverain-de-la-lune-noire', 'reanimation'],
    ['gardienne-des-derniers-noms', 'retour-des-ensevelis'],
  ]) {
    const carte = cardById(id), magie = magieById(sort);
    assert.equal(carte.activation.sortAssocie, sort);
    assert.deepEqual(carte.activation.effet, magie.effet);
    assert.doesNotMatch(texteActivation(carte), /Active son effet/u);
  }
});

test('Mur de boucliers renforce même sa source et expire en fin de tour', () => {
  const d = duel(); const guerrier = poser(d, 'joueur', 'drakkar-a-tete-de-dragon');
  const allie = poser(d, 'joueur', 'chien-du-guet'); const avant = [guerrier.atk, allie.atk];
  assert.ok(rpgActiverCapacite(d, 'joueur', guerrier.id).ok);
  assert.equal(guerrier.atk, avant[0] + 2); assert.equal(allie.atk, avant[1] + 2);
  assert.ok(guerrier.overkill && allie.overkill);
  rpgFinDeTour(d); assert.equal(guerrier.atk, avant[0]); assert.equal(allie.atk, avant[1]);
});

test('Lame de mer cible les adversaires, exile si létale et ne profite pas du Lien', () => {
  const d = duel(); const seigneur = poser(d, 'joueur', 'seigneur-des-machoires');
  const ami = poser(d, 'joueur', 'chien-du-guet'); const faible = poser(d, 'sorcier', 'chien-du-guet');
  assert.ok(!rpgCiblesActivationLegales(d, 'joueur', seigneur.id).includes(ami.id));
  assert.equal(rpgActiverCapacite(d, 'joueur', seigneur.id, ami.id).ok, false);
  assert.ok(rpgActiverCapacite(d, 'joueur', seigneur.id, faible.id).ok);
  assert.ok(d.sorcier.exil.includes('chien-du-guet')); assert.ok(!d.sorcier.cimetiere.includes('chien-du-guet'));
  const d2 = duel(); const s2 = poser(d2, 'joueur', 'seigneur-des-machoires'); const fort = poser(d2, 'sorcier', 'kraken');
  const avant = [fort.atk, fort.pv]; assert.ok(rpgActiverCapacite(d2, 'joueur', s2.id, fort.id).ok);
  assert.equal(fort.atk, avant[0] - 3); assert.equal(fort.pv, avant[1] - 3);
});

test('Confluence invoque les premiers Djinns admissibles et ne retire pas la source', () => {
  const d = duel(); const ifrit = poser(d, 'joueur', 'ifrit-al-ahmar');
  d.joueur.main.push('djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante');
  assert.ok(rpgActiverCapacite(d, 'joueur', ifrit.id).ok);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'djinn-de-la-premiere-etincelle'));
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'djinn-de-la-flamme-mourante'));
  assert.ok(d.joueur.creatures.includes(ifrit));
});

test('Dune marchante combat une cible adverse, sans choisir de champion', () => {
  const d = duel(); const dune = poser(d, 'joueur', 'dune-marchante');
  const ami = poser(d, 'joueur', 'chien-du-guet'); const cible = poser(d, 'sorcier', 'kraken');
  const avant = [dune.pv, cible.pv];
  assert.equal(rpgActiverCapacite(d, 'joueur', dune.id, ami.id).ok, false);
  assert.ok(rpgActiverCapacite(d, 'joueur', dune.id, cible.id).ok);
  assert.equal(cible.pv, avant[1] - dune.atk);
  assert.ok(!d.joueur.creatures.includes(dune) || dune.pv === avant[0] - cible.atk);
});

test('Veilleur ne possède plus de capacité activée', () => {
  assert.equal(cardById('veilleur-des-cendres').activation, undefined);
});

test('Appel des marées respecte le choix, les trois cartes et leur ordre sous le deck', () => {
  const d = duel(); const veilleuse = poser(d, 'joueur', 'veilleuse-des-citernes');
  d.joueur.deck = ['chien-du-guet', 'gerboise-des-ruines', 'porteuse-de-cruches', 'pilote-de-la-carreira'];
  assert.ok(rpgActiverCapacite(d, 'joueur', veilleuse.id).ok);
  const choix = rpgCartesRenfortChoisi(d, 'joueur');
  assert.deepEqual(choix.map(c => c.id), ['pilote-de-la-carreira', 'porteuse-de-cruches', 'gerboise-des-ruines']);
  assert.ok(rpgResoudreRenfortChoisi(d, 'joueur', choix.find(c => c.id === 'porteuse-de-cruches').index).ok);
  assert.deepEqual(d.joueur.deck, ['gerboise-des-ruines', 'pilote-de-la-carreira', 'chien-du-guet']);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'porteuse-de-cruches'));
});

test('Ralliement des neiges laisse choisir une créature de coût 5 depuis la main', () => {
  const d = duel(); const valkyrie = poser(d, 'joueur', 'valkyrie-au-corbeau');
  d.joueur.main.push('ifrit-des-ergs', 'chien-du-guet');
  assert.ok(rpgActiverCapacite(d, 'joueur', valkyrie.id).ok);
  const choix = rpgCartesRenfortChoisi(d, 'joueur');
  assert.ok(choix.some(c => c.id === 'ifrit-des-ergs' && c.admissible));
  assert.ok(rpgResoudreRenfortChoisi(d, 'joueur', choix.find(c => c.id === 'ifrit-des-ergs').index).ok);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'ifrit-des-ergs'));
});

for (const [id, admissible, refuse] of [
  ['souverain-de-la-lune-noire', 'chien-du-guet', null],
  ['gardienne-des-derniers-noms', 'gardienne-de-la-balance', 'chien-du-guet'],
]) test(`réanimation par ${id} : choix contrôlé au cimetière`, () => {
  const d = duel(); const source = poser(d, 'joueur', id); d.renfortChoixEnAttente = null;
  d.joueur.cimetiere = [admissible, ...(refuse ? [refuse] : [])];
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id).ok);
  const choix = rpgCartesRenfortChoisi(d, 'joueur');
  assert.ok(choix.some(c => c.id === admissible && c.admissible));
  if (refuse) assert.ok(!choix.some(c => c.id === refuse && c.admissible));
  assert.ok(rpgResoudreRenfortChoisi(d, 'joueur', choix.find(c => c.id === admissible).index).ok);
  assert.ok(d.joueur.creatures.some(e => e.carteId === admissible));
  assert.ok(!d.joueur.cimetiere.includes(admissible));
});

for (const cote of ['joueur', 'sorcier']) test(`PvP : le siège ${cote} choisit son Ralliement`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const valkyrie = poser(d, cote, 'valkyrie-au-corbeau'); d.tour = cote;
  d[cote].main.push('ifrit-des-ergs');
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: valkyrie.id }).ok);
  const choix = rpgCartesRenfortChoisi(d, cote).find(c => c.id === 'ifrit-des-ergs');
  assert.ok(choix?.admissible);
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'choisir-renfort', index: choix.index }).ok);
  assert.ok(d[cote].creatures.some(e => e.carteId === 'ifrit-des-ergs'));
});

test('l’IA invoque un renfort choisi, mais ne dépense rien sans candidat', () => {
  const d = duel(); const valkyrie = poser(d, 'sorcier', 'valkyrie-au-corbeau'); d.tour = 'sorcier';
  d.sorcier.main = ['chien-du-guet'];
  assert.equal(choisirActivationIA(d, 'sorcier'), null);
  d.sorcier.main = ['ifrit-des-ergs'];
  assert.equal(choisirActivationIA(d, 'sorcier')?.entiteId, valkyrie.id);
  assert.ok(rpgActiverCapacite(d, 'sorcier', valkyrie.id).ok);
  assert.ok(d.sorcier.creatures.some(e => e.carteId === 'ifrit-des-ergs'));
  assert.ok(!d.renfortChoixEnAttente, 'l’IA résout son propre choix');
});

for (const [id, sort, forme, montant] of [
  ['susanoo', 'nuage-de-cendres', 'carre', 2],
  ['tengu-du-mont-ardent', 'vent-rouge', 'colonne', 2],
  ['faucon-du-zenith', 'tempete-de-sable', 'rangee', 3],
  ['veilleuse-de-la-lune-givree', 'brume-du-fjord', 'rangee', 1],
  ['geant-des-banquises', 'hurlement-du-blizzard', 'colonne', 2],
  ['le-cavalier-du-ressac-gele', 'verglas', 'carre', 2],
  ['pere-des-corbeaux', 'tempete-de-foudre-et-de-givre', 'colonne', 3],
]) test(`${sort} : une zone choisie, sans Lien ni dégâts hors zone`, () => {
  const d = duel(); const source = poser(d, 'joueur', id);
  const cible = poser(d, 'sorcier', 'kraken');
  const loin = poser(d, 'sorcier', 'seigneur-des-machoires');
  source.emplacement = 7; cible.emplacement = 0; loin.emplacement = 6;
  const zone = forme === 'colonne' ? { forme, colonne: 0 }
    : forme === 'carre' ? { forme, camp: 'sorcier', colonne: 0 }
      : { forme, camp: 'sorcier', ligne: 'front' };
  const avant = [cible.pv, loin.pv];
  assert.deepEqual(cardById(id).activation.effet, magieById(sort).effet);
  const res = rpgActiverCapacite(d, 'joueur', source.id, null, { zone });
  assert.ok(res.ok, JSON.stringify(res));
  assert.equal(cible.pv, avant[0] - montant, 'effet de base, pas de Lien');
  assert.equal(loin.pv, avant[1], 'la seconde créature est hors zone');
  assert.match(texteActivation(cardById(id)), /rangée|colonne|carré/u);
  assert.equal(source.activationUtiliseeMatch, true);
  if (sort === 'verglas') assert.ok(cible.gelToursRestants > 0);
  if (sort === 'nuage-de-cendres') assert.equal(d.sorcier.degatsEchos.at(-1)?.amount, 1);
});

test('la Tempête du Père peut atteindre sa source dans la colonne choisie', () => {
  const d = duel(); const pere = poser(d, 'joueur', 'pere-des-corbeaux');
  const cible = poser(d, 'sorcier', 'kraken'); pere.emplacement = 0; cible.emplacement = 5;
  const avant = pere.pv;
  assert.ok(rpgActiverCapacite(d, 'joueur', pere.id, null, { zone: { forme: 'colonne', colonne: 0 } }).ok);
  assert.equal(pere.pv, avant - 3);
});

test('une zone mal formée ou de mauvaise forme ne dépense pas la capacité', () => {
  for (const zone of [{ forme: 'colonne', colonne: 0 }, { forme: 'carre', camp: 'sorcier', colonne: 999 }]) {
    const d = duel(); const faucon = poser(d, 'joueur', 'faucon-du-zenith');
    assert.equal(rpgActiverCapacite(d, 'joueur', faucon.id, null, { zone }).raison, 'zone');
    assert.ok(!faucon.activationUtiliseeMatch);
  }
});

for (const cote of ['joueur', 'sorcier']) test(`PvP : zone explicite transmise à l’arbitre par ${cote}`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const adversaire = cote === 'joueur' ? 'sorcier' : 'joueur';
  const source = poser(d, cote, 'faucon-du-zenith'); const cible = poser(d, adversaire, 'kraken');
  d.tour = cote; cible.emplacement = 0; const pv = cible.pv;
  const zone = { forme: 'rangee', camp: adversaire, ligne: 'front' };
  const res = rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: source.id, zone });
  assert.ok(res.ok, JSON.stringify(res)); assert.equal(cible.pv, pv - 3);
});

test('l’IA choisit une zone qui atteint une adversaire plutôt que ses propres créatures', () => {
  const d = duel(); const pere = poser(d, 'sorcier', 'pere-des-corbeaux');
  const ami = poser(d, 'sorcier', 'kraken'); const cible = poser(d, 'joueur', 'kraken');
  pere.emplacement = 3; ami.emplacement = 1; cible.emplacement = 0; d.tour = 'sorcier';
  assert.equal(rpgPeutActiverCapacite(d, 'sorcier', pere.id), true);
  const choix = choisirActivationIA(d, 'sorcier');
  assert.equal(choix?.entiteId, pere.id); assert.deepEqual(choix?.zone, { forme: 'colonne', colonne: 0 });
});

test('Conquête : une activation de zone est refusée sans consommation', () => {
  const d = duel(); const source = poser(d, 'joueur', 'susanoo'); d.moba = {};
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', source.id), false);
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null).raison, 'zone-voie-non-pris-en-charge');
  assert.ok(!source.activationUtiliseeMatch);
});

test('Nuage de cendres : son écho retombe au prochain tour du lanceur, sur tout le camp adverse', () => {
  const d = duel(); const source = poser(d, 'joueur', 'susanoo');
  const cible = poser(d, 'sorcier', 'kraken'); const loin = poser(d, 'sorcier', 'seigneur-des-machoires');
  cible.emplacement = 0; loin.emplacement = 3;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } }).ok);
  const pv = [cible.pv, loin.pv];
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(cible.pv, pv[0] - 1); assert.equal(loin.pv, pv[1] - 1);
});

test('une capacité de zone ne crée pas de fausse fenêtre ciblée avec un cibleId superflu', () => {
  const d = duel(); const source = poser(d, 'joueur', 'faucon-du-zenith'); const cible = poser(d, 'sorcier', 'kraken');
  d.pvp = true; d.sorcier.main.push('trait-de-braise'); const pv = cible.pv;
  const res = rpgActiverCapacite(d, 'joueur', source.id, cible.id, { attendreReponse: true, zone: { forme: 'rangee', camp: 'sorcier', ligne: 'front' } });
  assert.ok(res.ok); assert.ok(!res.effetEnAttente); assert.equal(cible.pv, pv - 3);
});

test('zone automatique : une vague adverse ne pénalise pas les alliés qu’elle ne touche pas', () => {
  const d = duel(); const source = poser(d, 'joueur', 'tengu-du-mont-ardent');
  const ami = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  source.emplacement = 3; ami.emplacement = 0; cible.emplacement = 0;
  const pv = [ami.pv, cible.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null).ok);
  assert.equal(ami.pv, pv[0]); assert.equal(cible.pv, pv[1] - 2);
});

test('les projectiles de la zone ne montrent que les créatures atteintes, y compris la source de la tempête', () => {
  const d = duel(); const source = poser(d, 'joueur', 'pere-des-corbeaux');
  const cible = poser(d, 'sorcier', 'kraken'); const loin = poser(d, 'sorcier', 'seigneur-des-machoires');
  source.emplacement = 0; cible.emplacement = 0; loin.emplacement = 2;
  const seq = d.combatAnimationSeq ?? 0;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'colonne', colonne: 0 } }).ok);
  const ids = (d.combatAnimations ?? []).filter(a => a.id > seq && a.type === 'projectile-combat' && a.source?.entiteId === source.id).map(a => a.cible?.entiteId);
  assert.ok(ids.includes(source.id)); assert.ok(ids.includes(cible.id)); assert.ok(!ids.includes(loin.id));
});

for (const id of ['veilleuse-de-la-lune-givree', 'geant-des-banquises']) test(`${id} : le gel à 15 % dépend du hasard`, () => {
  for (const [rng, gele] of [[() => 0, true], [() => 0.9, false]]) {
    const d = duel(rng); const source = poser(d, 'joueur', id); const cible = poser(d, 'sorcier', 'kraken');
    cible.emplacement = 0;
    const forme = id === 'geant-des-banquises' ? 'colonne' : 'rangee';
    const zone = forme === 'colonne' ? { forme, colonne: 0 } : { forme, camp: 'sorcier', ligne: 'front' };
    assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone }).ok);
    assert.equal(cible.gelToursRestants > 0, gele);
  }
});

test('PvP : zone invalide rejetée avant toute dépense', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'faucon-du-zenith');
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: source.id,
    zone: { forme: 'rangee', camp: 'sorcier', ligne: 'ailleurs' } });
  assert.equal(res.raison, 'zone'); assert.ok(!source.activationUtiliseeMatch); assert.ok(source.ready);
});

test('Ressac du Traqueur : rangée choisie, Vampires épargnés, autres créatures renvoyées', () => {
  const d = duel(); const source = poser(d, 'joueur', 'traqueur-des-nuits-sans-lune');
  const cible = poser(d, 'sorcier', 'kraken');
  const vampire = poser(d, 'sorcier', 'novice-des-cendres');
  const dehors = poser(d, 'sorcier', 'seigneur-des-machoires');
  cible.emplacement = 0; vampire.emplacement = 1; dehors.emplacement = 4;
  const avant = [...d.sorcier.main];
  assert.deepEqual(cardById(source.carteId).activation.effet, magieById('ressac-de-la-lune-noire').effet);
  const res = rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'rangee', camp: 'sorcier', ligne: 'front' } });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
  assert.ok(d.sorcier.creatures.some(e => e.id === vampire.id));
  assert.ok(d.sorcier.creatures.some(e => e.id === dehors.id));
  assert.equal(d.sorcier.main.length, avant.length + 1); assert.ok(d.sorcier.main.includes(cible.carteId));
  assert.ok(!d.sorcier.cimetiere.includes(cible.carteId));
  assert.match(texteActivation(cardById(source.carteId)), /rangée.*Vampires/u);
});

test('Neige noire : prix 3 PV, destruction limitée au carré puis gel des survivantes', () => {
  const d = duel(); const source = poser(d, 'joueur', 'valkyrie-des-neuf-nuits');
  const faible = poser(d, 'sorcier', 'chien-du-guet'); const forte = poser(d, 'sorcier', 'kraken');
  const dehors = poser(d, 'sorcier', 'seigneur-des-machoires');
  faible.emplacement = 0; forte.emplacement = 1; dehors.emplacement = 2;
  const pv = d.joueur.pv;
  assert.deepEqual(cardById(source.carteId).activation.effet, magieById('neige-noire').effet);
  const res = rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } });
  assert.ok(res.ok, JSON.stringify(res)); assert.equal(d.joueur.pv, pv - 3);
  assert.ok(!d.sorcier.creatures.some(e => e.id === faible.id));
  assert.ok(d.sorcier.cimetiere.includes(faible.carteId)); assert.ok(forte.gelToursRestants > 0);
  assert.equal(dehors.gelToursRestants, 0);
  assert.match(texteActivation(cardById(source.carteId)), /Payez 3 PV.*carré.*coût 3.*gelez/u);
});

test('Neige noire touche aussi la source et les autres alliés dans le carré choisi', () => {
  const d = duel(); const source = poser(d, 'joueur', 'valkyrie-des-neuf-nuits');
  const faible = poser(d, 'joueur', 'chien-du-guet'); source.emplacement = 0; faible.emplacement = 1;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'joueur', colonne: 0 } }).ok);
  assert.ok(source.gelToursRestants > 0); assert.ok(!d.joueur.creatures.some(e => e.id === faible.id));
});

test('Neige noire : prix insuffisant et zone invalide ne dépensent rien', () => {
  const d = duel(); const source = poser(d, 'joueur', 'valkyrie-des-neuf-nuits'); d.joueur.pv = 3;
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null).raison, 'prix-pv');
  assert.equal(d.joueur.pv, 3); assert.ok(source.ready); assert.ok(!source.activationUtiliseeMatch);
  d.joueur.pv = 10;
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'rangee', camp: 'joueur', ligne: 'front' } }).raison, 'zone');
  assert.equal(d.joueur.pv, 10); assert.ok(source.ready); assert.ok(!source.activationUtiliseeMatch);
});

for (const [id, forme] of [['valkyrie-des-neuf-nuits', 'carre'], ['traqueur-des-nuits-sans-lune', 'rangee']]) {
  test(`IA : ${id} choisit une zone adverse rentable`, () => {
    const d = duel(); const source = poser(d, 'sorcier', id); const cible = poser(d, 'joueur', 'chien-du-guet');
    source.emplacement = 3; cible.emplacement = 0; d.tour = 'sorcier';
    const choix = choisirActivationIA(d, 'sorcier');
    assert.equal(choix?.entiteId, source.id); assert.equal(choix.zone.forme, forme); assert.equal(choix.zone.camp, 'joueur');
    assert.ok(rpgActiverCapacite(d, 'sorcier', source.id, null, { zone: choix.zone }).ok);
    assert.ok(!d.joueur.creatures.some(e => e.id === cible.id));
  });
}

for (const [id, forme] of [['valkyrie-des-neuf-nuits', 'carre'], ['traqueur-des-nuits-sans-lune', 'rangee']]) {
  test(`PvP : ${id} transmet sa zone au siège sorcier`, () => {
    const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
    const source = poser(d, 'sorcier', id); const cible = poser(d, 'joueur', 'chien-du-guet');
    d.tour = 'sorcier'; cible.emplacement = 0;
    const zone = forme === 'carre' ? { forme, camp: 'joueur', colonne: 0 } : { forme, camp: 'joueur', ligne: 'front' };
    assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'activer', capacite: true, entiteId: source.id, zone }).ok);
    assert.ok(!d.joueur.creatures.some(e => e.id === cible.id));
  });
}

test('Neige noire : bouclier adverse bloque destruction et gel, mais pas les autres victimes', () => {
  const d = duel(); const source = poser(d, 'joueur', 'valkyrie-des-neuf-nuits');
  const protegee = poser(d, 'sorcier', 'chien-du-guet'); const cible = poser(d, 'sorcier', 'novice-des-cendres');
  protegee.emplacement = 0; cible.emplacement = 1; protegee.bouclier = 1;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } }).ok);
  assert.ok(d.sorcier.creatures.some(e => e.id === protegee.id));
  assert.equal(protegee.bouclier, 0); assert.equal(protegee.gelToursRestants, 0);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});

test('Ressac : le Traqueur Vampire est épargné dans sa propre rangée', () => {
  const d = duel(); const source = poser(d, 'joueur', 'traqueur-des-nuits-sans-lune');
  const ami = poser(d, 'joueur', 'chien-du-guet'); source.emplacement = 0; ami.emplacement = 1;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'rangee', camp: 'joueur', ligne: 'front' } }).ok);
  assert.ok(d.joueur.creatures.some(e => e.id === source.id));
  assert.ok(!d.joueur.creatures.some(e => e.id === ami.id)); assert.ok(d.joueur.main.includes(ami.carteId));
  const animations = (d.combatAnimations ?? []).filter(a => a.type === 'projectile-combat' && a.source?.entiteId === source.id);
  assert.ok(!animations.some(a => a.cible?.entiteId === source.id));
  assert.ok(animations.some(a => a.cible?.entiteId === ami.id));
});

test('Neige noire et Ressac ne sont pas disponibles en Conquête sans choix de voie', () => {
  for (const id of ['valkyrie-des-neuf-nuits', 'traqueur-des-nuits-sans-lune']) {
    const d = duel(); const source = poser(d, 'joueur', id); d.moba = {}; const pv = d.joueur.pv;
    assert.equal(rpgPeutActiverCapacite(d, 'joueur', source.id), false);
    const res = rpgActiverCapacite(d, 'joueur', source.id, null);
    assert.ok(['prix-voie-non-pris-en-charge', 'zone-voie-non-pris-en-charge'].includes(res.raison));
    assert.equal(d.joueur.pv, pv); assert.ok(source.ready); assert.ok(!source.activationUtiliseeMatch);
  }
});

test('le texte explique qu’une nouvelle présence peut utiliser sa capacité', () => {
  assert.match(texteActivation(cardById('valkyrie-des-neuf-nuits')), /^Neige noire — /u);
});

test('la zone automatique de Ressac ignore les Vampires et évite de renvoyer les alliés', () => {
  const d = duel(); const source = poser(d, 'joueur', 'traqueur-des-nuits-sans-lune');
  const ami = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'chien-du-guet');
  source.emplacement = 0; ami.emplacement = 1; cible.emplacement = 0;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null).ok);
  assert.ok(d.joueur.creatures.some(e => e.id === ami.id));
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});

test('la zone automatique de Neige noire choisit les proies plutôt que la source', () => {
  const d = duel(); const source = poser(d, 'joueur', 'valkyrie-des-neuf-nuits');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); source.emplacement = 0; cible.emplacement = 0;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null).ok);
  assert.equal(source.gelToursRestants, 0); assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});

test('IA : pas de Neige noire sans proie ni avec un prix PV impayable', () => {
  const d = duel(); const source = poser(d, 'sorcier', 'valkyrie-des-neuf-nuits');
  source.emplacement = 0; d.tour = 'sorcier';
  assert.equal(choisirActivationIA(d, 'sorcier'), null);
  poser(d, 'joueur', 'chien-du-guet'); d.sorcier.pv = 3;
  assert.equal(choisirActivationIA(d, 'sorcier'), null);
  assert.ok(!source.activationUtiliseeMatch);
});

test('Mémoire de la Chercheuse : choix explicite du porteur et de l’arme, sans lancer le sort', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.cimetiere.push('javelot-du-beffroi', 'sabre-maudit', 'javelot-du-beffroi');
  const attaque = porteur.atk;
  assert.deepEqual(cardById(source.carteId).activation.effet, magieById('memoire-de-l-armurerie').effet);
  assert.ok(rpgPeutActiverCapacite(d, 'joueur', source.id));
  const res = rpgActiverCapacite(d, 'joueur', source.id, porteur.id, { armeCarteId: 'javelot-du-beffroi' });
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(source.activationUtiliseeMatch); assert.equal(source.ready, false);
  assert.equal(porteur.atk, attaque + 2); assert.ok(porteur.coupRapide);
  assert.equal(d.joueur.cimetiere.filter(id => id === 'javelot-du-beffroi').length, 1);
  assert.ok(d.joueur.cimetiere.includes('sabre-maudit')); assert.ok(!d.joueur.cimetiere.includes('memoire-de-l-armurerie'));
  assert.match(texteActivation(cardById(source.carteId)), /arme choisie.*cimetière/u);
});

test('Mémoire : le Sabre maudit, arme-magie, s’équipe avec ses effets normaux', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'joueur', 'kraken'); d.joueur.cimetiere.push('sabre-maudit');
  const avant = { atk: porteur.atk, def: porteur.def };
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, porteur.id, { armeCarteId: 'sabre-maudit' }).ok);
  assert.equal(porteur.atk, avant.atk + 2); assert.equal(porteur.def, avant.def - 1);
  assert.ok(porteur.volDeVie); assert.ok(porteur.armes.includes('sabre-maudit'));
});

test('Mémoire : arme absente ou illégale et cible adverse ne consomment rien', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'joueur', 'chien-du-guet'); const ennemi = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', source.id), false);
  d.joueur.cimetiere.push('chien-du-guet', 'javelot-du-beffroi');
  for (const [cible, arme, raison] of [[porteur.id, null, 'arme-cimetiere'], [porteur.id, 'chien-du-guet', 'arme-cimetiere'], [porteur.id, 'sabre-maudit', 'arme-cimetiere'], [ennemi.id, 'javelot-du-beffroi', 'cible']]) {
    const res = rpgActiverCapacite(d, 'joueur', source.id, cible, { armeCarteId: arme });
    assert.equal(res.raison, raison); assert.ok(!source.activationUtiliseeMatch); assert.ok(source.ready);
    assert.ok(d.joueur.cimetiere.includes('javelot-du-beffroi'));
  }
});

for (const cote of ['joueur', 'sorcier']) test(`PvP : Mémoire de la Chercheuse choisit l’arme du siège ${cote}`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, cote, 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, cote, 'kraken'); d[cote].cimetiere.push('sabre-maudit'); d.tour = cote;
  const res = rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: source.id, cibleId: porteur.id, armeCarteId: 'sabre-maudit' });
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(porteur.armes.includes('sabre-maudit')); assert.ok(!d[cote].cimetiere.includes('sabre-maudit'));
});

test('PvP : une arme choisie dans le cimetière adverse est refusée', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies'); d.sorcier.cimetiere.push('sabre-maudit');
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: source.id, cibleId: source.id, armeCarteId: 'sabre-maudit' });
  assert.equal(res.raison, 'arme-cimetiere'); assert.ok(!source.activationUtiliseeMatch); assert.ok(d.sorcier.cimetiere.includes('sabre-maudit'));
});

test('IA : la Chercheuse choisit une arme du cimetière et une alliée légale', () => {
  const d = duel(); const source = poser(d, 'sorcier', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'sorcier', 'kraken'); d.sorcier.cimetiere.push('javelot-du-beffroi'); d.tour = 'sorcier';
  const choix = choisirActivationIA(d, 'sorcier');
  assert.equal(choix?.entiteId, source.id); assert.equal(choix?.cibleId, porteur.id); assert.equal(choix?.armeCarteId, 'javelot-du-beffroi');
  assert.ok(rpgActiverCapacite(d, 'sorcier', source.id, choix.cibleId, { armeCarteId: choix.armeCarteId }).ok);
  assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
});

test('Conquête : la récupération d’une arme activée est refusée sans choix de voie', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  d.joueur.cimetiere.push('javelot-du-beffroi'); d.moba = {};
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', source.id), true);
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, source.id, { armeCarteId: 'javelot-du-beffroi' }).raison, 'adaptateur-voie');
  assert.ok(!source.activationUtiliseeMatch); assert.ok(d.joueur.cimetiere.includes('javelot-du-beffroi'));
});

test('Mémoire : les blessures liées à l’arme et les morts sont résolues', () => {
  for (const arme of ['hache-de-la-banquise', 'sabre-maudit']) {
    const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
    const cible = poser(d, 'joueur', 'chien-du-guet'); cible.pv = 1; cible.def = 1;
    d.joueur.cimetiere.push(arme);
    assert.ok(rpgActiverCapacite(d, 'joueur', source.id, cible.id, { armeCarteId: arme }).ok);
    assert.ok(!d.joueur.creatures.some(e => e.id === cible.id), arme);
    assert.ok(d.joueur.cimetiere.includes(arme), arme);
  }
});

test('la carte Mémoire de l’armurerie retirée ne peut plus être jouée', () => {
  const d = duel(); const porteur = poser(d, 'joueur', 'kraken');
  d.joueur.cimetiere.push('sabre-maudit'); d.joueur.main.push('memoire-de-l-armurerie');
  assert.equal(rpgLancerMagie(d, 'joueur', 'memoire-de-l-armurerie', porteur.id, 'sabre-maudit').raison, 'sort-transfere');
  assert.ok(!(porteur.armes ?? []).includes('sabre-maudit')); assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
  assert.ok(d.joueur.main.includes('memoire-de-l-armurerie'));
});

test('Mémoire : un mur ne peut pas être choisi comme porteur', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'joueur', 'chien-du-guet'); porteur.mur = true;
  d.joueur.cimetiere.push('sabre-maudit');
  assert.ok(!rpgCiblesActivationLegales(d, 'joueur', source.id).includes(porteur.id));
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, porteur.id, { armeCarteId: 'sabre-maudit' }).raison, 'cible');
  assert.ok(!source.activationUtiliseeMatch); assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
});

test('l’exécution réelle de l’IA transmet le choix de l’arme', () => {
  const d = duel(); const source = poser(d, 'sorcier', 'chercheuse-des-armes-ensevelies');
  const porteur = poser(d, 'sorcier', 'kraken'); d.sorcier.cimetiere.push('javelot-du-beffroi'); d.tour = 'sorcier';
  const res = rpgSorcierActiverCapacitesIA(d);
  assert.ok(res.some(r => r.ok)); assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
  assert.ok(source.activationUtiliseeMatch);
});

test('la Chercheuse peut s’équiper elle-même, sans réutiliser sa capacité', () => {
  const d = duel(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies');
  d.joueur.cimetiere.push('javelot-du-beffroi', 'sabre-maudit');
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, source.id, { armeCarteId: 'javelot-du-beffroi' }).ok);
  assert.equal(source.arme?.carteId, 'javelot-du-beffroi');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, source.id, { armeCarteId: 'sabre-maudit' }).raison, 'deja-activee');
  assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
});

test('IA : la Chercheuse ne sacrifie pas son porteur à une arme mortelle', () => {
  const d = duel(); const source = poser(d, 'sorcier', 'chercheuse-des-armes-ensevelies');
  source.pv = 1; d.sorcier.cimetiere.push('hache-de-la-banquise'); d.tour = 'sorcier';
  assert.equal(choisirActivationIA(d, 'sorcier'), null);
  assert.ok(!source.activationUtiliseeMatch);
});

test('Défi activé : les champions choisis s’infligent leurs dégâts simultanément', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'chien-du-guet'); const ennemi = poser(d, 'sorcier', 'chien-du-guet');
  champion.atk = ennemi.atk = 3; champion.pv = ennemi.pv = 2;
  assert.deepEqual(cardById(jarl.carteId).activation.effet, magieById('defi-du-jarl').effet);
  assert.deepEqual(rpgChampionsActivationLegales(d, 'joueur', jarl.id), [jarl.id, champion.id]);
  assert.deepEqual(rpgCiblesActivationLegales(d, 'joueur', jarl.id), [ennemi.id]);
  const res = rpgActiverCapacite(d, 'joueur', jarl.id, ennemi.id, { championId: champion.id });
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(jarl.activationUtiliseeMatch); assert.equal(jarl.ready, false);
  assert.ok(!d.joueur.creatures.some(e => e.id === champion.id));
  assert.ok(!d.sorcier.creatures.some(e => e.id === ennemi.id));
  assert.ok(d.joueur.creatures.some(e => e.id === jarl.id));
  assert.match(texteActivation(cardById(jarl.carteId)), /alliée choisie.*adverse choisie/u);
});

test('Défi activé : le Jarl lui-même peut être le champion', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const ennemi = poser(d, 'sorcier', 'chien-du-guet'); const vie = jarl.pv;
  assert.ok(rpgActiverCapacite(d, 'joueur', jarl.id, ennemi.id, { championId: jarl.id }).ok);
  assert.equal(jarl.pv, vie - ennemi.atk); assert.ok(!d.sorcier.creatures.some(e => e.id === ennemi.id));
});

test('Défi activé : désignations invalides refusées sans consommation', () => {
  for (const variante of ['champion-absent', 'champion-adverse', 'cible-alliee', 'cible-absente', 'champion-protege']) {
    const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
    const champion = poser(d, 'joueur', 'chien-du-guet'); const ennemi = poser(d, 'sorcier', 'chien-du-guet');
    if (variante === 'champion-protege') champion.carteId = 'source-de-bimini';
    const cible = variante === 'cible-alliee' ? champion.id : variante === 'cible-absente' ? 'absent' : ennemi.id;
    const choisi = variante === 'champion-adverse' ? ennemi.id : variante === 'champion-absent' ? null : champion.id;
    const res = rpgActiverCapacite(d, 'joueur', jarl.id, cible, { championId: choisi });
    assert.equal(res.ok, false, variante); assert.ok(!jarl.activationUtiliseeMatch, variante); assert.ok(jarl.ready, variante);
  }
  const vide = duel(); const jarl = poser(vide, 'joueur', 'jarl-au-marteau-de-guerre');
  assert.equal(rpgPeutActiverCapacite(vide, 'joueur', jarl.id), false);
});

for (const element of ['source', 'champion', 'cible', 'aucun']) test(`PvP : défi en réponse, retrait de ${element}`, () => {
  let d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  champion.atk = cible.atk = 2; d.sorcier.main.push('trait-de-braise');
  const attaque = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: champion.id });
  assert.ok(attaque.ok); assert.equal(d.effetCreatureEnAttente?.championId, champion.id); assert.ok(jarl.activationUtiliseeMatch);
  d = JSON.parse(JSON.stringify(d));
  if (element === 'source') d.joueur.creatures = d.joueur.creatures.filter(e => e.id !== jarl.id);
  if (element === 'champion') d.joueur.creatures = d.joueur.creatures.filter(e => e.id !== champion.id);
  if (element === 'cible') d.sorcier.creatures = d.sorcier.creatures.filter(e => e.id !== cible.id);
  const pvA = d.joueur.creatures.find(e => e.id === champion.id)?.pv;
  const pvB = d.sorcier.creatures.find(e => e.id === cible.id)?.pv;
  const res = rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' });
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(!d.effetCreatureEnAttente);
  if (element === 'source' || element === 'aucun') {
    assert.equal(d.joueur.creatures.find(e => e.id === champion.id).pv, pvA - 2);
    assert.equal(d.sorcier.creatures.find(e => e.id === cible.id).pv, pvB - 2);
  } else if (element === 'champion') assert.equal(d.sorcier.creatures.find(e => e.id === cible.id).pv, pvB);
  else assert.equal(d.joueur.creatures.find(e => e.id === champion.id).pv, pvA);
});

for (const cote of ['joueur', 'sorcier']) test(`PvP : le siège ${cote} désigne ses deux combattants`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur'; const jarl = poser(d, cote, 'jarl-au-marteau-de-guerre');
  const champion = poser(d, cote, 'kraken'); const cible = poser(d, adv, 'chien-du-guet'); d.tour = cote;
  const res = rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: champion.id });
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(!d[adv].creatures.some(e => e.id === cible.id));
});

test('Défi activé : le bouclier adverse intercepte le défi entier', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken'); cible.bouclier = 1;
  const avant = [champion.pv, cible.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', jarl.id, cible.id, { championId: champion.id }).ok);
  assert.equal(cible.bouclier, 0); assert.equal(champion.pv, avant[0]); assert.equal(cible.pv, avant[1]);
});

test('IA : le Jarl choisit un duel favorable et transmet son champion', () => {
  const d = duel(); const jarl = poser(d, 'sorcier', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'sorcier', 'kraken'); const cible = poser(d, 'joueur', 'chien-du-guet'); d.tour = 'sorcier'; jarl.pv = 1;
  const choix = choisirActivationIA(d, 'sorcier');
  assert.equal(choix?.entiteId, jarl.id); assert.equal(choix?.championId, champion.id); assert.equal(choix?.cibleId, cible.id);
  assert.ok(rpgSorcierActiverCapacitesIA(d).some(r => r.ok)); assert.ok(!d.joueur.creatures.some(e => e.id === cible.id));
});

test('Conquête : le défi activé est refusé sans sélection de voie', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre'); const cible = poser(d, 'sorcier', 'chien-du-guet'); d.moba = {};
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', jarl.id), true);
  assert.equal(rpgActiverCapacite(d, 'joueur', jarl.id, cible.id, { championId: jarl.id }).raison, 'adaptateur-voie');
  assert.ok(!jarl.activationUtiliseeMatch);
});

test('PvP : une magie rapide tue le Jarl en réponse, mais le champion et sa cible combattent quand même', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre'); jarl.pv = 1;
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  champion.atk = cible.atk = 2; d.sorcier.main.push('trait-de-braise');
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: champion.id }).ok);
  const reponse = rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'trait-de-braise', cibleId: jarl.id });
  assert.ok(reponse.ok, JSON.stringify(reponse)); assert.ok(!d.joueur.creatures.some(e => e.id === jarl.id));
  const avant = [champion.pv, cible.pv]; assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok);
  assert.equal(champion.pv, avant[0] - 2); assert.equal(cible.pv, avant[1] - 2);
});

test('PvP : une parade rapide bloque le défi annoncé sans toucher au champion', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  d.sorcier.main.push('parade-du-verre');
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: champion.id }).ok);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'parade-du-verre', cibleId: cible.id }).ok);
  const avant = [champion.pv, cible.pv]; assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok);
  assert.equal(cible.bouclier, 0); assert.equal(champion.pv, avant[0]); assert.equal(cible.pv, avant[1]); assert.ok(jarl.activationUtiliseeMatch);
});

test('la Contre-attaque sur le défi frappe sa source, pas le champion désigné', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  cible.contreAttaque = true; cible.atk = 1; cible.pv = 30;
  const pv = [jarl.pv, champion.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', jarl.id, cible.id, { championId: champion.id }).ok);
  assert.equal(jarl.pv, pv[0] - 1); assert.equal(champion.pv, pv[1] - 1);
});

test('Défi ciblant Boualem : la redirection conserve le champion, sans le désigner lui-même', () => {
  const d = duel(); const jarl = poser(d, 'sorcier', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'sorcier', 'kraken'); const boualem = poser(d, 'joueur', 'boualem');
  const autre = poser(d, 'joueur', 'kraken'); d.tour = 'sorcier';
  champion.atk = autre.atk = 2;
  const res = rpgActiverCapacite(d, 'sorcier', jarl.id, boualem.id, { championId: champion.id });
  assert.ok(res.ok); assert.equal(d.boualemEnAttente?.sauf, champion.id);
  assert.equal(rpgResoudreContresortBoualem(d, 'joueur', champion.id).raison, 'cible');
  const avant = [champion.pv, autre.pv];
  assert.ok(rpgResoudreContresortBoualem(d, 'joueur', autre.id).ok);
  assert.equal(champion.pv, avant[0] - 2); assert.equal(autre.pv, avant[1] - 2);
});

test('PvP : un Ressac rapide qui renvoie le champion dissipe le défi payé', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  d.sorcier.main.push('ressac');
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: champion.id }).ok);
  const reponse = rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'ressac', cibleId: champion.id });
  assert.ok(reponse.ok, JSON.stringify(reponse)); assert.ok(!d.joueur.creatures.some(e => e.id === champion.id));
  const vie = cible.pv; assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok);
  assert.equal(cible.pv, vie); assert.ok(jarl.activationUtiliseeMatch);
});

test('le Défi activé conserve les blessures simultanées de ses combattants', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  champion.atk = 3; cible.atk = 2; const avant = [champion.pv, cible.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', jarl.id, cible.id, { championId: champion.id }).ok);
  assert.deepEqual([champion.pv, cible.pv], [avant[0] - 2, avant[1] - 3]);
});

test('un champion gelé ne frappe pas dans le défi, mais subit le coup adverse', () => {
  const d = duel(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre');
  const champion = poser(d, 'joueur', 'kraken'); const cible = poser(d, 'sorcier', 'kraken');
  champion.gelToursRestants = 1; cible.atk = 2; const avant = [champion.pv, cible.pv];
  assert.ok(rpgActiverCapacite(d, 'joueur', jarl.id, cible.id, { championId: champion.id }).ok);
  assert.equal(champion.pv, avant[0] - 2); assert.equal(cible.pv, avant[1]);
});

test('IA : pas de défi inutile si son champion serait sacrifié sans effet', () => {
  const d = duel(); const jarl = poser(d, 'sorcier', 'jarl-au-marteau-de-guerre');
  const cible = poser(d, 'joueur', 'kraken'); d.tour = 'sorcier'; jarl.atk = 1; jarl.pv = 1; cible.atk = 8;
  assert.equal(choisirActivationIA(d, 'sorcier'), null); assert.ok(!jarl.activationUtiliseeMatch);
});

test('PvP : un champion adverse est refusé avant l’annonce du défi', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre'); const cible = poser(d, 'sorcier', 'chien-du-guet');
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: jarl.id, cibleId: cible.id, championId: cible.id });
  assert.equal(res.raison, 'champion'); const source = d.joueur.creatures.find(e => e.id === jarl.id);
  assert.ok(!source.activationUtiliseeMatch); assert.ok(source.ready); assert.ok(!d.effetCreatureEnAttente);
});

test('Feux de kitsune appartient à l’Oni et conserve les deux choix sans Lien', () => {
  const carte = cardById('oni-de-la-fournaise');
  assert.equal(carte.activation.sortAssocie, 'feux-de-kitsune');
  assert.deepEqual(carte.activation.effet, magieById('feux-de-kitsune').effet);
  assert.match(texteActivation(carte), /4 dégâts.*2 dégâts.*deux créatures/);
  for (const partage of [false, true]) {
    const d = duel(); const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
    const a = poser(d, 'sorcier', 'seigneur-des-machoires');
    const b = poser(d, 'sorcier', 'manticore-des-dunes');
    const vieA = a.pv, vieB = b.pv;
    const result = rpgActiverCapacite(d, 'joueur', oni.id, a.id, { cibleSecondaireId: partage ? b.id : null });
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(a.pv, vieA - (partage ? 2 : 4));
    assert.equal(b.pv, vieB - (partage ? 2 : 0));
    assert.equal(oni.activationUtiliseeMatch, true);
    assert.equal(rpgActiverCapacite(d, 'joueur', oni.id, a.id).raison, 'deja-activee');
  }
});

test('Feux de kitsune refuse des cibles invalides sans engager l’Oni', () => {
  const d = duel(); const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const a = poser(d, 'sorcier', 'seigneur-des-machoires');
  const ami = poser(d, 'joueur', 'chien-du-guet');
  for (const options of [{ cibleSecondaireId: a.id }, { cibleSecondaireId: ami.id }, { cibleSecondaireId: 'absente' }]) {
    assert.equal(rpgActiverCapacite(d, 'joueur', oni.id, a.id, options).raison, 'cible');
    assert.ok(!oni.activationUtiliseeMatch);
  }
  assert.equal(rpgActiverCapacite(d, 'joueur', oni.id, ami.id).raison, 'cible');
});

test('Feux de kitsune réparti conserve 2 dégâts si une cible disparaît pendant la réponse', () => {
  const d = duel(); const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const a = poser(d, 'sorcier', 'seigneur-des-machoires');
  const b = poser(d, 'sorcier', 'manticore-des-dunes');
  const avant = b.pv;
  d.sorcier.main.push('trait-de-braise');
  const res = rpgActiverCapacite(d, 'joueur', oni.id, a.id, { attendreReponse: true, cibleSecondaireId: b.id });
  assert.ok(res.effetEnAttente); assert.equal(d.effetCreatureEnAttente.cibleSecondaireId, b.id);
  d.sorcier.creatures = d.sorcier.creatures.filter(c => c.id !== a.id);
  assert.ok(rpgResoudreEffetCreatureEnAttente(d, 'sorcier').ok);
  assert.equal(b.pv, avant - 2);
  assert.ok(oni.activationUtiliseeMatch);
});

test('PvP transporte les deux cibles de Feux de kitsune', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const a = poser(d, 'sorcier', 'seigneur-des-machoires');
  const b = poser(d, 'sorcier', 'manticore-des-dunes');
  const avants = [a.pv, b.pv];
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: oni.id, cibleId: a.id, cibleSecondaireId: b.id });
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual([a.pv, b.pv], avants.map(pv => pv - 2));
});

test('Eau de la source : la Völva rend 4 PV, sans le Lien de Bimini', () => {
  const d = duel(); const volva = poser(d, 'joueur', 'volva-soigneuse');
  d.joueur.pv = 10; const avant = d.joueur.pv;
  assert.ok(rpgActiverCapacite(d, 'joueur', volva.id).ok);
  assert.equal(d.joueur.pv, avant + 4);
  assert.equal(rpgActiverCapacite(d, 'joueur', volva.id).raison, 'deja-activee');
});

test('Courant de retour : cible adverse et une seule pioche, même avec son ancre', () => {
  const d = duel(); const source = poser(d, 'joueur', 'leviathan');
  const allie = poser(d, 'joueur', 'porteuse-de-cruches');
  const cible = poser(d, 'sorcier', 'porteuse-de-cruches');
  const main = d.joueur.main.length;
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, allie.id).raison, 'cible');
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
  assert.ok(d.sorcier.main.includes(cible.carteId));
  assert.equal(d.joueur.main.length, main + 1);
});

test('Festin des vaillants soigne Eirik, ses alliés et leur sorcier de 2 sans Lien', () => {
  const d = duel(); const source = poser(d, 'joueur', 'scalde-des-runes');
  const ami = poser(d, 'joueur', 'porteuse-de-cruches');
  source.pv = source.pvMax - 2; ami.pv = ami.pvMax - 2; d.joueur.pv = 10;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id).ok);
  assert.equal(source.pv, source.pvMax); assert.equal(ami.pv, ami.pvMax); assert.equal(d.joueur.pv, 12);
});

test('Embuscade affaiblit seulement les adversaires dans le carré et respecte le plancher', () => {
  const d = duel(); const source = poser(d, 'joueur', 'gardien-viking-du-fjord');
  const cible = poser(d, 'sorcier', 'porteuse-de-cruches');
  const loin = poser(d, 'sorcier', 'porteuse-de-cruches');
  cible.emplacement = 0; loin.emplacement = 3;
  const avant = { atk: cible.atk, pv: cible.pv }, hors = { atk: loin.atk, pv: loin.pv };
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'joueur', colonne: 0 } }).raison, 'zone');
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } }).ok);
  assert.equal(cible.atk, Math.max(1, avant.atk - 2)); assert.equal(cible.pv, Math.max(1, avant.pv - 2));
  assert.deepEqual({ atk: loin.atk, pv: loin.pv }, hors);
  rpgFinDeTour(d); assert.equal(cible.atk, avant.atk); assert.equal(cible.pv, avant.pv);
});

test('Effacement des faibles accepte un coût 3 et refuse un coût supérieur', () => {
  const d = duel(); const source = poser(d, 'joueur', 'la-devoreuse');
  const cout3 = poser(d, 'sorcier', 'momie-de-lin'); const cout4 = poser(d, 'sorcier', 'kraken');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cout4.id).raison, 'cible');
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, cout3.id).ok);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cout3.id));
});

test('Nom effacé fait défausser exactement une carte adverse', () => {
  const d = duel(); const source = poser(d, 'joueur', 'lecteur-du-dernier-nom');
  d.sorcier.main = ['porteuse-de-cruches', 'trait-de-braise']; const avant = d.sorcier.cimetiere.length;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id).ok);
  assert.equal(d.sorcier.main.length, 1); assert.equal(d.sorcier.cimetiere.length, avant + 1);
});

test('Serment de la forge donne +2/+1 et 25 % critique aux alliés, source incluse, pour un tour', () => {
  const d = duel(); const source = poser(d, 'joueur', 'daimyo-du-soleil-rouge');
  const ami = poser(d, 'joueur', 'porteuse-de-cruches');
  const avant = [source, ami].map(e => ({ atk: e.atk, pv: e.pv, critique: e.coupCritiqueTemporaire }));
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id).ok);
  for (const [i, e] of [source, ami].entries()) {
    assert.equal(e.atk, avant[i].atk + 2); assert.equal(e.pv, avant[i].pv + 1);
    assert.equal(e.coupCritiqueTemporaire, avant[i].critique + .25);
  }
  rpgFinDeTour(d);
  for (const [i, e] of [source, ami].entries()) {
    assert.equal(e.atk, avant[i].atk); assert.equal(e.pv, avant[i].pv); assert.equal(e.coupCritiqueTemporaire, avant[i].critique);
  }
});

test('Djinn des cendres choisit un Djinn de coût 3 ou moins au cimetière', () => {
  const d = duel(); const source = poser(d, 'joueur', 'djinn-des-cendres-vengeresses');
  d.joueur.cimetiere = ['djinn-des-braises-voilees', 'chien-du-guet', 'ifrit-al-ahmar'];
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id).ok);
  const choix = rpgCartesRenfortChoisi(d, 'joueur');
  assert.ok(choix.some(c => c.id === 'djinn-des-braises-voilees' && c.admissible));
  assert.ok(!choix.some(c => c.id === 'chien-du-guet' && c.admissible));
  assert.ok(!choix.some(c => c.id === 'ifrit-al-ahmar' && c.admissible));
  assert.ok(rpgResoudreRenfortChoisi(d, 'joueur', choix.find(c => c.id === 'djinn-des-braises-voilees').index).ok);
  assert.ok(d.joueur.creatures.some(c => c.carteId === 'djinn-des-braises-voilees'));
});

test('Braisier : la zone et le sorcier ne sont touchés qu’à son activation', () => {
  const d = duel(); const cible = poser(d, 'sorcier', 'chien-du-guet');
  cible.pv = 8; cible.pvMax = 8; cible.def = 8;
  const pv = cible.pv, sorcier = d.sorcier.pv;
  const source = poser(d, 'joueur', 'braisier-du-souk');
  assert.equal(cible.pv, pv); assert.equal(d.sorcier.pv, sorcier);
  cible.emplacement = 0;
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } }).ok);
  assert.equal(cible.pv, pv - 1); assert.equal(d.sorcier.pv, sorcier - 1);
});

test('Daimyō crée deux Samouraïs lorsque deux places sont libres', () => {
  const d = duel(); poser(d, 'joueur', 'daimyo-du-soleil-rouge');
  assert.equal(d.joueur.creatures.filter(e => e.carteId === 'samourai-du-daimyo').length, 2);
});

for (const cote of ['joueur', 'sorcier']) test(`PvP ${cote} : le Djinn choisit au cimetière puis ne peut pas réactiver sa présence`, () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, cote, 'djinn-des-cendres-vengeresses'); d.tour = cote;
  d[cote].cimetiere = ['chien-du-guet', 'djinn-des-braises-voilees'];
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'activer', capacite: true, entiteId: source.id }).ok);
  const choix = rpgCartesRenfortChoisi(d, cote).find(c => c.id === 'djinn-des-braises-voilees');
  assert.ok(choix?.admissible);
  assert.ok(rpgPvpAppliquer(d, cote, { type: 'choisir-renfort', index: choix.index }).ok);
  assert.ok(d[cote].creatures.some(e => e.carteId === 'djinn-des-braises-voilees'));
  assert.equal(rpgActiverCapacite(d, cote, source.id).raison, 'deja-activee');
});

test('IA : la Dune combat un adversaire lorsque l’échange est favorable', () => {
  const d = duel(); const dune = poser(d, 'sorcier', 'dune-marchante');
  d.renfortChoixEnAttente = null; d.arriveeEnAttente = null;
  const cible = poser(d, 'joueur', 'chien-du-guet'); d.tour = 'sorcier';
  cible.pv = 1; cible.def = 1; cible.atk = 0;
  const choix = choisirActivationIA(d, 'sorcier');
  assert.equal(choix?.entiteId, dune.id); assert.equal(choix?.cibleId, cible.id);
  assert.ok(rpgActiverCapacite(d, 'sorcier', dune.id, cible.id).ok);
});

test('Dune : sa disparition en réponse dissipe son combat payé', () => {
  const d = duel(); const source = poser(d, 'joueur', 'dune-marchante');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); const pv = cible.pv;
  // État différé restauré : les anciennes magies rapides ne sont plus jouables.
  source.activationUtiliseeMatch = true; source.activationUtiliseeCeTour = true;
  d.effetCreatureEnAttente = { cote: 'joueur', carteId: 'dune-marchante', entiteId: source.id, cibleId: cible.id, type: 'activation' };
  d.fenetreReponse = true;
  d.joueur.creatures = d.joueur.creatures.filter(e => e.id !== source.id);
  const resultat = rpgResoudreEffetCreatureEnAttente(d, 'sorcier');
  assert.ok(resultat.ok && resultat.dissipe); assert.equal(cible.pv, pv);
});
