/**
 * Le Sablier en ligne — l'arbitre.
 * --------------------------------
 * La seule copie vraie d'un duel PvP vit ici. Le navigateur n'envoie qu'une
 * **intention** (« je joue cette carte », « je termine mon tour ») ; l'arbitre
 * la rejoue sur l'état de référence avec le vrai moteur (`rpgPvpAppliquer`),
 * écrit le résultat et renvoie une **vue filtrée** (`rpgPvpVue`). À aucun
 * moment l'état complet — la main et la pioche adverses — ne sort d'ici.
 *
 * Ce fichier est **autonome** : il prend une `Request` web standard et rend
 * une `Response` (WHATWG). C'est la seule forme que Vercel, Deno (Supabase Edge
 * Functions) et Cloudflare Workers comprennent toutes les trois, et c'est
 * aussi celle qu'on teste en Node sans rien déployer
 * (`tests/sablier-arbitre.test.js`). Changer d'hébergeur = changer l'enveloppe
 * de cinq lignes dans `api/sablier-duel.js`.
 *
 * Le stockage et l'authentification sont **injectés** (`magasin`,
 * `authentifier`) : le cœur ne connaît ni Supabase ni HTTP. Voir plus bas le
 * contrat exact que doit remplir un magasin.
 *
 * Contrat des requêtes (POST JSON) :
 *
 *   { action: 'ouvrir',    deck, visibilite?: 'amis'|'lien', invite_id?, mode?: 'live'|'async' }
 *   { action: 'rejoindre', code, deck }
 *   { action: 'etat',      code }
 *   { action: 'jouer',     code, seq, intention }
 *   { action: 'refuser',   code }
 *   { action: 'abandonner', code }
 *
 * En-tête `authorization: Bearer <jwt Supabase>`. Toutes les réponses sont du
 * JSON : `{ ok: true, ... }` ou `{ ok: false, raison, ... }`.
 */

import { rpgValiderDeck, RPG_DECKS } from '../games/rpgCards.js';
import { rpgNouveauDuel, rpgDemarrerManaEssai } from '../games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../games/rpgManaEssai.js';
import { rngSeme } from '../games/rpgHasard.js';
import {
  RPG_PVP_HORLOGES,
  RPG_PVP_VERSION,
  rpgPvpAppliquer,
  rpgPvpAutreCote,
  rpgPvpBrancherHasard,
  rpgPvpCode,
  rpgPvpCodeAleatoire,
  rpgPvpResultat,
  rpgPvpVue,
} from '../games/rpgPvp.js';

/** Longueur maximale d'un corps de requête accepté (une intention fait < 1 Ko). */
export const CORPS_MAX = 64 * 1024;

/** Nombre de tours oubliés avant l'abandon automatique (mode direct). */
export const OUBLIS_AVANT_ABANDON = 3;

/** Les statuts d'un duel (`supabase/rpg-pvp.sql`). */
export const STATUTS = ['invitation', 'en_cours', 'terminee', 'refusee', 'expiree'];

export const ACTIONS = ['ouvrir', 'rejoindre', 'etat', 'jouer', 'refuser', 'abandonner'];

/**
 * Contrat du magasin (implémenté par `api/sablier-duel.js` pour Supabase, et
 * par une Map en mémoire pour les tests) :
 *
 *   duelParCode(code)                       → ligne | null
 *   insererDuel(ligne)                      → ligne          (jette si le code existe)
 *   mettreAJourDuel(code, seqAttendu, patch)→ ligne | null   (null = conflit de seq)
 *   journaliser({ code, seq, acteur_id, siege, intention, resultat })
 *   nomDe(uid)                              → pseudo
 *   sontAmis(a, b)                          → booléen
 *   etatSablier(uid)                        → { collection: string[] } | null
 *
 * Une « ligne » porte les colonnes de `public.rpg_sablier_duels`.
 */

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

