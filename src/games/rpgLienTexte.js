/**
 * Le TEXTE d'un Lien — la phrase qui nomme son ancre, dans la fiche imprimée.
 *
 * Format du catalogue, tenu par `tests/rpg-liens.test.js` : la phrase s'écrit
 * à la fin du texte, dit **la différence seule**, et commence toujours par
 * « Avec » pour finir par « en jeu : … ».
 *
 *     Avec la Valkyrie des glaces en jeu : 3 dégâts au lieu de 2.
 *
 * Ces deux motifs sont la seule définition de « qu'est-ce qu'une ligne de
 * Lien » dans le code : l'icône d'effet s'en écarte (`effetIcons.js`, une
 * phrase conditionnelle ne porte pas le pictogramme d'un effet) et la fiche
 * la met en retrait tant qu'elle n'est pas vraie (`RpgCardRules.jsx`).
 */

/** La phrase entière, où qu'elle soit dans le texte. */
export const LIEN_PHRASE = /Avec .+? en jeu\s*:[^.]*\./u;

/** Une ligne qui EST la phrase de Lien (l'aperçu découpe le texte par phrase). */
export const LIEN_LIGNE = /^Avec .+? en jeu\s*:/u;

/** Cette ligne de règle est-elle la phrase d'un Lien ? */
export function estLigneDeLien(ligne) {
  return LIEN_LIGNE.test(String(ligne ?? '').trim());
}

/**
 * Découpe un texte de carte autour de sa phrase de Lien.
 *
 * Rend une liste de morceaux `{ texte, lien }` — un seul morceau quand la
 * carte n'a pas de Lien, ou quand le texte fourni n'est déjà que la phrase.
 */
export function decouperLien(text) {
  const phrase = String(text ?? '');
  const trouve = phrase.match(LIEN_PHRASE);
  if (!trouve) return [{ texte: phrase, lien: false }];
  const avant = phrase.slice(0, trouve.index).trim();
  const apres = phrase.slice(trouve.index + trouve[0].length).trim();
  return [
    avant && { texte: avant, lien: false },
    { texte: trouve[0], lien: true },
    apres && { texte: apres, lien: false },
  ].filter(Boolean);
}
