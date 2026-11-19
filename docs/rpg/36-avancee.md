# 36 — L'avancée des créatures (palier 2)

> État : **livré.** Les créatures se déplacent et frappent ; l'IA du sorcier
> avance aussi. Moteur `src/games/rpgMouvement.js` + `src/games/rpgMouvementIA.js`,
> interface dans `RpgDuelPage.jsx`, styles dans `rpg-mana-essai.css`.

Jusqu'ici la table était un **tableau de cartes** : chaque créature naissait sur
une case, y frappait ce qu'elle pouvait, et y mourait. Les lignes avaient un
front et un fond, mais **personne ne les franchissait** — le fond adverse restait
une zone théorique, et la règle des portées (doc 30) n'avait aucune prise : une
mêlée sans case d'en face était simplement neutralisée.

Le palier 2 ouvre le champ : une créature **marche d'une case par tour**, puis
**frappe** de sa nouvelle place.

## Les règles

1. **Une case par tour.** `RPG_MOUVEMENT_CASES = 1`, huit directions (le
   voisinage complet : devant, diagonales, côtés, derrière). Une créature déjà
   déplacée porte `bouge` ; le drapeau est remis à `false` au début de chaque
   tour, en même temps que `ready` et `attaquee`.
2. **On ne traverse pas un corps.** Une case occupée — par n'importe qui, les
   deux camps confondus (`casesOccupees`) — n'est jamais une destination.
3. **Franchir la ligne neutre se fait par une trouée.** La case du front adverse
   visée doit être **vide**, et le passage est **droit devant**, dans la même
   colonne : jamais de glissement en diagonale entre deux corps. C'est la
   décision validée : « oui, mais seulement par une trouée ».
4. **Avancer et frapper, dans cet ordre.** Le déplacement ne consomme pas
   l'attaque. Une créature qui a marché peut frapper la même créature adverse
   qu'avant — c'est le sens du palier.
5. **Rien pour un Site**, une créature gelée (`gelToursRestants`), engagée
   (`attaquee`) ou déjà déplacée. Rien hors des lignes, rien au MOBA : les modes
   historiques gardent leur table figée.
6. **Aucune contrainte de ligne.** Le placement impose une ligne
   (`ligneObligee`) ; le mouvement non. Un tireur peut monter au front, un corps
   à corps reculer au fond — c'est un choix, pas une règle.

## Où l'on se tient

Une créature garde **deux** informations :

- `campPose` : la grille où elle se trouve (`'joueur'` ou `'sorcier'`) ;
- `emplacement` : sa case **dans cette grille** (0-4 front, 5-9 fond).

`campPoseDe(entite, cote)` rend le camp de pose, `campDeLaCreature(duel, entite)`
rend le **propriétaire**. Un envahisseur est donc une carte du joueur dont
`campPose` vaut `'sorcier'` : `envahisseurs(duel, camp)` les liste,
`occupantsDeCamp(duel, camp)` rend la rangée complète, triée par case.

`avancee` marque enfin une créature qui a quitté la case que sa carte lui
imposait : `rpgEmplacementsChamp` ne la rapatrie plus au fond.

## Ce que l'écran montre

- **Choisir une créature ouvre la phase d'attaque** : les proies légales
  s'allument en cyan (inchangé), et les **cases où elle peut marcher** deviennent
  des boutons **en pointillés, avec une flèche** (`.rpg-creature-slot--deplacement`).
  Le doré reste au placement : deux invitations différentes, deux signaux
  différents.
- **Cliquer une case avance la créature** (`rpgDeplacerCreature`) ; la phase
  reste ouverte et se recalcule — elle frappe de sa nouvelle place, ou le joueur
  referme.
- **Une créature qui a percé se dessine dans la rangée qu'elle occupe**, du côté
  du sorcier comme du nôtre, avec son propre camp : le clic la traite toujours
  comme la nôtre. Les piles d'envahisseurs restent d'un seul exemplaire — deux
  cartes identiques de deux camps ne se confondent jamais.
- **Le survol** suit les mêmes portées (doc 30) ; il n'a pas eu à changer.

Les repères de case vide (`::before`/`::after`) sont explicitement exclus des
cases d'avancée : une case qui propose un pas ne dessine pas une croix.

## L'IA

`rpgIABougerCreatures(duel, 'sorcier')` est appelée au début de
`declarerAttaqueSorcier`. Trois lignes de règle, aucune simulation :

1. une créature qui a une proie à portée **ne bouge pas** — elle frappe d'où
   elle est ;
2. sinon, parmi ses cases légales, elle prend celle qui **réduit la distance à
   la proie la plus proche** (créature adverse, sinon le sorcier) ;
3. à distance égale, elle **reste** : s'immobiliser est plus sûr.

L'appel est idempotent : une créature déplacée porte `bouge`, elle ne repart pas
au tour suivant de la boucle d'attaque.

## Ce que le palier 2 ne fait pas

- Pas de **zone de contrôle** ni d'attaque d'opportunité : on peut passer devant
  un corps sans être frappé.
- Pas d'**Envol** particulier au mouvement : une créature qui vole marche comme
  les autres (elle survole, mais ne saute pas par-dessus un corps).
- Pas de **grille 6×3** : c'est le palier 3, toujours différé.
- Pas d'animation de pas : la carte change de case, le journal dit « avance en
  front du camp du sorcier, colonne 3 ».

## Vérifications

| Suite | Résultat |
|---|---|
| `tests/rpg-mouvement.test.js` | 12 |
| `tests/rpg-avancee-scenario.test.js` | 4 (traversée en deux tours puis frappe, tireur au sorcier, trouée fermée, pas de franchissement diagonal) |
| `tests/rpg-avancee-ui.test.js` | 7 (page, styles, IA câblée, propriétaire d'une carte) |
| `tests/rpg-portees.test.js` | 9 |
| `tests/rpg-lignes-duel.test.js` | 13 |
| `tests/rpg-sorcier-objectif.test.js` | 9 |
| `npm run check:rpg-avancee` | 54 / 0 + la page montée dans jsdom (`scripts/rpg-avancee-ui-check.mjs`) |
| `npm run check:rpg-lignes` | 33 / 0 |
| `npm run check:rpg-classique-individuel` | 64 / 0 |

Les suites déjà rouges à la base (`rpg-moba-*`, `check:rpg-defenseurs`,
`check:rpg-pvp`, `rpg-mana-essai`, `rpg-classique-ia-*`) le restent, au même
chiffre : ce palier ne les touche pas.
