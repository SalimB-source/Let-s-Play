# 05 — Le concept cartes (v2 : le duel de sorciers)

Le combat du Sablier est un **duel de cartes** posé sur une table
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
- **Les quatre figures du Nord** sont nommées par leur attribut, comme le
  faisaient les poèmes : *le Tonnerre* (le Maître du marteau — cheveux et barbe
  roux, gantelets, le marteau qui revient toujours à sa main), *Celui qui sait*
  (le Père des corbeaux — ses deux corbeaux rapportent la nouvelle), *la
  Gardienne du foyer* (la Dame des neuf mondes — le fil des maisons), *Celui
  qui entoure* (le Serpent du monde — l’anneau des eaux). Aucune carte, aucun
  type, aucune saveur ne les nomme autrement : le set raconte les mythes du
  Nord sans jamais écrire le mot « dieu ».
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
- **Le mulligan** ouvre la partie : avant le premier tour, la main de départ
  s'affiche **en entier** — les cinq cartes d'un seul coup, chacune réduite à sa
  **face 4:5** (l'illustration, la couleur en haut à gauche, le coût en haut à
  droite, et en bas à droite la ligne de type au-dessus de l'attaque et de la
  défense), **sans aucun autre texte imprimé dessus** : le nom, le type et les effets
  se lisent dans l'**aperçu rapide** (survol à la souris, appui long d'une
  seconde au doigt) — et le joueur touche les cartes qu'il ne garde pas, ce que
  dit le liseré doré.
  Elles repartent dans le paquet, **le paquet est battu**, et il pioche autant
  de cartes qu'il en a écartées — la main ne diminue donc jamais. **Un seul
  échange par camp**, et le sorcier adverse y a droit aussi (il renvoie une
  main sans terrain, jamais une main déjà jouable, et jamais au niveau Récit).
  Rien ne peut être joué avant la validation : la table reste close.
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

### Ce qui se passe à la charnière des deux tours

Deux effets ne se résolvent pas dans le tour qui les joue ; le moteur les
note sur le camp concerné et les liquide au tour suivant (`rpgFinDeTour`) :

- **le bonus borné** (`effet.tours`, la carte `buff`) — *Rempart de dunes*
  donne `+0/+3` à toutes les créatures du joueur **jusqu'à la fin du tour** :
  le gain est inscrit dans `camp.bonusTemporaires` **avec le tour qui le voit
  naître**, puis retiré quand *ce* tour-là se termine, avant que l'autre camp ne
  commence. Un rituel meurt donc avec son propre tour — il renforce vos
  attaques et vos échanges, il ne vous protège pas pendant le tour adverse ; et
  le jour où un éphémère portera le même `tours`, il s'évapora avec l'échange en
  cours plutôt qu'avec le tour du camp renforcé. Contrairement
  à la Résonance, ce retrait **peut** faire tomber une créature déjà entamée
  (le plancher de 1 ne s'applique qu'aux auras de table) : on ne renforce pas
  trois tours pour rien.
- **l'écho** (`effet.echo`, la carte `degats`) — *Nuage de cendres* inflige
  d'abord ses 2 dégâts, puis promet les mêmes **au début du tour suivant** :
  la promesse est consignée dans `camp.degatsEchos` de la victime et retombe
  une seule fois, avant que son propriétaire n'agisse. Sur une table vide, la
  promesse n'est même pas écrite — un nuage qui ne couvre personne se dissipe.

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

## 7. Les contres (deck Marée des abysses)

Le deck **Marée des abysses** (`RPG_DECK_MAREE_BASE`, mono-Eau, 16 Mer) joue la
réponse : des **contres** qui défont la carte que le sorcier vient d'annoncer.

Il n'y a **pas de prévention** : aucun contre ne reste en réserve pour la suite.
Un contre ne peut être joué que pendant une annonce du sorcier, et il vise
**cette** carte-là.

| Carte | Contre | Effet |
|---|---|---|
| *Contresort des abîmes* (×3) | n'importe quelle carte annoncée (créature ou sort) | `cible: 'carte'` |
| *Silence d'écume* (×3) | un sort annoncé de Braise ou de Sable | `cible: 'sort'`, `contre: ['braise','sable']` |
| *Déflection* (×2) | un sort annoncé, puis piochez une carte | `cible: 'sort'`, `pioche: 1` |

La carte s'appelle **Déflection** depuis la refonte de son illustration (le
sorcier qui renvoie le sort sans bouger) ; son identifiant de catalogue reste
`maree-contraire`, comme son fichier de peinture, pour ne casser aucun deck
enregistré.

