/**
 * Le client du Sablier en ligne — trois fonctions et un `fetch`.
 *
 * Tout passe par l'arbitre (`api/sablier-duel.js`) : le navigateur n'envoie
 * **qu'une intention** et ne reçoit **qu'une vue filtrée**. Aucun état de duel
 * n'est calculé ni conservé ici, ce qui garantit qu'un client bricolé ne peut
 * pas se donner une carte, un mana ou une victoire.
 *
 * Le module est volontairement pauvre : pas de cache, pas de react state, pas
 * de retry silencieux. L'écran (P2) décidera quand rafraîchir ; les tests
 * n'importent que `estDisponible` et `lienDefi`, qui n'appellent rien.
 */

import { supabase } from '../lib/supabase';
import { RPG_PVP_CHEMIN, rpgPvpLienDefi } from './rpgPvp.js';

/** Route de l'arbitre (déployée par Vercel, exclue du repli SPA). */
export const SABLIER_API = '/api/sablier-duel';

/** Route de secours Vercel (utile depuis GitHub Pages ou le client PC). */
export const SABLIER_API_DISTANT = 'https://let-s-play-nu.vercel.app/api/sablier-duel';

/**
 * Ordonne les routes possibles de l'arbitre :
 *   1. la route locale `/api/sablier-duel` (hors GitHub Pages statique) ;
 *   2. la fonction Edge Supabase (`.../functions/v1/sablier-duel`) du projet ;
 *   3. l'origine Vercel de production.
 */
export function routesArbitre() {
  const routes = [];
  const hote = typeof window !== 'undefined' ? (window.location?.hostname || '') : '';
  const origine = typeof window !== 'undefined' ? (window.location?.origin || '') : '';
  if (!/\.github\.io$/i.test(hote)) {
    routes.push(SABLIER_API);
  }
  const urlSupabase = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
    || supabase?.supabaseUrl
    || ''
  ).trim().replace(/\/$/, '');
  if (urlSupabase) {
    routes.push(`${urlSupabase}/functions/v1/sablier-duel`);
  }
  if (!origine || !SABLIER_API_DISTANT.startsWith(origine)) {
    routes.push(SABLIER_API_DISTANT);
  }
  return routes.length ? routes : [SABLIER_API];
}

/**
 * Le PvP est-il branchable ? Il faut un compte Supabase (pour le jeton) ; la
 * disponibilité réelle du serveur se découvre au premier appel
 * (`raison: 'arbitre-indisponible'` ou `'reseau'`).
 */
export function sablierPvpDisponible() {
  return Boolean(supabase);
}

/**
 * Intervalle de sondage pendant que c'est au tour de l'autre (ms).
 * L'onglet caché sonde moins : c'est le premier levier contre le quota
 * d'invocations (docs/rpg/17-pvp-multijoueur.md §8.6).
 */
export function cadenceSondage(cache = false) {
  return cache ? 10000 : 2000;
}

/** Le lien cliquable à coller dans un message : `…/jeu/sablier-de-bab-el/defi/CODE`. */
export function lienDefi(code, base = typeof window === 'undefined' ? '' : window.location.origin) {
  return rpgPvpLienDefi(code, base);
}

/** Chemin interne d'un lien de défi, pour le routeur. */
export function cheminDefi(code) {
  return `${RPG_PVP_CHEMIN}/defi/${code}`;
}

let jetonMemoire = null;

/** Le jeton d'accès Supabase courant (rafraîchi par supabase-js). */
async function jeton() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    jetonMemoire = data?.session?.access_token ?? jetonMemoire;
  } catch { /* hors ligne : on garde le dernier jeton connu, s'il y en a un */ }
  return jetonMemoire;
}

/** Un appel à l'arbitre. Rend toujours un objet : `{ ok: true }` ou `{ ok: false, raison }`. */
async function appeler(corps) {
  if (!supabase) return { ok: false, raison: 'hors-ligne' };
  const acces = await jeton();
  if (!acces) return { ok: false, raison: 'connexion' };
  const cibles = routesArbitre();
  let derniereErreur = { ok: false, raison: 'reseau' };

  for (const url of cibles) {
    try {
      const requete = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${acces}` },
        body: JSON.stringify(corps),
      });
      const donnees = await requete.json().catch(() => null);
      if (!donnees || typeof donnees !== 'object') {
        derniereErreur = { ok: false, raison: 'reponse', status: requete.status };
        continue;
      }
      if (requete.ok && donnees.ok) return donnees;
      const echec = { ok: false, ...donnees, status: requete.status };
      // Une réponse métier de l'arbitre (coup illégal, duel inconnu, invitation
      // déjà ouverte…) est définitive : inutile d'interroger les routes de secours.
      if (
        donnees.raison
        && donnees.raison !== 'arbitre-indisponible'
        && donnees.raison !== 'interne'
        && donnees.raison !== 'methode'
      ) {
        return echec;
      }
      derniereErreur = echec;
    } catch {
      derniereErreur = { ok: false, raison: 'reseau' };
    }
  }
  return derniereErreur;
}

/** Crée un défi. `visibilite: 'amis'` exige `inviteId` ; `'lien'` ouvre le défi à qui a le code. */
export function ouvrirDefi({ deck, visibilite = 'amis', inviteId = null, mode = 'live' }) {
  return appeler({ action: 'ouvrir', deck, visibilite, invite_id: inviteId, mode });
}

/** Rejoint un défi : rend la vue du siège `sorcier`. */
export function rejoindreDefi({ code, deck }) {
  return appeler({ action: 'rejoindre', code, deck });
}

/** Relit une partie (à faire au montage, puis au sondage). */
export function etatDefi(code) {
  return appeler({ action: 'etat', code });
}

/**
 * Joue une intention. `seq` est le numéro de la dernière vue reçue : s'il a
 * bougé, le serveur refuse (409) et renvoie la vue à jour — c'est ce qui
 * empêche un double-clic ou un rejeu réseau de jouer deux fois.
 */
export function jouerIntention({ code, seq, intention }) {
  return appeler({ action: 'jouer', code, seq, intention });
}

/** Refuse une invitation (l'invité) ou annule son propre défi (l'hôte). */
export function refuserDefi(code) {
  return appeler({ action: 'refuser', code });
}

/** Abandonne une partie en cours : la victoire va à l'autre camp. */
export function abandonnerDefi(code) {
  return appeler({ action: 'abandonner', code });
}
