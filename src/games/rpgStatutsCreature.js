/** La Rapidité imprimée ou accordée annule le mal d’invocation. */
export const rpgSouffreMalInvocation = (entite) => Boolean(entite?.malInvocation && !entite.rapidite && !entite.rapiditeAccordee);
