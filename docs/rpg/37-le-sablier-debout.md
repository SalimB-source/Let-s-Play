# 37 — Le Sablier debout

> État : **branché.** Le Sablier ne verrouille plus l'orientation. Le duel se
> joue debout (`src/games/rpg-portrait.css`) comme couché (les coques du
> paysage, `rpg-mobile.css` et ses voisines), et les menus ont leur colonne
> portrait depuis toujours.

## La demande

*« C'est peut-être mieux d'avoir le jeu en version portrait sur mobile ? »* —
posée après une partie, et elle a une base technique simple : **le plateau est
une pile verticale**. Le sorcier adverse en haut, ses deux rangées de cinq
cases, les nôtres, notre sorcier, la main. Les deux médaillons sont déjà posés
en haut et en bas du champ (`rpg-avatars-plateau.css`), pas à gauche et à
droite.

Le paysage n'était qu'une contrainte d'écran : il fallait faire tenir cette pile
dans une **bande de hauteur** (`--rpg-board-band`, la moitié de la table moins
le bandeau d'avatar et une gouttière). C'est ce qui a produit le défaut corrigé
par #1562 — l'avatar qui recouvrait les cases et la main poussée hors de
l'écran —, et c'est pourquoi le portrait est plus simple que le paysage : il n'y
a pas de bande à partager.

## Les sept rangées

Une seule colonne, sept rangées, de haut en bas :

| Rangée | Ce qu'elle porte |
|---|---|
| `tete` | le journal de combat (à gauche) et le menu du duel (à droite) |
| `haut` | le bandeau du sorcier : médaillon, mana, terrains |
| `ennemi` | son champ — deux rangées de cinq cases |
| `equipe` | le nôtre |
| `bas` | notre bandeau |
| `commandes` | le rail du tour et les commandes de combat, **sur une ligne** |
| `main` | la main, en bande basse, qui défile au doigt |

Le médaillon quitte le positionnement absolu du paysage : il vit **dans** son
bandeau, à gauche, et la mana et les terrains occupent le reste de la bande à sa
droite. La main prend toute la largeur — en paysage elle s'arrêtait à gauche
pour ne jamais glisser sous l'avatar, contrainte qui n'existe plus.

## L'échelle : la largeur d'abord

```css
--duel-card: clamp(44px, min(calc((100vw - 32px) / 5.15),
                             calc((100dvh - 165px) / 9)), 96px);
```

- **la largeur** donne le plafond normal : cinq cartes de front et quatre
  gouttières dans la largeur utile. Sur un 390 × 844, la carte mesure **69 px**
  (contre 61 px en paysage, où l'échelle suit la hauteur) ;
- **la hauteur** n'est qu'un garde-fou : 8,75 cartes de haut en tout (deux
  rangées de 1,25 carte par camp, les deux bandeaux, le rail, la main) plus
  165 px de constantes. Sur un 320 × 568, c'est elle qui commande (45 px) et le
  plateau reste entier ;
- la gouttière des rangées suit l'échelle (`max(4px, .08 carte)`) au lieu du
  plancher de 8 px du paysage : quatre d'entre elles doivent tenir dans la
  largeur ;
- `--essai-colonne` (les cases de pose du mode mana-essai) vaut la largeur
  d'une carte, jamais plus : les cases et les cartes tombent l'une sur l'autre.

`tests/rpg-duel-portrait.test.js` rejoue cette arithmétique sans navigateur, du
320 × 568 au 768 × 1024 : cinq cases dans la largeur, deux rangées par camp
entre les deux bandeaux, et le plateau entier dans l'écran. Le 320 × 480 n'est
pas couvert : deux rangées de cartes n'y tiennent pas, et le paysage reste son
repli (le jeu n'impose plus d'orientation, il n'empêche pas de tourner).

## Ce que le portrait ne rouvre pas

- **Le paysage n'a pas bougé.** Ses coques restent en place (`rpg-mobile.css`,
  `rpg-avatars-plateau.css`, `rpg-mana-essai.css`) : le téléphone couché, la
  tablette et le moniteur gardent exactement le plateau d'avant. La feuille
  portrait est chargée **en dernier** et ne parle qu'à `(orientation: portrait)`.
- **Le plein écran reste.** Il appartient à la page (`useGameFullscreen`) et se
  demande dans le geste, comme avant. C'est l'**orientation** qui a disparu, pas
  l'immersion.
- **Le tirer-pour-rafraîchir reste désarmé** sur la section : le pont Android
  `setSablierActif` s'en charge, sans plus toucher à l'orientation.

## Le verrou est parti

`rpgLandscape.js`, `PaysageSablier.jsx` et `InvitePaysage.jsx` sont supprimés,
avec l'écran de rotation du duel et la bande de l'écran d'entrée. À leur place,
`rpgSessionSablier.js` et `SessionSablier.jsx` ne tiennent plus qu'une **session**
comptée : le pont Android n'entend qu'un début (première session ouverte par la
route) et qu'une fin (dernière fermeture) — refermer le duel pour revenir au
menu ne rend pas la section inactive.

Dans l'APK, `LetsPlayAndroid.setSablierActif(boolean)` ne fait que désarmer le
tirer-pour-rafraîchir et rafraîchir la couche plein écran. L'ancienne méthode
`setPaysageSablier` (qui, elle, demande `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`)
reste branchée pour une page plus ancienne restée en cache ; le site ne
l'appelle plus, et son manifeste ne fixe aucune orientation.

## Vérifications

```sh
npm run check:rpg-portrait     # coque portrait + session (16)
npm run check:rpg-plateau-mobile
npm run build
```

- `tests/rpg-duel-portrait.test.js` (6) — les sept rangées, l'échelle prise sur
  la largeur, le médaillon hors du champ, la main pleine largeur, les commandes
  sur une ligne, et l'ordre de chargement des feuilles ;
- `tests/rpg-session-sablier.test.js` (10) — aucun verrou d'orientation, le
  plein écran dans le geste, le compteur de sessions, le pont Android (dont une
  APK qui n'a pas la nouvelle méthode : aucun repli sur l'ancien verrou), les
  trois routes, et l'absence d'écran de rotation dans la page.
