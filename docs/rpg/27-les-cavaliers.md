# 27 — Le cycle des cinq Cavaliers

**Statut : codé et jouable.** Cinq créatures hybrides dessinent un cycle fermé :
Braise → Eau → Neige → Sable → Ténèbres → Braise. Chaque couleur figure deux
fois. Le cavalier sans nom ([fiche 26](26-le-cavalier-sans-nom.md)) ajoute une
sixième paire, Eau + Ténèbres, sans faire partie du pentagone.

| Cavalier | Couleurs | Coût | ATQ / DEF | Rareté | Révélation |
| --- | --- | ---: | --- | --- | --- |
| De vapeur | Braise + Eau | 4 | 3 / 3 | Rare | Souk, étage 4 |
| Du ressac gelé | Eau + Neige | 6 | 4 / 6 | Mythique | Abysses, étage 4 |
| Des dunes gelées | Sable + Neige | 4 | 2 / 4 | Rare | Fjord, étage 2 |
| Du cimetière | Sable + Ténèbres | 5 | 4 / 4 | Rare | Nécropole, étage 3 |
| Du bûcher | Braise + Ténèbres | 5 | 4 / 3 | Rare | Nécropole, étage 3 |

Chaque coût comprend un mana de chacune des deux couleurs. Les cinq sont hors
dotation de départ, disponibles au Souk (150 ◈ pour une rare, 300 ◈ pour la
mythique) et dans le vivier des boosters. Trois paires étaient absentes des
créatures du catalogue : Braise + Eau, Eau + Neige et Sable + Neige.

## Les effets

- **Vapeur** : à son arrivée, inflige 2 dégâts à une créature adverse ciblée ;
  lorsqu'il bloque, renvoie la créature combattue en main **après les blessures**.
  La frappe est Braise, le renvoi Eau ; la capacité de combat ne se déclenche
  pas lorsqu'il attaque.
- **Ressac gelé** : Défenseur ; à son arrivée, gèle toutes les créatures
  adverses jusqu'à la fin de leur prochain tour. Défenseur attire les attaques
  ciblées adverses quand elles peuvent le choisir ; il ne l'empêche pas
  d'attaquer. Le gel interdit attaques et blocages.
- **Dunes gelées** : arrive avec 2 compteurs d'Heures ; au début de chacun de
  ses tours, son contrôleur en retire un. Quand le dernier part, toutes ses
  créatures, cavalier compris, gagnent définitivement +1/+1. Le Sable compte,
  la Neige renforce la rangée présente à la sonnerie.
- **Cimetière** : Tribut 2 ; à sa mort, il programme son propre retour au début
  du troisième tour suivant (on compte les tours des deux camps). Si le champ
  est plein en mode essai, il attend une place libre ; si la carte a quitté le
  cimetière, le retour se dissipe. La mort appartient aux Ténèbres, l'attente au
  Sable. Il ne réanime pas immédiatement une autre créature.
- **Bûcher** : Rapidité ; à sa mort, inflige 2 dégâts à chaque créature
  adverse, sans toucher les alliés ni les sorciers. La Braise brûle, les
  Ténèbres portent le déclenchement à la mort.

Tous les effets réutilisent les mécanismes existants du moteur ; aucune nouvelle
icône ni aucun nouveau mot-clé n'est nécessaire. Les peintures dark fantasy
sont livrées dans `public/cards/`, chacune en 768 × 960. Les cartes sont dans
`src/games/rpgCards.js`, leurs révélations dans `src/games/rpgCollection.js`.

## Vérification

`tests/rpg-cavaliers-cycle.test.js`, intégré à `npm run check:rpg`, vérifie
l'identité et la disponibilité des cartes, les images et les aperçus, ainsi
que les effets dans le moteur : frappe et blocage de Vapeur, gel et Défenseur
du Ressac, sonnerie des Dunes, Tribut et retour différé du Cimetière, charge et
embrasement du Bûcher.