Résolution (`contrerAnnonce`, moteur) :
- le contre doit correspondre à la carte annoncée, sinon il est refusé et rien n'est payé ;
- la carte annoncée n'a pas été payée : elle quitte la main du sorcier et va au
  cimetière, sans effet ;
- l'annonce est close, et le sorcier passe à sa carte suivante.

**Fenêtre de réponse à chaque carte du sorcier.** Le sorcier n'aligne pas ses
cartes d'un coup : il **annonce** la carte suivante (`rpgSorcierAnnonceSuivante`),
sans la payer. Une bannière « Le sorcier annonce X » apparaît, et le joueur a la main :
- il peut **répondre** avec un contre (la main reste jouable) ;
- ou **laisser passer** (`rpgSorcierResoudreAnnonce`) : la carte se résout, puis le
  sorcier annonce la suivante, jusqu'à épuisement avant sa phase d'attaque.

**Bakunawa** (mythique) n'a plus d'effet de contre : à son arrivée, elle inflige
2 dégâts à une créature adverse ciblée. Les autres bêtes : **Kraken** (à sa
destruction, pioche 2), **Léviathan** (3 dégâts à une créature à l'arrivée),
**Jörmungandr** (3 dégâts au sorcier à l'arrivée).

**Contre de l'IA.** Quand le joueur lance une magie ou pose une créature (hors
annonce en cours), le sorcier peut contrer : il choisit le contre le moins cher
qui vise la carte et qu'il peut payer (`choisirContreIA`, moteur). Seules les cartes
de coût 2 ou plus sont contrées. La carte du joueur est défaussée sans effet ; une
créature contrée n'entre pas en jeu. L'IA ne lance jamais de contre de sa propre
initiative : elle ne contre que la carte du joueur.

Limites : le moteur n'a pas de pile de résolution, donc un contre ne peut pas
défaire un sort **déjà résolu**. Une réponse du joueur dans la fenêtre d'annonce
du sorcier n'est pas contrée par l'IA. Un contre de l'IA n'existe que si son deck
contient des contres (voir la décision sur le deck de l'IA).

Vérifications : `tests/rpg-maree.test.js` (inclus dans `npm run check:rpg`).

## 8. Le renvoi en main (deck Marée des abysses)

Deux sorts d'Eau jouent l'effet **`retour-main`** du moteur : la créature visée
quitte la table **sans mourir** et retourne dans la main de son propriétaire.

| Carte | Type | Effet |
|---|---|---|
| *Ressac* (×2) | Éphémère — Eau, 1 mana | Renvoyez une créature adverse ciblée dans la main de son propriétaire. |
| *Courant de retour* (×1) | Rituel — Eau, 3 mana | Renvoyez une créature adverse ciblée dans la main de son propriétaire, puis piochez une carte. |

Résolution (`renvoyerEnMain`, moteur) :
- la créature n'entre **pas** au cimetière et ne déclenche **aucune** capacité de
  destruction (un Kraken renvoyé ne fait pas piocher) ;
- elle perd tout ce qu'elle avait gagné sur la table (blessures, boucliers,
  Furie, Résonance) : la rejouer coûtera de nouveau son mana ;
- la **protection** contre l'Eau arrête le renvoi, comme elle arrête les dégâts ;
- sans créature légale, le sort refuse de partir : rien n'est payé.

Le renvoi est un coup de **tempo**, pas un anti-créature : la menace reviendra,
mais elle aura coûté un tour et un paiement de plus. L'IA du sorcier le sait :
elle cible la créature la plus lourde (`meilleureCibleRenvoiIA`) et ne le lance
que si la menace adverse le justifie (`scoreCarte`, profil « contrôle »
favorisé).

Côté interface, le joueur choisit la cible lui-même (`targetMode` rend le sort
ciblable « ennemi »), et l'aperçu d'une annonce nomme la créature visée. Le
deck **Marée des abysses** embarque deux *Ressac* et un *Courant de retour*, en
échange d'un exemplaire de trois créatures communes pour rester à 40 cartes.

Chaque carte a sa peinture dédiée (`public/cards/ressac.jpg`,
`public/cards/courant-de-retour.jpg`), livrée au **ratio exact de la face, 4:5** :
les deux scènes jouent le même geste — un djinn noir aspiré par le tourbillon —
vu de très près pour *Ressac*, depuis le rivage pour *Courant de retour*. Le
garde-fou du catalogue interdit tout partage d'illustration au sein d'un même deck,
et `tests/rpg-duel.test.js` vérifie le ratio des plein art concernés.

Vérifications : `tests/rpg-maree.test.js` (moteur + IA) et le scénario « Ressac »
de `scripts/rpg-battle-smoke.jsx` (cible cliquée, créature rendue à la main
adverse), inclus dans `npm run check:rpg` et `npm run check:rpg-ui`.
