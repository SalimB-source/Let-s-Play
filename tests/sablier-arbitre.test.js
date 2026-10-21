/**
 * L'arbitre du Sablier, testé de bout en bout — sans réseau, sans Supabase.
 *
 * Ce que ces tests protègent :
 *   1. **Aucune fuite** : aucune réponse ne contient la main, la pioche, la
 *      graine ou le profil d'IA de l'adversaire ;
 *   2. **Aucune usurpation** : seul un participant agit, et seulement pour son
 *      siège, avec le bon `seq` ;
 *   3. **La partie avance** : ouverture → invitation → mulligans → mana →
 *      tours → fin, avec les mêmes règles que le duel contre l'IA ;
 *   4. **Le temps et l'abandon** : un tour oublié se ferme, trois l'abandonnent.
 *
 * Lancer : `npm run check:sablier-pvp`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { cardById, RPG_DECKS } from '../src/games/rpgCards.js';
import { creerArbitre, etatInitial, OUBLIS_AVANT_ABANDON } from '../src/server/sablierArbitre.js';
import { RPG_PVP_HORLOGES } from '../src/games/rpgPvp.js';
import { rngSeme } from '../src/games/rpgHasard.js';

const DECK_A = RPG_DECKS[0].cardIds;
const DECK_B = RPG_DECKS[1].cardIds;

const HOTE = 'u-hote';
const INVITE = 'u-invite';
const TIERS = 'u-tiers';
const AMI = 'u-ami';

/** Un monde en mémoire : deux comptes amis, un tiers, et les duels écrits. */
function creerMonde({ collections = {}, amis = [[HOTE, INVITE], [HOTE, AMI]], departs = {} } = {}) {
  const duels = new Map();
  const journal = [];
  const noms = { [HOTE]: 'Salim', [INVITE]: 'Yasmine', [TIERS]: 'Karim', [AMI]: 'Nadia' };
  const etats = { ...collections, ...departs };
  const magasin = {
    duels,
    journal,
    async duelParCode(code) {
      const ligne = duels.get(code);
      return ligne ? structuredClone(ligne) : null;
    },
    async insererDuel(ligne) {
      if (duels.has(ligne.code)) throw new Error('duplicate key value violates unique constraint');
      // L'index partiel `rpg_sablier_duels_une_invitation_idx` : une seule
      // invitation en attente par couple d'amis.
      const doublon = [...duels.values()].some((d) => d.statut === 'invitation'
        && ligne.statut === 'invitation'
        && d.invite_id && ligne.invite_id
        && d.hote_id === ligne.hote_id && d.invite_id === ligne.invite_id);
      if (doublon) throw new Error('duplicate key value violates unique constraint "rpg_sablier_duels_une_invitation_idx"');
      duels.set(ligne.code, structuredClone(ligne));
      return ligne;
    },
    async mettreAJourDuel(code, seqAttendu, patch) {
      const ligne = duels.get(code);
      if (!ligne) return null;
      if ((ligne.seq ?? 0) !== seqAttendu) return null;
      const maj = { ...ligne, ...structuredClone(patch) };
      duels.set(code, maj);
      return structuredClone(maj);
    },
    async journaliser(ligne) {
      journal.push(ligne);
    },
    async nomDe(uid) {
      return noms[uid] ?? '';
    },
    async sontAmis(a, b) {
      return amis.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    },
    async etatSablier(uid) {
      return etats[uid] ? { collection: etats[uid] } : null;
    },
  };
  const horloge = { t: Date.parse('2026-10-20T12:00:00Z') };
  const arbitre = creerArbitre({
    magasin,
    // Comme l'adaptateur Vercel : un jeton inconnu ne donne aucune identité.
    authentifier: async (jeton) => (noms[jeton] ? { id: jeton } : null),
    maintenant: () => horloge.t,
    // Graine fixe : les codes de défi sont stables d'un test à l'autre.
    hasard: rngSeme(1),
  });
  return { arbitre, magasin, horloge, noms };
}

/** Appelle l'arbitre comme le ferait le client. */
async function api(monde, jeton, corps) {
  const requete = new Request('https://lets-play.test/api/sablier-duel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
  });
  const reponse = await monde.arbitre(requete);
  return { status: reponse.status, ...(await reponse.json()) };
}

