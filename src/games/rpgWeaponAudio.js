/**
 * Détection des armes qui cassent à la dernière attaque ou défense.
 * Le moteur journalise la durabilité après chaque action ; seule la ligne
 * qui atteint zéro déclenche le son de lame brisée.
 */
export function rpgDerniersCompteursArmeDepuisJournal(lignes = []) {
  if (!Array.isArray(lignes)) return [];
  return lignes.filter((ligne) => (
    /perd un compteur de durabilité.*\(0 restants?\)\./u.test(String(ligne))
  ));
}
