import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievements } from './AchievementContext';
import { dayKey } from './engine';
import { describeRoute, linkedProviders } from './routeActions';
import { scopeForUser } from './storage';
import { VIDEO_PLAYED_EVENT } from '../lib/videoPlayback';

/**
 * Suivi automatique des actions « de passage ».
 * --------------------------------------------
 * Monté une fois dans `Layout`, ce composant silencieux transforme la
 * navigation en succès, sans qu'aucune page n'ait à s'en occuper :
 *
 *   - chaque visite datée (succès de fidélité : série de jours, jours cumulés) ;
 *   - chaque changement de langue ;
 *   - chaque route ouverte : section visitée + article lu (actu / test /
 *     dossier, mémorisé par slug) ;
 *   - chaque session connectée : connexion, création de compte récente,
 *     comptes tiers associés (Google / Microsoft).
 *
 * Les autres actions (lecture d'une vidéo, commentaire, recherche) sont
 * signalées par les composants concernés — `useAchievementAction()`.
 */
export default function AchievementTracker() {
  const { track, stateScope } = useAchievements();
  const location = useLocation();
  const { lang } = useLanguage();
  const { user, isDemo } = useAuth();
  const seenUser = useRef(null);

  // Visite du jour : appelée une fois par chargement de page.
  useEffect(() => {
    track('visit', { day: dayKey() });
  }, [track]);

  // Langue utilisée (une par langue, le moteur ne compte pas les doublons).
  // Le site étant publié en français, seul `fr` est enregistré : les succès
  // « Polyglotte » et « Trilingue » restent au catalogue pour les joueurs qui
  // les ont obtenus, mais ne peuvent plus être débloqués (voir catalog.js).
  useEffect(() => {
    track('language_used', { code: lang });
  }, [lang, track]);

  // Route ouverte : section + article éventuel.
  useEffect(() => {
    const { section, article } = describeRoute(location.pathname);
    track('page_view');
    if (section) track('section_visited', { id: section });
    if (article) track('article_read', { kind: article.kind, id: article.id });
  }, [location.pathname, track]);

  // Lecture d'une vidéo : le coordinateur « une seule vidéo à la fois »
  // (src/lib/videoPlayback.js) annonce chaque démarrage, y compris le direct.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPlayed = (event) => track('video_played', { id: event?.detail?.id || 'video' });
    window.addEventListener(VIDEO_PLAYED_EVENT, onPlayed);
    return () => window.removeEventListener(VIDEO_PLAYED_EVENT, onPlayed);
  }, [track]);

  // Session connectée. Un compte créé il y a moins d'une heure compte comme
  // une inscription (couvre l'inscription par e-mail confirmé, puis la
  // première connexion, ainsi que les retours d'OAuth).
  useEffect(() => {
    const id = user?.id;
    if (!id || isDemo || seenUser.current === id) return;
    // À la connexion, l'état chargé est encore celui du joueur précédent
    // (progression invité de l'appareil) : attendre que le contexte ait
    // basculé vers la progression du compte, sinon les succès de session
    // (connexion, inscription, comptes liés) seraient crédités à l'invité
    // puis perdus à la bascule.
    if (stateScope !== scopeForUser(id)) return;
    seenUser.current = id;
    track('signed_in');
    const createdAt = Date.parse(user?.created_at || '');
    if (Number.isFinite(createdAt) && Date.now() - createdAt < 60 * 60 * 1000) track('account_created');
    linkedProviders(user).forEach((provider) => track('provider_linked', { provider }));
  }, [user, isDemo, track, stateScope]);

  return null;
}