/** Ouvre un défi nominatif et le rejoint ; rend le code. */
async function duelEnCours(monde, { deckHote = DECK_A, deckInvite = DECK_B } = {}) {
  const ouverture = await api(monde, HOTE, {
    action: 'ouvrir', deck: deckHote, visibilite: 'amis', invite_id: INVITE,
  });
  assert.equal(ouverture.ok, true, JSON.stringify(ouverture));
  const jointure = await api(monde, INVITE, { action: 'rejoindre', code: ouverture.code, deck: deckInvite });
  assert.equal(jointure.ok, true, JSON.stringify(jointure));
  return { code: ouverture.code, jointure };
}

/**
 * Joue un tour complet côté client : mulligan éventuel, choix de mana éventuel,
 * puis une éventuelle carte — le tout par le protocole, jamais en touchant
 * l'état.
 */
async function jouerTour(monde, jeton, code, { carte = null } = {}) {
  let vue = await api(monde, jeton, { action: 'etat', code });
  assert.equal(vue.ok, true, JSON.stringify(vue));

  if (!vue.etat.mulliganFait.joueur || !vue.etat.mulliganFait.sorcier) {
    return api(monde, jeton, { action: 'jouer', code, seq: vue.seq, intention: { type: 'mulligan', index: [] } });
  }
  if (vue.etat.joueur?.manaChoixEnAttente) {
    const couleur = vue.etat.joueur.couleurs?.[0];
    return api(monde, jeton, { action: 'jouer', code, seq: vue.seq, intention: { type: 'choix-mana', couleur } });
  }
  if (carte) {
    const suite = await api(monde, jeton, {
      action: 'jouer', code, seq: vue.seq, intention: { type: 'jouer-carte', carteId: carte },
    });
    if (suite.ok) return suite;
  }
  return api(monde, jeton, { action: 'jouer', code, seq: vue.seq, intention: { type: 'fin-de-tour' } });
}

/* ------------------------------------------------------------------ */

test('l’arbitre refuse tout sans jeton, hors POST, ou pour une action inconnue', async () => {
  const monde = creerMonde();
  const sansJeton = await monde.arbitre(new Request('https://x.test/', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"action":"etat"}',
  }));
  assert.equal(sansJeton.status, 401);

  const mauvaisJeton = await monde.arbitre(new Request('https://x.test/', {
    method: 'POST', headers: { authorization: 'Bearer ' }, body: '{"action":"etat"}',
  }));
  assert.equal(mauvaisJeton.status, 401);

  // GET = sonde de mise en service : 200 sans jeton, et sans le moindre état.
  const sonde = await monde.arbitre(new Request('https://x.test/', { method: 'GET' }));
  assert.equal(sonde.status, 200);
  assert.deepEqual(await sonde.json(), { ok: true, service: 'sablier-duel', version: 1 });
  assert.equal((await monde.arbitre(new Request('https://x.test/', { method: 'DELETE' }))).status, 405);

  assert.equal((await api(monde, HOTE, { action: 'pirater' })).status, 400);
  assert.equal((await api(monde, HOTE, { action: 'etat', code: 'ZZZZ' })).raison, 'code-invalide');
  assert.equal((await api(monde, HOTE, { action: 'etat', code: 'AAAAAAAA' })).raison, 'duel-inconnu');
});

test('un deck invalide ou non possédé est refusé à l’ouverture', async () => {
  const monde = creerMonde({ collections: { [HOTE]: ['tiziri-du-djurdjura'] } });

  const court = await api(monde, HOTE, { action: 'ouvrir', deck: DECK_A.slice(0, 10), visibilite: 'lien' });
  assert.equal(court.ok, false);
  assert.equal(court.raison, 'deck-invalide');

  // Un deck du catalogue est ouvert à tous, même sans collection.
  const catalogue = await api(monde, HOTE, { action: 'ouvrir', deck: DECK_A, visibilite: 'lien' });
  assert.equal(catalogue.ok, true);

  // Un deck composé de cartes non possédées est refusé…
  const compose = [...DECK_A.slice(0, 29), DECK_B.at(-1)];
  const vole = await api(monde, HOTE, { action: 'ouvrir', deck: compose, visibilite: 'lien' });
  assert.equal(vole.ok, false);
  assert.equal(vole.raison, 'deck-non-possede');
});

