/**
 * Les liens dans un message.
 *
 * Un message est du texte libre — c'est même la règle de la messagerie : on
 * n'y stocke ni balise ni HTML. Mais un joueur colle forcément une adresse :
 * « viens, on joue ici https://… ». Sans découpage, la bulle l'affiche en texte
 * mort, et le destinataire doit sélectionner l'URL puis la coller à la main.
 *
 * `decouperLiens` fait ce découpage **sans rien interpréter** : il ne reconnaît
 * que `http://`, `https://` et `www.`, rend le texte tel quel entre deux liens,
 * et laisse l'appelant décider comment l'afficher. Aucun schéma exotique
 * (`javascript:`, `data:`) ne peut donc sortir d'ici : ils ne sont pas dans la
 * liste, ils restent du texte.
 *
 * Les fonctions sont pures et testées dans `tests/messages-liens.test.js`.
 */

/** Une URL candidate : un schéma http(s) ou `www.`, puis tout sauf un blanc. */
const CANDIDAT = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

/** Ponctuation qui termine une phrase, pas l'URL qui la précède. */
const FIN_DE_PHRASE = /[.,;:!?…]+$/;

/** Fermetures ramassées par erreur quand la parenthèse ouvrante est hors URL. */
const FERMETURES = { ')': '(', ']': '[', '}': '{', '»': '«' };

/**
 * Retire la ponctuation finale et les fermetures non appariées.
 *
 * `« regarde https://exemple.fr/a_(b) »` doit garder `(b)` (équilibré) mais
 * `(voir https://exemple.fr/x)` doit perdre la parenthèse fermante : elle
 * appartient à la phrase.
 */
function rogner(bout) {
  let texte = bout;
  for (;;) {
    const avant = texte;
    texte = texte.replace(FIN_DE_PHRASE, '');
    const dernier = texte.at(-1);
    const ouvrante = dernier ? FERMETURES[dernier] : undefined;
    if (ouvrante) {
      const ouvertes = texte.split(ouvrante).length - 1;
      const fermees = texte.split(dernier).length - 1;
      if (fermees > ouvertes) texte = texte.slice(0, -1);
    }
    if (texte === avant) return texte;
  }
}

/** Le lien affichable → son adresse réelle (seul `www.` a besoin d'un schéma). */
function adresse(texte) {
  return /^www\./i.test(texte) ? `https://${texte}` : texte;
}

/**
 * Découpe un message en morceaux de texte et de liens.
 *
 * @param {string} texte
 * @returns {{ type: 'texte'|'lien', valeur: string, href?: string }[]}
 *   Un seul morceau `texte` quand il n'y a rien à lier — l'appelant peut alors
 *   rendre la chaîne d'origine, sans nœud supplémentaire.
 */
export function decouperLiens(texte) {
  if (typeof texte !== 'string' || !texte) return [];

  const morceaux = [];
  let position = 0;
  for (const trouve of texte.matchAll(CANDIDAT)) {
    const debut = trouve.index;
    const bout = rogner(trouve[0]);
    // Un candidat qui n'est plus qu'un schéma (`https://`) n'est pas un lien.
    if (!bout || /^https?:\/\/$/i.test(bout)) continue;

    if (debut > position) morceaux.push({ type: 'texte', valeur: texte.slice(position, debut) });
    morceaux.push({ type: 'lien', valeur: bout, href: adresse(bout) });
    position = debut + bout.length;
  }
  if (position < texte.length) morceaux.push({ type: 'texte', valeur: texte.slice(position) });

  // Message sans lien : on rend la chaîne exacte, sans la découper en morceaux
  // inutiles (le rendu reste identique, les tests de texte aussi).
  if (!morceaux.some((morceau) => morceau.type === 'lien')) {
    return [{ type: 'texte', valeur: texte }];
  }
  return morceaux;
}

/** Le message contient-il au moins un lien ? (aperçus, indicateurs) */
export function contientLien(texte) {
  return decouperLiens(texte).some((morceau) => morceau.type === 'lien');
}
