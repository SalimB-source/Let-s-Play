/**
 * Entrée du banc d'essai « deux joueurs » — compilée par
 * `scripts/calls-e2e-check.mjs` (build Vite `--ssr`), jamais exécutée seule.
 *
 * Contrairement à `calls-smoke.jsx` (rendu SSR, aucun appel possible entre
 * personas), ce fichier ré-exporte la vraie pile d'appels — `CallsProvider`,
 * `CallOverlays`, les contextes amis / messagerie et le client Supabase — pour
 * que le script de vérification puisse monter **deux joueurs réels côte à
 * côte** (deux arbres React, deux canaux, deux connexions WebRTC simulées) et
 * dérouler un appel de bout en bout : sonnerie entrante, réponse, refus,
 * média, raccrocher.
 *
 * Tout ce qui dépend du navigateur (WebRTC, Realtime, base de données) est
 * remplacé côté script par des bouchons installés AVANT l'import de ce module
 * compilé : le code testé reste celui de l'application.
 */
import { AuthProvider } from '../src/auth/AuthContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { FriendsContext } from '../src/friends/FriendsContext';
import { MessagesContext } from '../src/messages/MessagesContext';
import { CallsProvider, useCalls } from '../src/messages/CallsContext';
import CallOverlays from '../src/messages/CallOverlays';
import { supabase } from '../src/lib/supabase';

export { AuthProvider, LanguageProvider, FriendsContext, MessagesContext, CallsProvider, useCalls, CallOverlays, supabase };

export {
  CONNECT_TIMEOUT_MS,
  ENDED_TOAST_MS,
  END_BUSY,
  END_CANCELLED,
  END_DECLINED,
  END_FAILED,
  END_HUNG_UP,
  END_LOST,
  END_NO_ANSWER,
  INCOMING_TIMEOUT_MS,
  OUTGOING_TIMEOUT_MS,
  inboxChannelFor,
} from '../src/messages/callsCore';
export { callsText } from '../src/messages/callsCopy';