test('un défi nominatif exige l’amitié, un autre joueur ne peut pas le rejoindre', async () => {
  const monde = creerMonde({ amis: [] });
  const pasAmis = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  assert.equal(pasAmis.raison, 'pas-amis');

  const mondeAmitie = creerMonde();
  const ouverture = await api(mondeAmitie, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: AMI,
  });
  assert.equal(ouverture.ok, true);
  assert.match(ouverture.code, /^[A-F0-9]{8}$/);
  assert.equal(ouverture.siege, 'joueur');
  assert.equal(ouverture.statut, 'invitation');

  // La place est réservée : un tiers avec le code est refusé.
  const intrus = await api(mondeAmitie, INVITE, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(intrus.status, 403);
  assert.equal(intrus.raison, 'invitation-nominale');

  // L'hôte ne peut pas s'asseoir deux fois.
  const double = await api(mondeAmitie, HOTE, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(double.raison, 'deja-inscrit');

  // L'ami invité, lui, entre.
  const ok = await api(mondeAmitie, AMI, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(ok.ok, true);
  assert.equal(ok.siege, 'sorcier');
  assert.equal(ok.statut, 'en_cours');

  // Et plus personne d'autre.
  const tard = await api(mondeAmitie, INVITE, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(tard.raison, 'partie-close');
});

test('aucune réponse ne contient la main, la pioche, la graine ni l’ia adverses', async () => {
  const monde = creerMonde();
  const { code, jointure } = await duelEnCours(monde);

  const vues = [
    jointure,
    await api(monde, HOTE, { action: 'etat', code }),
    await api(monde, INVITE, { action: 'etat', code }),
  ];
  for (const vue of vues) {
    const texte = JSON.stringify(vue);
    assert.equal(texte.includes('hasard'), false, 'la graine ne sort jamais');
    assert.deepEqual(vue.etat.sorcier.main, []);
    assert.deepEqual(vue.etat.sorcier.deck, []);
    assert.equal(typeof vue.etat.sorcier.mainCount, 'number');
    assert.equal(vue.etat.sorcier.ia ?? null, null);
    // La main du destinataire, elle, est bien là (on ne se prive pas soi-même).
    assert.ok(vue.etat.joueur.main.length > 0);
  }

  // Les deux sièges ne voient pas la même main : c'est le retournement.
  const vueHote = await api(monde, HOTE, { action: 'etat', code });
  const vueInvite = await api(monde, INVITE, { action: 'etat', code });
  assert.notDeepEqual(vueHote.etat.joueur.main, vueInvite.etat.joueur.main);
  // Chacun voit l'autre en face : la vue est toujours rendue « de mon côté ».
  assert.equal(vueHote.etat.adversaire, 'sorcier');
  assert.equal(vueInvite.etat.adversaire, 'joueur');
});

test('un non-participant ne peut ni lire ni jouer', async () => {
  const monde = creerMonde();
  const { code } = await duelEnCours(monde);
  const lecture = await api(monde, TIERS, { action: 'etat', code });
  assert.equal(lecture.status, 403);
  assert.equal(lecture.raison, 'pas-participant');
  const coup = await api(monde, TIERS, {
    action: 'jouer', code, seq: 0, intention: { type: 'fin-de-tour' },
  });
  assert.equal(coup.status, 403);
});

test('la partie se joue : mulligans, mana, tours, puis abandon', async () => {
  const monde = creerMonde();
  const { code } = await duelEnCours(monde);

  // Chacun échange sa main, dans n'importe quel ordre.
  const mulliganInvite = await jouerTour(monde, INVITE, code);
  assert.equal(mulliganInvite.ok, true, JSON.stringify(mulliganInvite));
  const mulliganHote = await jouerTour(monde, HOTE, code);
  assert.equal(mulliganHote.ok, true, JSON.stringify(mulliganHote));

  // Les deux faits : le mana du premier tour est accordé par l'arbitre.
  let vue = await api(monde, HOTE, { action: 'etat', code });
  assert.equal(vue.etat.manaEssaiDemarre, true);
  if (vue.etat.joueur.manaChoixEnAttente) {
    const choix = await api(monde, HOTE, {
      action: 'jouer', code, seq: vue.seq, intention: { type: 'choix-mana', couleur: vue.etat.joueur.couleurs[0] },
    });
    assert.equal(choix.ok, true, JSON.stringify(choix));
  }

  // Le tour de l'hôte se ferme, puis c'est à l'invité.
  const fin = await api(monde, HOTE, { action: 'jouer', code, seq: (await api(monde, HOTE, { action: 'etat', code })).seq, intention: { type: 'fin-de-tour' } });
  assert.equal(fin.ok, true, JSON.stringify(fin));
  vue = await api(monde, INVITE, { action: 'etat', code });
  // Pour l'invité, son camp s'appelle « joueur » : le tour lui revient.
  assert.equal(vue.etat.tour, 'joueur');

  // Une action hors tour est refusée côté serveur, avec la vue à jour.
  const horsTour = await api(monde, HOTE, {
    action: 'jouer', code, seq: vue.seq, intention: { type: 'fin-de-tour' },
  });
  assert.equal(horsTour.ok, false);
  assert.equal(horsTour.raison, 'pas-votre-tour');

  // Le journal garde la trace des actions acceptées, avec le bon siège.
  const journal = monde.magasin.journal;
  assert.ok(journal.length >= 3);
  assert.deepEqual([...new Set(journal.map((l) => l.siege))].sort(), ['joueur', 'sorcier']);
  assert.ok(journal.every((l) => l.resultat === 'ok' && l.acteur_id && Number.isInteger(l.seq)));
  assert.equal(new Set(journal.map((l) => l.seq)).size, journal.length, 'un numéro d’action par entrée');

  // Abandon de l'invité : la victoire revient à l'hôte.
  const abandon = await api(monde, INVITE, { action: 'abandonner', code });
  assert.equal(abandon.ok, true);
  assert.equal(abandon.statut, 'terminee');
  assert.equal(abandon.gagnant_id, HOTE);
  assert.equal(abandon.fin_raison, 'abandon');

  const apres = await api(monde, HOTE, { action: 'etat', code });
  assert.equal(apres.statut, 'terminee');
  assert.equal(apres.gagnant_id, HOTE);

  // Une partie close n'accepte plus rien.
  const trop = await api(monde, HOTE, { action: 'jouer', code, seq: apres.seq, intention: { type: 'fin-de-tour' } });
  assert.equal(trop.raison, 'partie-close');
});

test('un seq périmé est refusé (double-clic, rejeu réseau)', async () => {
  const monde = creerMonde();
  const { code } = await duelEnCours(monde);
  const vue = await api(monde, INVITE, { action: 'etat', code });

  const premier = await api(monde, INVITE, {
    action: 'jouer', code, seq: vue.seq, intention: { type: 'mulligan', index: [] },
  });
  assert.equal(premier.ok, true);

  // Deuxième clic avec l'ancien seq : refus, et la vue à jour accompagne le refus.
  const double = await api(monde, INVITE, {
    action: 'jouer', code, seq: vue.seq, intention: { type: 'mulligan', index: [] },
  });
  assert.equal(double.status, 409);
  assert.equal(double.raison, 'sequence');
  assert.equal(double.seq, premier.seq);

  // Un mulligan déjà fait est refusé même avec le bon seq.
  const encore = await api(monde, INVITE, {
    action: 'jouer', code, seq: premier.seq, intention: { type: 'mulligan', index: [] },
  });
  assert.equal(encore.ok, false);
  assert.equal(encore.raison, 'mulligan-fait');
});

test('inviter un joueur déjà invité est refusé par l’index unique', async () => {
  const monde = creerMonde();
  const premier = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  assert.equal(premier.ok, true);
  const second = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  // Le magasin mémoire imite l'index unique partiel de `rpg-pvp.sql`.
  assert.equal(second.ok, false);
  assert.equal(second.raison, 'invitation-en-attente');
});

test('un défi par lien n’a pas de destinataire : le premier arrivé prend la place', async () => {
  const monde = creerMonde();
  const ouverture = await api(monde, HOTE, { action: 'ouvrir', deck: DECK_A, visibilite: 'lien' });
  assert.equal(ouverture.ok, true);
  assert.equal(ouverture.visibilite, 'lien');
  const jointure = await api(monde, TIERS, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(jointure.ok, true);
  assert.equal(jointure.siege, 'sorcier');
});

test('le tour oublié se ferme, trois oublis abandonnent la partie', async () => {
  const monde = creerMonde();
  const { code } = await duelEnCours(monde);
  // Les deux mulligans, puis plus personne ne joue.
  await jouerTour(monde, HOTE, code);
  await jouerTour(monde, INVITE, code);
  const depart = await api(monde, HOTE, { action: 'etat', code });
  assert.equal(depart.etat.tour, 'joueur');

  // Le premier oubli ferme le tour : la partie ne reste pas figée.
  monde.horloge.t += RPG_PVP_HORLOGES.live + 1000;
  const apresUn = await api(monde, HOTE, { action: 'etat', code });
  assert.equal(apresUn.statut, 'en_cours');
  assert.equal(apresUn.etat.tour, 'sorcier');
  assert.equal(apresUn.etat.retards.joueur, 1);

  // Trois oublis du même camp : la victoire va à l'autre. Les tours alternent
  // (personne ne joue), donc les retards s'accumulent des deux côtés.
  for (let oubli = 2; oubli <= OUBLIS_AVANT_ABANDON * 4; oubli += 1) {
    monde.horloge.t += RPG_PVP_HORLOGES.live + 1000;
    const vu = await api(monde, HOTE, { action: 'etat', code });
    if (vu.statut === 'terminee') break;
  }
  const fin = await api(monde, HOTE, { action: 'etat', code });
  assert.equal(fin.statut, 'terminee');
  assert.equal(fin.fin_raison, 'temps');
  assert.ok([INVITE, HOTE].includes(fin.gagnant_id));
});

test('une invitation non acceptée expire au bout de sept jours', async () => {
  const monde = creerMonde();
  const ouverture = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  monde.horloge.t += RPG_PVP_HORLOGES.invitation + 1000;

  const vue = await api(monde, INVITE, { action: 'etat', code: ouverture.code });
  assert.equal(vue.statut, 'expiree');
  const tard = await api(monde, INVITE, { action: 'rejoindre', code: ouverture.code, deck: DECK_B });
  assert.equal(tard.ok, false);
});

test('refuser une invitation la clôt pour les deux joueurs', async () => {
  const monde = creerMonde();
  const ouverture = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  const refus = await api(monde, INVITE, { action: 'refuser', code: ouverture.code });
  assert.equal(refus.ok, true);
  assert.equal(refus.statut, 'refusee');
  const cote = await api(monde, HOTE, { action: 'etat', code: ouverture.code });
  assert.equal(cote.statut, 'refusee');
  assert.equal(cote.etat, null);
});

test('l’état initial est reproductible : même graine, même partie', () => {
  const a = etatInitial(DECK_A, DECK_B, 123456);
  const b = etatInitial(DECK_A, DECK_B, 123456);
  const c = etatInitial(DECK_A, DECK_B, 123457);
  assert.deepEqual(a.joueur.deck, b.joueur.deck);
  assert.deepEqual(a.sorcier.deck, b.sorcier.deck);
  assert.notDeepEqual(a.joueur.deck, c.joueur.deck);
  assert.equal(a.hasard.graine, 123456);
  assert.equal(a.sorcier.ia ?? null, null);
  assert.equal(a.sorcier.puissance, 0);
});

/** Termine le tour du joueur : il paie d'abord son mana du tour si on le lui demande. */
async function terminerTour(monde, jeton, code) {
  const vue = await api(monde, jeton, { action: 'etat', code });
  if (!vue.ok) return vue;
  if (vue.etat?.joueur?.manaChoixEnAttente) {
    return api(monde, jeton, {
      action: 'jouer', code, seq: vue.seq, intention: { type: 'choix-mana', couleur: vue.etat.joueur.couleurs[0] },
    });
  }
  return api(monde, jeton, { action: 'jouer', code, seq: vue.seq, intention: { type: 'fin-de-tour' } });
}

test('une carte jouée par le protocole arrive sur la table, et l’adversaire la voit', async () => {
  const monde = creerMonde();
  const { code } = await duelEnCours(monde);
  await jouerTour(monde, HOTE, code);
  await jouerTour(monde, INVITE, code);

  // On laisse passer les tours jusqu'à ce que le mana permette une carte : au
  // premier tour, un deck à courbe haute n'a parfois rien à poser — c'est le
  // jeu, pas un bug.
  let pose = null;
  let vue = null;
  for (let tour = 0; tour < 6 && !pose; tour += 1) {
    vue = await api(monde, HOTE, { action: 'etat', code });
    if (vue.etat?.joueur?.manaChoixEnAttente) {
      vue = await api(monde, HOTE, {
        action: 'jouer', code, seq: vue.seq, intention: { type: 'choix-mana', couleur: vue.etat.joueur.couleurs[0] },
      });
    }
    const main = [...vue.etat.joueur.main];
    for (const carteId of main) {
      const carte = cardById(carteId);
      if (!carte) continue;
      // eslint-disable-next-line no-await-in-loop
      const essai = await api(monde, HOTE, {
        action: 'jouer', code, seq: vue.seq, intention: { type: 'jouer-carte', carteId },
      });
      if (essai.ok) { pose = { carteId, carte, vue: essai, main }; break; }
      assert.equal(essai.status, 400, JSON.stringify(essai), 'un refus de carte est propre (400), pas un 500');
    }
    if (pose) break;
    // Rien de jouable : on rend la main et on attend le tour suivant.
    await terminerTour(monde, HOTE, code);
    await terminerTour(monde, INVITE, code);
  }

  assert.ok(pose, 'une carte devait finir par être jouable');
  assert.equal(pose.vue.etat.joueur.main.includes(pose.carteId), false, 'la carte a quitté la main');
  assert.equal(pose.vue.etat.joueur.main.length, pose.main.length - 1);
  if (pose.carte.kind === 'creature') assert.equal(pose.vue.etat.joueur.creatures.length, 1);

  // L'adversaire voit la carte posée (information publique) mais pas la main.
  const vueAdverse = await api(monde, INVITE, { action: 'etat', code });
  assert.deepEqual(vueAdverse.etat.sorcier.creatures, pose.vue.etat.joueur.creatures);
  assert.deepEqual(vueAdverse.etat.sorcier.main, []);
  assert.equal(vueAdverse.etat.sorcier.mainCount, pose.vue.etat.joueur.main.length);
});

test('une invitation (par lien ou nominative) est lisible par le joueur attendu avant de rejoindre', async () => {
  const { etatSalon, peutRejoindre } = await import('../src/games/rpgPvpSalon.js');
  const monde = creerMonde();

  // 1) Défi par lien : tout joueur connecté qui ouvre le lien voit l'écran « a-rejoindre ».
  const lien = await api(monde, HOTE, { action: 'ouvrir', deck: DECK_A, visibilite: 'lien' });
  const etatLienTiers = await api(monde, TIERS, { action: 'etat', code: lien.code });
  assert.equal(etatLienTiers.ok, true);
  assert.equal(etatLienTiers.statut, 'invitation');
  assert.equal(etatLienTiers.siege, null);
  assert.equal(etatSalon(etatLienTiers), 'a-rejoindre');
  assert.equal(peutRejoindre(etatLienTiers, TIERS), true);

  // 2) Défi nominatif : l'ami invité voit « a-rejoindre », un tiers est refusé.
  const nominatif = await api(monde, HOTE, {
    action: 'ouvrir', deck: DECK_A, visibilite: 'amis', invite_id: INVITE,
  });
  const etatInvite = await api(monde, INVITE, { action: 'etat', code: nominatif.code });
  assert.equal(etatInvite.ok, true);
  assert.equal(etatInvite.statut, 'invitation');
  assert.equal(etatInvite.siege, null);
  assert.equal(etatSalon(etatInvite), 'a-rejoindre');
  assert.equal(peutRejoindre(etatInvite, INVITE), true);

  const etatTiers = await api(monde, TIERS, { action: 'etat', code: nominatif.code });
  assert.equal(etatTiers.ok, false);
  assert.equal(etatTiers.status, 403);
  assert.equal(etatTiers.raison, 'pas-participant');
});

