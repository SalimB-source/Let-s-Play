# 05 — Le concept cartes (v2 : le duel de sorciers)

Le combat du Sablier du temps est un **duel de cartes** posé sur une table
en bois : deux sorciers face à face, chacun avec son paquet, sa main et ses
terrains. Tout ce qui existe dans le combat est une carte ; rien d'autre ne
se clique. Implémenté dans `src/games/rpgCards.js` (catalogue),
`rpgCombat.js` (règles) et `CardTable.jsx` (la table, 100 % DOM).

## 1. Les quatre types de cartes

Chaque carte porte **deux chiffres** : **⚔ attaque** (badge doré) et
**🛡 défense** (badge acier). La pioche : **1 carte par tour**, main
limitée à 7.

### Terrain

- Comme les terrains de Magic : **piochés**, posés **UN par tour**,
  **engagés** pour produire un mana de leur couleur. Ils dégagent au
  début de votre tour ; le mana non dépensé s'évapore.
- Terrains du set : **Montagne** (→ mana braise), **Mer** (→ mana eau),
  **Désert** (→ mana sable), **Glacier** (→ mana neige) et **Pétra**, qui choisit
  entre Braise et Sable à chaque engagement.
- Les terrains restent sur la table : une petite défense, pas d'attaque.

### Couleurs et paiement (façon Magic)

- Quatre couleurs composent le set (`RPG_ELEMENTS`) : **braise**, **eau**,
  **sable** et **neige**. Bab El est née des trois premières ; la Neige arrive
  avec le **Serment des Neuf Hivers**, le deck mono-Neige inspiré des récits du
  Nord (valkyries, guerriers de clan, drakkars, et les figures du panthéon
  scandinave — jamais appelées « dieux » : le Père des corbeaux, le Maître du
  marteau, la Dame des neuf mondes, le Serpent du monde).
- Chaque carte (créature, magie, héros) a un **type** : une des quatre couleurs.
- Payer un coût de N exige **N mana au total, dont au moins un de la
  couleur de la carte** (comme « 2R » à Magic).

### Créature

- Le nerf du combat. Payée en mana, elle arrive sur la table, attaque les
  créatures adverses ou le sorcier adverse, et encaisse sur sa défense.
- Une créature qui arrive ne frappe pas le tour même (elle observe).
- Capacités imprimées (vol, ruée, barrage…) selon la carte.

### Magie

- Les sorts : dégâts, soins, barrages, altérations. Payées en mana,
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

## 2. Construction de deck

- Un deck fait **40 cartes**.
- Répartition de base : **40 % de terrains** (16), **30 % de créatures**
  (12), **20 % de sorts** (8), **10 % de héros** (4). Les chiffres peuvent
  changer, mais **toujours au moins 40 % de terrains**.
- **3 exemplaires max** par carte — sauf les terrains de base
  (Montagne, Mer, Plaines), illimités comme à Magic : avec seulement
  trois types de terrains, la règle des 3 ne pourrait jamais atteindre
  les 40 %.
- `rpgValiderDeck(deck)` vérifie tout ça.

## 3. Les règles du duel (v3)

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
- **Phase d'attaque** : on déclare TOUS les attaquants d'un coup, puis
  l'attaque se résout en dégâts simultanés — sans mur, tout le monde
  frappe le sorcier ; avec un mur, les attaquants se répartissent sur
  les créatures ennemies et encaissent la riposte même si leur cible
  meurt.

### Les capacités de clan du Nord

Deux capacités appartiennent au set **Neige** et à lui seul ; elles se lisent
sur la carte (`furie`, `resonance`) et le moteur les applique sans table
d'effets supplémentaires.

- **Furie X** (les vikings : Guerrier au bouclier rond 1, Berserk des trois
  hivers 2, Jarl au marteau de guerre 3) — « Chaque fois qu'elle est blessée et
  survit, la créature gagne +X/+X. » Une attaque **entièrement absorbée par un
  bouclier n'est pas une blessure** : la Furie attend le premier sang. Elle
  frappe **une seule fois par échange**, même quand la créature encaisse comme
  attaquante et comme bloqueuse dans le même combat, et **jamais une créature
  qui meurt** : c'est une récompense de survie, pas un baroud d'honneur. Le
  bonus porte sur l'attaque, la défense et les points de vie présents et
  maximum : une créature furieuse reste entamée sous son nouveau plafond.
- **Résonance** (les valkyries : Valkyrie au corbeau et Valkyrie des glaces) —
  « Tant qu'elle est en jeu, **toutes** les créatures Neige de la table
  gagnent +1/+1. » L'aura est de table : elle profite aux deux camps, à la
  valkyrie elle-même, et se cumule si deux sources sont en jeu. Chaque entité
  retient sa part (`entite.resonance`), si bien qu'une source qui entre ou qui
  meurt n'ajoute ou ne retire que son écart — les bonus déjà gagnés par la
  Furie ne dérivent jamais. Perdre l'aura ne peut pas tuer : les points de vie
  et la défense retombent au plancher de 1.

Les deux capacités se cumulent, et les vikings comme les valkyries gardent
leurs capacités propres (Coup rapide du Berserk, Envol et arrivée des
valkyries, arrivées du Guerrier et du Jarl).

Moteur : `src/games/rpgDuel.js` (testé), catalogue créatures dans
`src/games/rpgCards.js` (`RPG_CREATURE_CARDS`, première dizaine du set).

## 4. La boucle de tour

1. **Piocher 1** ;
2. poser **un terrain** (un par tour), engager ses terrains ;
3. jouer des **créatures** et des **magies** en payant le mana ;
4. **phase d'attaque** (⚔) : déclarer toutes les créatures attaquantes,
   puis lancer l'attaque ;
5. **Fin du tour** (la grande pastille dorée ⧗).

## 5. L’adversaire : un sorcier

L'adversaire n'est pas un monstre passif : c'est un **sorcier** avec son
propre paquet, sa propre main (face cachée) et ses propres terrains.
Chaque tour, il pioche une carte et la joue comme nous — la carte qu'il
pose est annoncée face visible avant de se résoudre. Les vagues sont ses
créatures qui arrivent les unes après les autres.

## 6. Anatomie d’une carte (compacte)

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
