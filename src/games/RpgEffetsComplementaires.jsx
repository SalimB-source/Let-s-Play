import React from 'react';
import './rpg-effets-complementaires.css';

/** Accent de contact pour une carte effectivement blessée, sans cacher son texte. */
export function RpgFissureImpact() {
  return <svg className="rpg-fissure-impact" viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true"><path d="M43 33 50 43 45 53 55 62 50 74 57 83 M50 43 62 38 69 29 M45 53 35 55 28 64 M55 62 65 66 71 76" /></svg>;
}

/** Réemploie le changement de tour déjà confirmé et son jeton. */
export function RpgVagueTour({ annonce }) {
  if (!annonce || !['joueur', 'sorcier'].includes(annonce.camp)) return null;
  return <span key={annonce.token} className={`rpg-vague-tour is-${annonce.camp}`} aria-hidden="true"><i /><i /><i /></span>;
}

/** Repli autonome : les cartes partagées disposent déjà de leur éclatement. */
export function RpgEclatsBouclier({ effet, entite }) {
  if (!effet || !entite || entite.bouclier > 0 || entite.bouclierLumiere || entite.protection) return null;
  return <span className="rpg-eclats-bouclier-autonome" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>;
}
