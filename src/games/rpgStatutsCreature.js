/**
 * Le mal d’invocation ne ferme plus que **le pas** : une créature frappe le
 * tour de son arrivée, elle ne se déplace qu’au suivant. La Rapidité, imprimée
 * ou accordée, annule ce reste-là et la laisse glisser d’une case tout de suite.
 */
export const rpgSouffreMalInvocation = (entite) => Boolean(entite?.malInvocation && !entite.rapidite && !entite.rapiditeAccordee);
