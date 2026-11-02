import { cardColors } from './rpgCards.js';

/** Une cible adverse reste légale, mais son bouclier peut intercepter le sort. */
export function rpgSortBloqueParBouclier(entite, carte) {
  if (!entite || carte?.kind !== 'magie') return false;
  if ((Number(entite.bouclier) || 0) > 0) return true;
  const couleurs = cardColors(carte);
  return [entite.protection?.contre].flat(Infinity).filter(Boolean)
    .some((couleur) => couleurs.includes(couleur));
}

/** Forces de base des blocages annoncés, sans simuler ni avancer le hasard. */
export function rpgApercuBlocages(duel, combat) {
  if (!duel || !combat) return [];
  const cote = combat.coteAttaquant === 'joueur' ? 'joueur' : 'sorcier';
  const defense = cote === 'joueur' ? 'sorcier' : 'joueur';
  return (combat.attaquants ?? []).flatMap((id) => {
    if (combat.ciblesAttaque?.[id]) return [];
    const attaquant = duel[cote]?.creatures.find((e) => e.id === id);
    const bloqueurs = (combat.blocages?.[id] ?? [])
      .map((blocId) => duel[defense]?.creatures.find((e) => e.id === blocId)).filter(Boolean);
    if (!attaquant || !bloqueurs.length) return [];
    const repartition = combat.repartitions?.[id] ?? {};
    const attaquesBloqueurs = bloqueurs.map((e) => Math.max(0, Number(e.atk) || 0));
    const alertes = [];
    if ([attaquant, ...bloqueurs].some((e) => e.esquive)) alertes.push('Esquive possible');
    if ([attaquant, ...bloqueurs].some((e) => e.coupCritique)) alertes.push('critique possible');
    if ([attaquant, ...bloqueurs].some((e) => e.bouclierLumiere)) alertes.push('bouclier de lumière');
    if ([attaquant, ...bloqueurs].some((e) => e.contreAttaque)) alertes.push('Contre-attaque possible');
    if (attaquant.overkill) alertes.push('Overkill possible');
    const force = Math.max(0, Number(attaquant.atk) || 0);
    const prioritaire = combat.prioritesRepartition?.[id];
    const prioriteValide = bloqueurs.length > 1 && bloqueurs.some((e) => e.id === prioritaire);
    const adversaires = bloqueurs.map((e, index) => ({ id: e.id, nom: e.name,
      attaque: attaquesBloqueurs[index], defense: e.pv,
      repartition: bloqueurs.length === 1 ? force : prioriteValide ? (e.id === prioritaire ? force : 0)
        : Number.isFinite(Number(repartition[e.id])) ? Math.max(0, Number(repartition[e.id])) : null }));
    // Comparaison brute, pas une simulation : effets, esquive, capacités,
    // bouclier de lumière et critique peuvent modifier ou annuler ces dégâts.
    const risques = [];
    if (Number(attaquant.pv) > 0 && attaquesBloqueurs.reduce((a, b) => a + b, 0) >= Number(attaquant.pv)) risques.push(attaquant.name);
    for (const cible of adversaires) {
      if (Number(cible.defense) > 0 && cible.repartition != null && cible.repartition >= Number(cible.defense)) risques.push(cible.nom);
    }
    return [{ id, attaquant: attaquant.name, force, defense: attaquant.pv,
      bloqueurs: adversaires, alertes, risques }];
  });
}
