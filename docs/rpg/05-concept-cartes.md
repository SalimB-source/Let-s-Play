# 05 — Le concept cartes

Le combat du Sablier de Bab El est un **jeu de cartes** posé sur une table en
bois. Tout ce qui existe dans le combat est une carte ; rien d'autre ne se
clique. Implémenté dans `src/games/rpgCards.js` (catalogue), `rpgCombat.js`
(règles) et `CardTable.jsx` (la table, 100 % DOM).

## 1. Anatomie d'une carte (référence : Magic)

- **Liseré noir** extérieur, **cadre intérieur teinté par l'élément**
  (sable = ocre, eau = bleu, braise = rouge, verre = cyan, souffle = gris,
  encre = violet) ;
- **Bannière de titre** parchemin doré : nom à gauche, **coût en pastilles**
  rondes à droite (symboles d'élément pour les créatures, sable ⛃ pour les
  sorts) ;
- **Fenêtre d'illustration** : le portrait peint du personnage ;
- **Ligne de type** sur bandeau sombre : « Créature légendaire — … » +
  symbole d'édition ;
- **Encadré de texte beige, encre noire** : la règle de la carte, puis la
  saveur en italique ;
- **Badge doré** en bas à droite : les PV ; ligne de collection en bas à
  gauche (étage, édition).

## 2. Trois familles

1. **Créatures** — les personnages. Au départ, UNE seule attaque de base
   (gratuite, une fois par tour). Ils gagnent des capacités en avançant :
   ce sont les pouvoirs qui entrent dans la collection.
2. **Pouvoirs** — les sorts collectionnables. Payés en **sable** (le mana),
   joués depuis la main, puis au cimetière. Les **éphémères** (Garde, Bulle,
   Rempart) se posent pendant le tour ennemi, en réponse à la carte annoncée :
   de l'information, jamais des réflexes.
3. **Cartes ennemies** — chaque ennemi a son paquet ; son intention est la
   carte qu'il posera à son tour, annoncée face visible.

## 3. La boucle de tour

- À son tour, un compagnon **pioche 1** (main max 7) ;
- il joue : sa **carte de base** (une fois), **« Sonder le sol »** (une fois,
  +20 sable), et les pouvoirs qu'il peut **payer en sable** de « notre sol » ;
- « Fin du tour » passe la main ; l'ennemi pose alors ce qu'il avait annoncé.

Le sable tombe de moitié des PV perdus, se vole (Souffle), se convertit en
soins (Récolte) : c'est à la fois le mana et le territoire.

## 4. Collection & draft

On commence avec un petit classeur (`RPG_STARTING_COLLECTION`). Après chaque
vague, un **draft** propose trois cartes hors collection ; on en choisit une.
C'est la progression : les personnages « gagnent des capacités en avançant ».

## 5. Raretés

Commune / Rare / Mythique. Les mythiques exigent le **Nom complet**
(3 segments) — la même serrure que le prototype précédent, devenue une
exigence de deckbuilding.