function reponse(status, corps) {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const refus = (status, raison, extra = {}) => reponse(status, { ok: false, raison, ...extra });

/** Lit le corps JSON en refusant ce qui dépasse `CORPS_MAX`. */
async function lireCorps(request) {
  const brut = await request.text();
  if (brut.length > CORPS_MAX) return { erreur: 'trop-long' };
  if (!brut.trim()) return { corps: {} };
  try {
    const corps = JSON.parse(brut);
    return corps && typeof corps === 'object' ? { corps } : { erreur: 'json' };
  } catch {
    return { erreur: 'json' };
  }
}

/** Jeton porteur de la requête, quelle que soit la casse de l'en-tête. */
export function jetonDe(request) {
  const entete = request.headers?.get?.('authorization') || '';
  const trouve = entete.match(/^Bearer\s+(.+)$/i);
  return trouve ? trouve[1].trim() : '';
}

/** Même deck, à l'ordre près ? Sert à reconnaître un deck du catalogue. */
function memeDeck(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const compter = (liste) => liste.reduce((acc, id) => acc.set(id, (acc.get(id) ?? 0) + 1), new Map());
  const gauche = compter(a);
  const droite = compter(b);
  if (gauche.size !== droite.size) return false;
  for (const [id, n] of gauche) if (droite.get(id) !== n) return false;
  return true;
}

/**
 * État de départ d'un duel : les deux decks mélangés avec la graine du duel.
 * Le compteur du hasard est amorcé sur ce que le mélange a consommé, pour que
 * la suite des tirages soit reprise à l'identique après un rechargement.
 */
export function etatInitial(deckHote, deckInvite, graine) {
  let consommes = 0;
  const base = rngSeme(graine);
  const rng = () => {
    consommes += 1;
    return base();
  };
  const etat = rpgNouveauDuel({
    joueurDeck: deckHote,
    sorcierDeck: deckInvite,
    sorcierPuissance: 0,
    sorcierIA: null,
    modeMana: RPG_MODE_MANA_ESSAI,
    rng,
  });
  etat.hasard = { graine, compteur: consommes };
  rpgPvpBrancherHasard(etat);
  return etat;
}

/* ------------------------------------------------------------------ */
/* L'arbitre                                                           */
/* ------------------------------------------------------------------ */

/**
 * Construit l'arbitre. `magasin` et `authentifier` sont les deux seules
 * dépendances extérieures ; `maintenant` et `hasard` sont injectables pour que
 * les tests soient stables.
 */
export function creerArbitre({
  magasin,
  authentifier,
  maintenant = () => Date.now(),
  hasard = Math.random,
} = {}) {
  if (!magasin) throw new Error('magasin requis');
  if (typeof authentifier !== 'function') throw new Error('authentifier requis');

  const horlogeDe = (mode) => RPG_PVP_HORLOGES[mode === 'async' ? 'rappelAsync' : 'live'];
  const echeanceDe = (mode, depart) => new Date(depart + horlogeDe(mode)).toISOString();

  /** Un code libre, en insistant un peu : 8 hexadécimaux, 4 milliards de possibilités. */
  async function codeLibre() {
    for (let essai = 0; essai < 8; essai += 1) {
      const code = rpgPvpCodeAleatoire(hasard);
      // eslint-disable-next-line no-await-in-loop
      if (!(await magasin.duelParCode(code))) return code;
    }
    throw new Error('code-introuvable');
  }

  /**
   * Le deck est-il jouable ici ? Format d'abord (`rpgValiderDeck` : 30 cartes,
   * 1–3 couleurs, limites d'exemplaires), puis **possession** : un deck du
   * catalogue est ouvert à tous, un deck composé exige que chaque carte soit
   * dans la collection du compte (`rpg_sablier_progress.state.collection`).
   */
  async function deckAutorise(uid, deck) {
    if (!rpgValiderDeck(deck).ok) return { ok: false, raison: 'deck-invalide' };
    if (RPG_DECKS.some((catalogue) => memeDeck(catalogue.cardIds, deck))) return { ok: true };
    const etat = await magasin.etatSablier(uid);
    const collection = new Set(Array.isArray(etat?.collection) ? etat.collection : []);
    if (!collection.size) return { ok: false, raison: 'deck-non-possede' };
    return deck.every((id) => collection.has(id))
      ? { ok: true }
      : { ok: false, raison: 'deck-non-possede' };
  }

  /** Charge un duel et vérifie que `uid` en est l'un des deux joueurs. */
  async function duelDuJoueur(code, uid) {
    const propre = rpgPvpCode(code);
    if (!propre) return { erreur: refus(400, 'code-invalide') };
    const duel = await magasin.duelParCode(propre);
    if (!duel) return { erreur: refus(404, 'duel-inconnu') };
    const siege = duel.hote_id === uid ? 'joueur' : duel.invite_id === uid ? 'sorcier' : null;
    if (!siege) return { erreur: refus(403, 'pas-participant') };
    return { duel, siege };
  }

  /** Le vainqueur (uid) et la raison, à partir de l'état du moteur. */
  async function issue(duel, etat) {
    const resultat = rpgPvpResultat(etat);
    if (resultat.nul) return { statut: 'terminee', gagnant_id: null, fin_raison: 'nul' };
    if (!resultat.gagnant) return { statut: 'en_cours', gagnant_id: null, fin_raison: null };
    const uid = resultat.gagnant === 'joueur' ? duel.hote_id : duel.invite_id;
    return { statut: 'terminee', gagnant_id: uid, fin_raison: resultat.raison ?? 'pv' };
  }

  /** La réponse d'une partie en cours : vue filtrée, jamais l'état complet. */
  async function etatPublic(duel, siege) {
    const noms = {
      joueur: (await magasin.nomDe(duel.hote_id)) || 'Hôte',
      sorcier: duel.invite_id ? (await magasin.nomDe(duel.invite_id)) || 'Invité' : 'Invité',
    };
    const corps = {
      ok: true,
      code: duel.code,
      siege,
      statut: duel.statut,
      mode: duel.mode,
      seq: duel.seq,
      echeance: duel.echeance,
      gagnant_id: duel.gagnant_id ?? null,
      fin_raison: duel.fin_raison ?? null,
      noms,
      hote_id: duel.hote_id,
      invite_id: duel.invite_id ?? null,
      etat: duel.etat && duel.statut !== 'invitation' ? rpgPvpVue(duel.etat, siege) : null,
    };
    if (corps.etat) corps.etat.noms = noms;
    return reponse(200, corps);
  }

  /* ---------------------------------------------------------------- */
  /* Temps : un tour oublié fait avancer la partie, trois l'abandonnent */
  /* ---------------------------------------------------------------- */

  async function verifierHorloge(duel) {
    if (duel.mode !== 'live' || duel.statut !== 'en_cours' || !duel.echeance) return duel;
    if (maintenant() < Date.parse(duel.echeance)) return duel;
    const etat = duel.etat;
    rpgPvpBrancherHasard(etat);
    const actif = etat.tour;
    etat.retards = etat.retards ?? { joueur: 0, sorcier: 0 };
    etat.retards[actif] = (etat.retards[actif] ?? 0) + 1;

    let patch;
    if (etat.retards[actif] >= OUBLIS_AVANT_ABANDON) {
      patch = {
        etat,
        seq: duel.seq + 1,
        statut: 'terminee',
        gagnant_id: actif === 'joueur' ? duel.invite_id : duel.hote_id,
        fin_raison: 'temps',
      };
    } else {
      // Le tour se ferme d'office : un absent ne bloque pas la partie. Si le
      // moteur refuse (mulligan pas encore fait, défausse en attente…), on ne
      // touche à rien d'autre que l'échéance.
      const ferme = rpgPvpAppliquer(etat, actif, { type: 'fin-de-tour' }).ok;
      patch = {
        etat,
        seq: duel.seq + (ferme ? 1 : 0),
        tour: etat.tour,
        ...(await issue(duel, etat)),
      };
    }
    patch.dernier_coup = new Date(maintenant()).toISOString();
    patch.echeance = echeanceDe(duel.mode, maintenant());
    const maj = await magasin.mettreAJourDuel(duel.code, duel.seq, patch);
    return maj ?? (await magasin.duelParCode(duel.code)) ?? duel;
  }

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  const actions = {
    async ouvrir(joueur, corps) {
      const deck = Array.isArray(corps.deck) ? corps.deck.map(String) : null;
      if (!deck) return refus(400, 'deck-requis');
      const permis = await deckAutorise(joueur.id, deck);
      if (!permis.ok) return refus(400, permis.raison);

      const visibilite = corps.visibilite === 'lien' ? 'lien' : 'amis';
      const mode = corps.mode === 'async' ? 'async' : 'live';
      const invite = visibilite === 'amis' ? String(corps.invite_id || '') : null;
      if (visibilite === 'amis' && !invite) return refus(400, 'invite-requis');
      if (invite && invite === joueur.id) return refus(400, 'soi-meme');
      if (invite) {
        const amis = typeof magasin.sontAmis === 'function' ? await magasin.sontAmis(joueur.id, invite) : true;
        if (!amis) return refus(403, 'pas-amis');
      }

      const code = await codeLibre();
      const depart = maintenant();
      const ligne = {
        code,
        mode,
        visibilite,
        statut: 'invitation',
        hote_id: joueur.id,
        invite_id: invite,
        hote_deck: deck,
        invite_deck: null,
        etat: null,
        graine: Math.floor(Math.min(0.999999, Math.max(0, hasard())) * 4294967296),
        seq: 0,
        tour: null,
        gagnant_id: null,
        fin_raison: null,
        dernier_coup: new Date(depart).toISOString(),
        echeance: null,
      };
      try {
        await magasin.insererDuel(ligne);
      } catch (error) {
        // Index unique `rpg_sablier_duels_une_invitation_idx` : une invitation
        // en attente par couple. On le dit clairement au lieu d'un 500.
        if (/duplicate|unique/i.test(String(error?.message))) return refus(409, 'invitation-en-attente');
        throw error;
      }
      return reponse(201, {
        ok: true,
        code,
        statut: 'invitation',
        siege: 'joueur',
        mode,
        visibilite,
        expire_le: new Date(depart + RPG_PVP_HORLOGES.invitation).toISOString(),
      });
    },

    async rejoindre(joueur, corps) {
      const code = rpgPvpCode(corps.code);
      if (!code) return refus(400, 'code-invalide');
      const duel = await magasin.duelParCode(code);
      if (!duel) return refus(404, 'duel-inconnu');
      if (duel.statut !== 'invitation') return refus(409, 'partie-close');
      if (duel.hote_id === joueur.id) return refus(400, 'deja-inscrit');
      if (duel.invite_id && duel.invite_id !== joueur.id) return refus(403, 'invitation-nominale');
      if (Date.parse(duel.dernier_coup) + RPG_PVP_HORLOGES.invitation < maintenant()) {
        return refus(409, 'invitation-expiree');
      }

      const deck = Array.isArray(corps.deck) ? corps.deck.map(String) : null;
      if (!deck) return refus(400, 'deck-requis');
      const permis = await deckAutorise(joueur.id, deck);
      if (!permis.ok) return refus(400, permis.raison);

      const depart = maintenant();
      const etat = etatInitial(duel.hote_deck, deck, duel.graine);
      const patch = {
        invite_id: joueur.id,
        invite_deck: deck,
        etat,
        statut: 'en_cours',
        tour: 'joueur',
        dernier_coup: new Date(depart).toISOString(),
        echeance: echeanceDe(duel.mode, depart),
      };
      // `seq` attendu = 0 : deux joueurs qui cliquent en même temps sur le même
      // lien ne peuvent pas s'asseoir tous les deux à la même place.
      const maj = await magasin.mettreAJourDuel(code, duel.seq ?? 0, patch);
      if (!maj) return refus(409, 'course');
      return etatPublic({ ...duel, ...patch }, 'sorcier');
    },

    async etat(joueur, corps) {
      const vu = await duelDuJoueur(corps.code, joueur.id);
      if (vu.erreur) return vu.erreur;
      let duel = vu.duel;
      if (duel.statut === 'invitation'
        && Date.parse(duel.dernier_coup) + RPG_PVP_HORLOGES.invitation < maintenant()) {
        const maj = await magasin.mettreAJourDuel(duel.code, duel.seq ?? 0, { statut: 'expiree' });
        duel = maj ?? { ...duel, statut: 'expiree' };
      }
      if (duel.statut === 'en_cours') duel = await verifierHorloge(duel);
      return etatPublic(duel, vu.siege);
    },

    async jouer(joueur, corps) {
      const vu = await duelDuJoueur(corps.code, joueur.id);
      if (vu.erreur) return vu.erreur;
      let duel = vu.duel;
      if (duel.statut === 'invitation') return refus(409, 'pas-commence');
      if (duel.statut !== 'en_cours') return refus(409, 'partie-close');

      const seq = Number(corps.seq);
      if (!Number.isInteger(seq) || seq !== duel.seq) {
        // Anti-rejeu et anti-double-clic : le client doit relire l'état.
        return refus(409, 'sequence', { seq: duel.seq, etat: rpgPvpVue(duel.etat, vu.siege) });
      }

      duel = await verifierHorloge(duel);
      if (duel.statut !== 'en_cours') return etatPublic(duel, vu.siege);

      const etat = duel.etat;
      rpgPvpBrancherHasard(etat);
      const resultat = rpgPvpAppliquer(etat, vu.siege, corps.intention);
      if (!resultat.ok) {
        return refus(400, resultat.raison, {
          seq: duel.seq,
          etat: rpgPvpVue(etat, vu.siege),
        });
      }
      // Les deux mulligans faits : le premier mana arrive. Le moteur le demande
      // dans `rpgDemarrerManaEssai`, que la page appelle aussi de son côté.
      if (etat.modeMana === RPG_MODE_MANA_ESSAI
        && !etat.manaEssaiDemarre
        && etat.mulliganFait?.joueur
        && etat.mulliganFait?.sorcier) {
        rpgDemarrerManaEssai(etat);
      }

      const depart = maintenant();
      const patch = {
        etat,
        seq: duel.seq + 1,
        tour: etat.tour,
        dernier_coup: new Date(depart).toISOString(),
        echeance: echeanceDe(duel.mode, depart),
        ...(await issue(duel, etat)),
      };
      const maj = await magasin.mettreAJourDuel(duel.code, duel.seq, patch);
      if (!maj) return refus(409, 'sequence', { seq: (await magasin.duelParCode(duel.code))?.seq ?? null });

      await magasin.journaliser({
        code: duel.code,
        seq: patch.seq,
        acteur_id: joueur.id,
        siege: vu.siege,
        intention: corps.intention,
        resultat: 'ok',
      });
      return etatPublic({ ...duel, ...patch }, vu.siege);
    },

    async refuser(joueur, corps) {
      const vu = await duelDuJoueur(corps.code, joueur.id);
      if (vu.erreur) return vu.erreur;
      if (vu.duel.statut !== 'invitation') return refus(409, 'partie-close');
      const maj = await magasin.mettreAJourDuel(vu.duel.code, vu.duel.seq ?? 0, {
        statut: 'refusee',
        dernier_coup: new Date(maintenant()).toISOString(),
      });
      if (!maj) return refus(409, 'course');
      return reponse(200, { ok: true, code: maj.code, statut: 'refusee' });
    },

    async abandonner(joueur, corps) {
      const vu = await duelDuJoueur(corps.code, joueur.id);
      if (vu.erreur) return vu.erreur;
      if (vu.duel.statut !== 'en_cours') return refus(409, 'partie-close');
      const adversaire = rpgPvpAutreCote(vu.siege);
      const maj = await magasin.mettreAJourDuel(vu.duel.code, vu.duel.seq ?? 0, {
        statut: 'terminee',
        gagnant_id: adversaire === 'joueur' ? vu.duel.hote_id : vu.duel.invite_id,
        fin_raison: 'abandon',
        dernier_coup: new Date(maintenant()).toISOString(),
      });
      if (!maj) return refus(409, 'course');
      return reponse(200, {
        ok: true, code: maj.code, statut: 'terminee', gagnant_id: maj.gagnant_id, fin_raison: 'abandon',
      });
    },
  };

  /* ---------------------------------------------------------------- */
  /* Point d'entrée                                                    */
  /* ---------------------------------------------------------------- */

  return async function arbitrer(request) {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      // Sonde de mise en service : elle ne demande pas de compte et ne révèle
      // rien — c'est ce qu'on ouvre dans un navigateur pour vérifier que la
      // fonction est bien déployée (docs/rpg/17-pvp-multijoueur.md §8.9).
      if (request.method === 'GET') {
        return reponse(200, { ok: true, service: 'sablier-duel', version: RPG_PVP_VERSION });
      }
      if (request.method !== 'POST') return refus(405, 'methode');

      const { corps, erreur } = await lireCorps(request);
      if (erreur === 'trop-long') return refus(413, 'trop-long');
      if (erreur) return refus(400, 'json');
      if (!ACTIONS.includes(corps.action)) return refus(400, 'action');

      const jeton = jetonDe(request);
      const joueur = jeton ? await authentifier(jeton) : null;
      if (!joueur?.id) return refus(401, 'connexion');

      return await actions[corps.action](joueur, corps);
    } catch (error) {
      // Jamais de détail interne au client : l'état d'une partie ne doit pas
      // fuir dans une trace d'erreur.
      console.error('[sablier-arbitre]', error?.message ?? error);
      return refus(500, 'interne');
    }
  };
}
