/**
 * Démarrage d'un duel dans les scénarios de vérification.
 * --------------------------------------------------------
 * Le Sablier ouvre chaque partie sur son volet de mulligan : la main de départ
 * s'affiche en grand, et la table reste close (`inert`) tant que le joueur n'a
 * pas validé son choix. Les scénarios qui décrivent le jeu lui-même n'ont rien
 * à voir avec cette étape : ils la franchissent ici, d'un clic, exactement
 * comme le ferait un joueur qui garde sa main de départ.
 */

/** Le volet de mulligan est-il ouvert sur ce conteneur ? */
export function mulliganOuvert(container) {
  return Boolean(container.querySelector('.rpg-mulligan'));
}

/**
 * Referme le volet : « valider » (aucune carte choisie = on garde la main), puis
 * « commencer le duel » si un échange a laissé une étape de résultat. Ne fait
 * rien quand il n'y a rien à valider — un duel repris, par exemple.
 * `cliquer` est l'helper `act` du scénario (il change de signature d'un fichier
 * à l'autre, d'où le paramètre).
 */
export async function passerMulligan(container, cliquer) {
  const valider = container.querySelector('.rpg-mulligan__valider');
  if (valider) await cliquer(valider);
  const commencer = container.querySelector('.rpg-mulligan__commencer');
  if (commencer) await cliquer(commencer);
  return Boolean(valider || commencer);
}
