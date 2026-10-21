/**
 * `POST /api/sablier-duel` — l'enveloppe Vercel de l'arbitre du Sablier.
 *
 * Le cœur du jeu est dans `src/server/sablierArbitre.js` (Request → Response,
 * sans dépendance) : ce fichier ne fait que trois choses, et c'est tout ce qui
 * le distingue d'une version Deno ou Cloudflare —
 *
 *   1. traduire la requête Node de Vercel en `Request` web standard ;
 *   2. fournir le magasin Supabase (clé **service**, jamais exposée au client) ;
 *   3. traduire la `Response` en réponse Node.
 *
 * Variables d'environnement (Vercel → Settings → Environment Variables) :
 *
 *   SUPABASE_URL               (ou VITE_SUPABASE_URL, déjà présent au build)
 *   SUPABASE_SERVICE_ROLE_KEY  secrète, jamais préfixée VITE_
 *
 * Sans ces variables, la route répond `503 arbitre-indisponible` : le site
 * reste parfaitement fonctionnel, le PvP est simplement hors service.
 *
 * `vercel.json` n'a rien à changer : son repli SPA exclut déjà `/api/*`.
 */

import { createClient } from '@supabase/supabase-js';
import { creerArbitre } from '../src/server/sablierArbitre.js';

/** La réponse de l'arbitre quand la configuration manque. */
function indisponible(res) {
  res.status(503).setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({ ok: false, raison: 'arbitre-indisponible' }));
}

/** Les en-têtes Node de Vercel → `Headers` web (les valeurs multiples sont jointes). */
function entetes(req) {
  const sortie = new Headers();
  for (const [cle, valeur] of Object.entries(req.headers || {})) {
    if (Array.isArray(valeur)) valeur.forEach((v) => sortie.append(cle, v));
    else if (valeur !== undefined) sortie.set(cle, String(valeur));
  }
  return sortie;
}

/** Le corps brut, que Vercel l'ait déjà parsé (objet) ou laissé en flux. */
async function corpsBrut(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return JSON.stringify(req.body);
  }
  const morceaux = [];
  for await (const morceau of req) morceaux.push(morceau);
  return Buffer.concat(morceaux).toString('utf8');
}

/** Le magasin Supabase : le contrat décrit dans `sablierArbitre.js`. */
function magasinSupabase(sb) {
  const TABLE = 'rpg_sablier_duels';

  return {
    async duelParCode(code) {
      const { data, error } = await sb.from(TABLE).select('*').eq('code', code).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },

    async insererDuel(ligne) {
      const { data, error } = await sb.from(TABLE).insert(ligne).select().single();
      if (error) throw error;
      return data;
    },

    /**
     * Écriture optimiste : la ligne n'est modifiée que si son `seq` est encore
     * celui qu'on a lu. Deux actions simultanées ne peuvent donc pas écraser
     * l'état l'une de l'autre — la perdante reçoit `null` (409 côté arbitre).
     */
    async mettreAJourDuel(code, seqAttendu, patch) {
      const { data, error } = await sb
        .from(TABLE)
        .update({ ...patch, maj_le: new Date().toISOString() })
        .eq('code', code)
        .eq('seq', seqAttendu)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },

    async journaliser(ligne) {
      // Le journal est un outil d'audit, pas une condition de jeu : une
      // écriture refusée ne doit jamais annuler une action déjà acceptée.
      try {
        await sb.from('rpg_sablier_duel_actions').insert(ligne);
      } catch { /* silencieux */ }
    },

    async nomDe(uid) {
      try {
        const { data } = await sb
          .from('profiles')
          .select('display_name, username')
          .eq('id', uid)
          .maybeSingle();
        return data?.display_name || data?.username || '';
      } catch {
        return '';
      }
    },

    async sontAmis(a, b) {
      try {
        const { data } = await sb
          .from('friendships')
          .select('id')
          .eq('status', 'accepted')
          .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
          .limit(1);
        return Boolean(data?.length);
      } catch {
        return false;
      }
    },

    /** De quoi vérifier qu'un deck composé est réellement possédé. */
    async etatSablier(uid) {
      try {
        const { data } = await sb
          .from('rpg_sablier_progress')
          .select('state')
          .eq('user_id', uid)
          .maybeSingle();
        return data?.state ?? null;
      } catch {
        return null;
      }
    },
  };
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return indisponible(res);

  // Une instance par invocation : pas de session persistée (clé service).
  const sb = createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const arbitrer = creerArbitre({
    magasin: magasinSupabase(sb),
    // Le jeton de l'utilisateur est vérifié par Supabase lui-même : on ne fait
    // jamais confiance à un identifiant envoyé dans le corps de la requête.
    authentifier: async (jeton) => {
      const { data, error } = await sb.auth.getUser(jeton);
      if (error || !data?.user?.id) return null;
      return { id: data.user.id, nom: data.user.user_metadata?.gamertag || '' };
    },
  });

  const requete = new Request('https://arbitre.sablier.local/', {
    method: req.method,
    headers: entetes(req),
    body: req.method === 'POST' ? await corpsBrut(req) : undefined,
  });

  const reponse = await arbitrer(requete);
  res.status(reponse.status);
  res.setHeader('content-type', reponse.headers.get('content-type') || 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(await reponse.text());
}
