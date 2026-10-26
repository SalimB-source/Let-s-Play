/**
 * Le Sablier en ligne — le salon, sans React.
 * ------------------------------------------
 * Ce que l'écran du salon (`RpgPvpSalon.jsx`) décide, isolé ici pour être
 * testé sans DOM : quel écran montrer selon le statut d'un défi, quel message
 * d'invitation écrire, quel deck proposer, et comment relire une carte de
 * défi reçue dans la messagerie.
 *
 * Rien ici ne parle réseau : ce sont des fonctions pures sur une réponse de
 * l'arbitre (`rpgPvpApi.js`) ou une ligne de message.
 */

import { RPG_DECKS } from './rpgCards.js';
import { deckEstSelectionnable } from './rpgDeckChoice.js';
import { rpgPvpCodeValide, rpgPvpLienDefi } from './rpgPvp.js';

/** La page de jeu, telle que déclarée dans `src/main.jsx`. */
export const RPG_PVP_JEU_CHEMIN = '/jeu/sablier-de-bab-el';

/** Salon d'un défi : `/jeu/sablier-de-bab-el/defi/AB12CD34`. */
export function lienSalon(code, base = '') {
  return rpgPvpLienDefi(code, base);
}

/** Le salon sans code : création d'un défi, saisie d'un code. */
export function cheminSalon() {
  return `${RPG_PVP_JEU_CHEMIN}/defi`;
}

/**
 * Les decks qu'un joueur peut aligner en ligne : **ses** decks —
 * celui de son coffret et ceux de l'atelier. Depuis les coffrets de bienvenue,
 * l'étagère du catalogue est vide ; l'appelant passe donc les decks de la
 * maison (`chargerDecksMaison`).
 */
export function decksPourDefi(decks = RPG_DECKS) {
  return (Array.isArray(decks) ? decks : []).filter((deck) => deckEstSelectionnable(deck));
}

/**
 * L'écran du salon, déduit d'une réponse `etat`/`rejoindre` de l'arbitre.
 *
 *   connexion     — pas de compte Supabase : on invite à se connecter
 *   chargement    — rien reçu encore
 *   inconnu       — code faux, défi supprimé
 *   expire        — invitation périmée
 *   refuse        — défi refusé (ou annulé par l'hôte)
 *   attente       — invitation vivante, je suis l'hôte : lien à partager
 *   a-rejoindre   — invitation vivante qui m'est adressée : choisir un deck
 *   en-cours      — la partie se joue
 *   termine       — la partie est finie
 */
export function etatSalon(vue, { disponible = true, chargement = false } = {}) {
  if (!disponible) return 'connexion';
  if (chargement) return 'chargement';
  if (!vue) return 'chargement';
  if (!vue.ok) {
    if (vue.raison === 'duel-inconnu' || vue.raison === 'code-invalide') return 'inconnu';
    if (vue.raison === 'pas-participant') return 'inconnu';
    return 'erreur';
  }
  if (vue.statut === 'refusee') return 'refuse';
  if (vue.statut === 'expiree') return 'expire';
  if (vue.statut === 'terminee') return 'termine';
  if (vue.statut === 'en_cours') return 'en-cours';
  return vue.siege === 'joueur' ? 'attente' : 'a-rejoindre';
}

/**
 * Suis-je l'hôte de ce défi ? Vrai aussi quand l'arbitre ne renvoie pas les
 * identifiants (vue minimale) : le siège suffit.
 */
export function suisHote(vue) {
  return vue?.siege === 'joueur';
}

/** Puis-je rejoindre cette invitation ? (elle m'est adressée, ou ouverte à qui a le code) */
export function peutRejoindre(vue, uid) {
  if (!vue?.ok || vue.statut !== 'invitation') return false;
  if (vue.siege) return false;                     // déjà assis dedans
  if (vue.hote_id && vue.hote_id === uid) return false;
  return !vue.invite_id || vue.invite_id === uid;
}

/**
 * Le résultat vu par `uid` : `gagne`, `perdu`, `nul`, ou `null` si la partie
 * n'est pas finie. Un duel abandonné compte comme une défaite — c'est écrit
 * dans `fin_raison`.
 */
export function resultatSalon(vue, uid) {
  if (!vue?.ok || vue.statut !== 'terminee') return null;
  if (vue.fin_raison === 'nul' || !vue.gagnant_id) return 'nul';
  return vue.gagnant_id === uid ? 'gagne' : 'perdu';
}

/** Le texte du message d'invitation (corps lisible ; le lien est dans `payload`). */
export function messageDefi({ nom = 'Un joueur' } = {}) {
  return `${nom} te défie au Sablier — ouvre le défi pour choisir ton deck.`;
}

/**
 * Le contenu typé du message : le code seulement. Le statut du défi n'y est
 * jamais recopié — la carte l'interroge à l'arbitre, donc elle ne peut pas
 * mentir (voir docs/rpg/17-pvp-multijoueur.md §4.1).
 */
export function payloadDefi({ code, deckNom = null } = {}) {
  const propre = String(code ?? '').toUpperCase();
  if (!rpgPvpCodeValide(propre)) return null;
  return { code: propre, mode: 'live', ...(deckNom ? { deckNom: String(deckNom).slice(0, 60) } : {}) };
}

/**
 * Relit une carte de défi dans un message (`kind: 'defi-sablier'`). Tolère un
 * `payload` absent ou abîmé : mieux vaut ne rien afficher qu'une carte fausse.
 */
export function invitationDepuisMessage(message) {
  if (!message || message.kind !== 'defi-sablier') return null;
  const code = String(message.payload?.code ?? '').toUpperCase();
  if (!rpgPvpCodeValide(code)) return null;
  return {
    code,
    mode: 'live',
    deckNom: message.payload?.deckNom ?? null,
  };
}

/** Compte à rebours lisible : `01:23`, ou `—` sans échéance. */
export function tempsRestant(echeance, maintenant = Date.now()) {
  const fin = Date.parse(echeance ?? '');
  if (!Number.isFinite(fin)) return '—';
  const reste = Math.max(0, fin - maintenant);
  const minutes = Math.floor(reste / 60000);
  const secondes = Math.floor((reste % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}

/** Les libellés du salon, en un seul endroit. */
export const SALON_TEXTES = {
  attente: 'Ton défi est prêt. Envoie le lien à ton adversaire — la partie commencera dès qu’il aura choisi son deck.',
  'a-rejoindre': 'Un joueur te défie. Choisis ton deck pour commencer.',
  'en-cours': 'La partie est en cours.',
  termine: 'La partie est terminée.',
  refuse: 'Ce défi a été refusé.',
  expire: 'Ce défi a expiré. Crée-en un nouveau.',
  inconnu: 'Ce lien ne correspond à aucun défi. Vérifie le code.',
  connexion: 'Connecte-toi pour jouer en ligne : le duel a besoin de ton compte.',
  erreur: 'Le salon est momentanément indisponible. Réessaie dans un instant.',
};
