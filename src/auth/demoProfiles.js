/**
 * Personas de démonstration.
 * --------------------------
 * Le site est passé sur une authentification Supabase réelle : **aucun compte
 * de démonstration n'est livré dans le bundle**. Un visiteur voit « Se
 * connecter » / « S'inscrire » (voir `src/components/Layout.jsx`) et jamais
 * « Explorer le compte démo » — la carte de démonstration de `src/pages/Auth.jsx`
 * ne s'affiche que si ce registre contient au moins une persona.
 *
 * Tout l'aperçu qui en dépendait (amis, messagerie, succès, hub joueur) reste
 * en place mais **dormant** : il se réactive dès qu'une persona est enregistrée
 * ici. Les scripts de vérification du dépôt (`npm run check:friends`,
 * `check:messages`, `check:achievements`) le réactivent avec les fixtures de
 * `scripts/demoFixtures.js` — c'est le seul moyen d'exercer le dock social et
 * le hub sans backend Supabase.
 */
export const DEFAULT_DEMO_KEY = 'vortex';

/** Personas disponibles : vide dans un build livré. */
export const DEMO_PROFILES = {};

/**
 * Enregistre des personas. Réservé aux scripts de vérification : rien dans
 * l'application n'appelle cette fonction.
 *
 * `DEMO_PROFILES` est partagé par référence, donc l'enregistrement est visible
 * de toute la pile — à condition d'avoir lieu avant le premier rendu. Aucun
 * module ne doit en dériver de donnée au chargement : la communauté de
 * démonstration est calculée à la demande (`demoCommunity()` dans
 * `src/friends/demoRoster.js`), précisément pour rester insensible à l'ordre
 * d'évaluation des modules.
 *
 * @param {Record<string, object>} profiles personas à enregistrer.
 * @returns {Record<string, object>} le registre, pour enchaîner.
 */
export function registerDemoProfiles(profiles) {
  Object.assign(DEMO_PROFILES, profiles);
  return DEMO_PROFILES;
}
