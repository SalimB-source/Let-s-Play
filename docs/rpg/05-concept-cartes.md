# 05 — Le concept cartes (v2 : le duel de sorciers)

Le combat du Sablier de Bab El est un **duel de cartes** posé sur une table
en bois : deux sorciers face à face, chacun avec son paquet, sa main et ses
terrains. Tout ce qui existe dans le combat est une carte ; rien d'autre ne
se clique. Implémenté dans `src/games/rpgCards.js` (catalogue),
`rpgCombat.js` (règles) et `CardTable.jsx` (la table, 100 % DOM).

## 1. Les quatre types de cartes

Chaque carte porte **deux chiffres** : **⚔ attaque** (badge doré) et
**🛡 défense** (badge acier). La pioche : **1 carte par tour**, main
limitée à 7.

### Terrain

- Comme les terrains de Magic : joué **gratuit, une fois par tour**, il
  reste sur la table et produit du **sable** (le mana) de son élément
  chaque tour (sable, eau, braise, verre, souffle, encre).
- Pas d'attaque, une petite défense : l'adversaire peut s'en prendre aux
  terrains pour couper le sable.

### Créature

- Le nerf du combat. Payée en sable, elle arrive sur la table, attaque les
  créatures adverses ou le sorcier adverse, et encaisse sur sa défense.
- Une créature qui arrive ne frappe pas le tour même (elle observe).
- Capacités imprimées (vol, ruée, barrage…) selon la carte.

### Magie

- Les sorts : dégâts, soins, barrages, altérations. Payés en sable,
  résolus, puis au cimetière.
- Les **éphémères** se jouent pendant le tour de l'adversaire, en réponse
  à la carte annoncée : de l'information, jamais des réflexes.
- Le chiffre d'attaque est sa puissance ; la défense, sa résistance à
  l'interruption.

### Héros (façon arpenteurs)

- **Salem, Yamina, Boualem, Fériel, Tarek.** Les héros **ne sont pas dans
  la main ni le paquet de départ** : ce sont des cartes rares qui
  s'obtiennent en exploration et par le draft, et qui arrivent comme les
  **arpenteurs de Magic** (copié pour l'instant — on ajustera ensuite) :
  - ils entrent en jeu avec **3 compteurs de loyauté** ;
  - leurs capacités coûtent de la loyauté (une par tour) ;
  - l'adversaire peut les attaquer directement pour retirer des compteurs ;
  - à **0 loyauté**, le héros quitte la table (il n'est pas perdu : il
    revient au palier suivant, plus fort).
- Eux aussi ont ⚔ et 🛡 imprimés.

## 2. Les règles du duel (v3)

- La partie commence avec **0 carte sur la table** ; chaque joueur **pioche
  5 cartes**.
- Chaque joueur a **50 points de vie** ; les **sorciers ennemis peuvent en
  avoir davantage selon leur puissance** (50 + 5 × puissance).
- **Tant qu'il y a des créatures en face, on ne peut pas attaquer le
  sorcier directement** : il faut tuer les créatures d'abord.
- Les **magies** peuvent cibler les créatures, et **parfois les joueurs**
  (selon la carte).
- Les créatures peuvent avoir une capacité **à l'arrivée** ou **quand
  elles sont détruites** (pioche, dégâts, soin, buff…).
- Le combat entre créatures est à dégâts mutuels, façon Magic.

Moteur : `src/games/rpgDuel.js` (testé), catalogue créatures dans
`src/games/rpgCards.js` (`RPG_CREATURE_CARDS`, première dizaine du set).

## 3. La boucle de tour

1. **Piocher 1** ;
2. poser **un terrain** (gratuit) ;
3. jouer des **créatures** et des **magies** en payant le sable ;
4. **attaquer** avec les créatures prêtes — l'adversaire annonce ses
   bloqueurs ;
5. **Fin du tour** (la grande pastille dorée ⧗).

## 4. L’adversaire : un sorcier

L'adversaire n'est pas un monstre passif : c'est un **sorcier** avec son
propre paquet, sa propre main (face cachée) et ses propres terrains.
Chaque tour, il pioche une carte et la joue comme nous — la carte qu'il
pose est annoncée face visible avant de se résoudre. Les vagues sont ses
créatures qui arrivent les unes après les autres.

## 5. Anatomie d’une carte (compacte)

Les cartes posées sont **courtes** — la table reste lisible :

- **Bannière de titre** : nom + pastilles d'élément ;
- **Fenêtre d'illustration** : le portrait peint ;
- **Ligne de type** : le titre direct (petites capitales) + rareté
  (✦ mythique / ● commune) ;
- **Filet central** (une ligne) : segments de Nom et états (alliés),
  intention annoncée (ennemis) ;
- **Pied** : ⚔ attaque · étage · 🛡 défense.

Plus de grand encadré de règles ni de saveur sur les cartes posées : la
règle détaillée vit dans la carte en main et dans le journal.
