# 05 — Le concept cartes (v2 : le duel de sorciers)

Le combat du Sablier est un **duel de cartes** posé sur une table
en bois : deux sorciers face à face, chacun avec son paquet, sa main et ses
terrains. Tout ce qui existe dans le combat est une carte ; rien d'autre ne
se clique. Implémenté dans `src/games/rpgCards.js` (catalogue),
`rpgCombat.js` (règles) et `CardTable.jsx` (la table, 100 % DOM).

## 1. Les cinq types de cartes

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
- Payer un coût de N exige **N mana au total, dont les pips colorés obligatoires** :
  au moins un de la couleur d'une carte mono (comme « 2R » à Magic), un de
  chaque couleur d'une hybride (par exemple Sable + Braise pour le Djinn de
  foudre). Le disque du coût hybride est partagé **en deux moitiés nettes**
  suivant l'ordre des couleurs de la carte ; le chiffre, les pips requis et le
  paiement restent inchangés. Cette face est
  commune à la main, à la table, au catalogue et à l'atelier ; le guide emploie
  le même rendu pour toute carte hybride payante qu'il présente. Les cartes
  mono gardent leur disque habituel et les terrains n'affichent aucun coût.

### Créature

- Le nerf du combat. Payée en mana, elle arrive sur la table, attaque les
  créatures adverses ou le sorcier adverse, et encaisse sur sa défense.
- Une créature qui arrive ne frappe pas le tour même (elle observe).
- Capacités imprimées (vol, ruée, barrage…) selon la carte.

### Magie

- Les sorts : dégâts, soins, barrages, altérations. Payées en mana,
  résolus, puis au cimetière.
- Les **magies rapides** se jouent pendant le tour de l'adversaire, en réponse
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
  droite, et en bas les plaques du jeu — l'épée d'or à gauche, le bouclier
  d'acier à droite — plus, pour un terrain ou un sort, sa ligne de type centrée
  au-dessus), **sans aucun autre texte imprimé dessus** : le nom et les effets se lisent dans l'**aperçu rapide**
  (survol à la souris, appui long d'une seconde au doigt) — et le joueur touche
  les cartes qu'il ne garde pas, ce que dit le liseré doré.
  Elles repartent dans le paquet, **le paquet est battu**, et il pioche autant
  de cartes qu'il en a écartées — la main ne diminue donc jamais. **Un seul
  échange par camp**, et le sorcier adverse y a droit aussi (il renvoie une
  main sans terrain, jamais une main déjà jouable, et jamais au niveau Récit).
  Rien ne peut être joué avant la validation : la table reste close.
- Chaque joueur a **25 points de vie**, et **chaque sorcier ennemi aussi** :
  `RPG_PV_JOUEUR` = `RPG_PV_SORCIER_BASE` = 25 et
  `RPG_PV_SORCIER_PAR_PUISSANCE` = 0 — la puissance d'un étage ne gonfle plus
  les PV, elle reste l'indice de difficulté affiché sur la fiche d'étage.
- **Tant qu'il y a des créatures en face, on ne peut pas attaquer le
  sorcier directement** : il faut tuer les créatures d'abord.
- Les **magies** peuvent cibler les créatures, et **parfois les joueurs**
  (selon la carte).
- Les créatures peuvent avoir une capacité **à l'arrivée** ou **quand
  elles sont détruites** (pioche, dégâts, soin, buff…), et une arrivée peut
  aussi **créer des créatures-jetons** (voir « Les créatures-jetons » ci-dessous).
- Le combat entre créatures est à dégâts mutuels, façon Magic.
- **Phase d'attaque** : on déclare TOUS les attaquants d'un coup, puis
  l'attaque se résout en dégâts simultanés — sans mur, tout le monde
  frappe le sorcier ; avec un mur, les attaquants se répartissent sur
  les créatures ennemies et encaissent la riposte même si leur cible
  meurt.

### Les arrivées qui désignent une cible se choisissent sur la table

Une créature dont l'effet d'arrivée désigne une victime — le duel du **Cavalier
amazigh**, la morsure de la **Vipère de verre**, la lance de la **Valkyrie des
glaces**, la gueule du **Léviathan** ou du **Bakunawa**, le rebond du **Sonneur
félé**, l'exil du **Susanoo** — se **pose d'abord** : la carte vole depuis la
main, le sable est payé, la créature entre en jeu et l'annonce le dit. La
désignation ne s'ouvre qu'**ensuite**, sur la table, et c'est le clic sur la
créature qui referme la capacité.

- Le moteur retient ce qu'il reste à désigner (`duel.arriveeEnAttente`) et
  revalide la cible au moment du clic : une créature qui a disparu, qui n'est
  plus dans le bon camp, ou qui est protégée contre la couleur de la source est
  refusée — l'attente reste ouverte.
- **Renoncer à la cible** laisse la créature en jeu : on renonce à l'effet,
  jamais à la pose. Le bouton « Annuler la dernière action », lui, défait la
  pose entière (mana compris).
- Une arrivée ciblée **sans cible légale** (table adverse vide, protections) se
  résout avec la pose, comme avant : aucun choix à faire, aucune attente.
- La portée est déclarée **une seule fois**, par `arriveeCiblePortee()` : le
  moteur s'en sert pour exiger la cible, la page pour allumer les créatures
  légales. Un camp ne peut donc pas demander ce que l'autre refuse.

Le choix de la cible pendant la phase du sorcier (une Magie Rapide qui renvoie
une créature, par exemple) garde son cours d'origine : là, la carte est un sort
lancé depuis la main, elle n'a pas à se poser avant de désigner.

### La protection : un écran de couleur, pour l'IA comme pour le joueur

Une créature **protégée contre une couleur** — Tiziri et la Braise, Amayas et
les Ténèbres, l'Armure de cendres portée — est intouchable par **tout ce qui
vient de cette couleur** : `rpgEstProtegee(entite, couleursSource)` est la
seule porte d'entrée, et le moteur l'applique partout de la même façon.

- **Dégâts** : attaque, capacité d'arrivée, magie et vague de zone sont
  annulés (`rpgBlesserCreature`, `appliquerDegatsDeCombatSimultanes`) ; le gel
  de couleur est annulé de la même façon.
- **Ciblage** : un sort ne peut pas la désigner (`rpgLancerMagie` répond
  `protection`), pas plus qu'un renvoi en main, une marque de venin ou un
  équipement. Le **Serpent du monde** étend cet écran à toutes les magies
  (`protectionSorts`), même en zone.
- **Blocage** : une créature protégée contre la couleur de l'attaquant
  **arrête son attaque sans une égratignure** — elle encaisse zéro et survit
  toujours. Inversement, la protection de l'attaquant interdit à une créature
  de cette couleur de le bloquer (`raison: 'protection'`).

L'IA lit les protections avec la même règle, et pas seulement au moment de
payer :

- `resultatBlocage` simule l'échange **avec** les couleurs des deux cartes :
  un bloqueur protégé ne meurt pas de ce coup-là, un attaquant protégé ne
  subit aucune riposte ;
- un blocage **gratuit** (la bloqueuse ne peut pas mourir de cet échange) se
  prend toujours, quel que soit le profil ;
- une attaque qui s'arrêterait sur un mur protégé — aucune percée, aucune
  blessure rendue, et notre créature entamée pour rien — est comptée comme un
  **gaspillage** (`choisirAttaquantsIA`) : l'IA garde son attaquant au camp ;
- une vague de zone ne compte que les créatures que la protection laisse
  toucher : un Vent rouge sur une table protégée contre la Braise reste en
  main (`scoreCarte`) ;
- aucune cible désignée chez l'adversaire n'est protégée contre la couleur de
  la carte (`candidatsCartesIA`) : la carte n'est jamais annoncée pour être
  refusée par le moteur — un refus couperait le tour du sorcier ;
- une table entièrement protégée ne bloque pas le développement : le Cavalier
  entre en jeu **sans frapper** (l'arrivée ne désigne plus personne) au lieu de
  rester en main.

Vérifications : `tests/rpg-ia.test.js`, section « Protection : l’IA respecte
l’écran de couleur ».

### Les autres mécaniques que l'IA lit

Le même audit que la protection, passé sur tout le moteur : ces règles sont
désormais dans les évaluations de `rpgAI.js`, et chacune a son test.

| Mécanique | Règle du moteur | Ce que l'IA en fait |
| --- | --- | --- |
| **Venin anti-blocage** | `empecheBlocageToursRestants` (Vipère de verre, Bakunawa) : la créature reste en jeu mais ne bloque plus | Le bloqueur marqué sort de la liste (`peutBloquerEntite`). Avant, l'IA le proposait : le moteur refusait l'attaque entière (`raison: 'bloqueur'`) et **le joueur perdait son tour de frappe**. |
| **Grand Voile blanc** | `duel.brouillardCombat` : aucun dégât de combat ce tour, des deux côtés | Aucun attaquant n'est déclaré (sauf un porteur d'arme à déclencheur d'attaque), aucun bloqueur posé : la frappe est gardée pour le tour suivant. |
| **Tenacité** | Une renaissance par partie : la créature meurt normalement (cimetière, arme, capacités de mort, Harakiri), puis sa carte revient en jeu au début du prochain tour de son camp avec 1 point de défense. La renaissance est une **arrivée en jeu** : l'effet d'arrivée de la carte se déclenche de nouveau. L'exil, qui retire la carte de la partie, empêche le retour. | `meurtSous` la tue comme n'importe qui (plus de fausse survie dans la simulation) ; `valeurEntite` lui rend +1 pour le corps gratuit du tour suivant, et une vague de destruction vaut 0,7 de sa valeur contre elle. |
| **Bouclier** (parade) | Le premier sort adverse qui **atteint** la créature est bloqué, puis le bouclier tombe en entier. Un sort qui la désigne est payé mais aucun effet ne se résout ; un sort de **zone** se résout normalement, mais la parade épargne sa seule porteuse (ni dégât, ni gel, ni destruction, ni malus) via `paradeZoneBloque`, tandis que les autres créatures encaissent la vague. Les sorts du camp de la créature ne réveillent pas la parade, et aucun dégât d'attaque ou de capacité n'est absorbé. | `bouclierQuiBloque` ne regarde que les créatures du camp adverse désignées par `cibleId` ; l'IA évite de gaspiller une magie sur une parade, tout en gardant l'option de la briser. Une zone reste utile : elle ne perd que sa cible à parade. `valeurEntite` la compte comme un forfait, pas comme des PV. |
| **Salem : Bouclier + Rapidité + Contre-attaque** | Son ancien bouclier de lumière est remplacé par `arrivee: { type: 'bouclier', amount: 1, cible: 'soi' }` : la parade anti-sort se pose sur lui sans désignation. Rapidité reste, Contre-attaque s'ajoute. Un sort bloqué par la parade ne résout rien — **pas même la riposte** ; le sort adverse suivant blesse Salem et fait frapper le sorcier lanceur de 4 dégâts. Une fois la parade tombée, un sort de zone qui l'atteint déclenche la même riposte sur le sorcier lanceur, comme pour toute Contre-attaque. | `cible: 'soi'` n'a aucune portée (`arriveeCiblePortee === null`) : l'IA ne choisit pas d'allié, et un `cibleId` transmis par mégarde ne détourne pas la parade. `valeurEntite` paie la parade comme un sort adverse gâché ; la Contre-attaque vaut son épine habituelle. |
| **Bouclier de lumière** | La première attaque ou magie ne touche pas (Dame aux ailes d'or uniquement) — mécanique distincte, inchangée | Il avale la frappe dans `resultatBlocage` ; une magie de dégâts qui le vise ne compte plus comme un kill. |
| **Overkill** | L'excédent de force qui dépasse les bloqueurs perce jusqu'au sorcier (Serpent du monde) | Compté des deux côtés : en attaque (dégâts au visage) et en défense (ce qu'un petit bloqueur ne retient pas). |
| **Blocage obligatoire** | `doitBloquer` (Tours) et `blocageForce` (Appât de la meute, Embuscade) | Anticipé dans la simulation, sur le plus gros attaquant, comme le moteur. |
| **Butin** | Toucher le sorcier pioche puis défausse | +0,8 de valeur sur le porteur. |
| **Débuff ciblé** | `-X/-Y`, la victime meurt si ses PV tombent à 0 (Lame de mer) | La carte est enfin jouée : l'IA choisit la victime qu'elle **détruit**, sinon la plus grosse menace rabotée. |
| **Réanimation** | Ramène la dernière créature du cimetière | Évaluée au corps qu'elle ramène : jamais payée pour une magicienne ou un cimetière vide. |
| **Auras** | Tarek, Amani, Kenshi, Bou Jeloud : la carte ne grandit que les créatures des deux cases ADJACENTES, jamais elle-même ; une case vide coupe le voisinage (`voisines` dans `rpgDuel.js`) | Valorisée au plus pour DEUX voisins, pas selon toute la table déjà posée. |
| **Arrivées** | `soin-creatures` (Yamina en zone, et la Völva qui en désigne une seule pour 3 PV, `cible: 'creature-amie'`), `heures` (Guetteur), `bouclier` (Guerrier, qui peut le garder ou le donner, Veilleuse, Tour de sable et Salem en `cible: 'soi'`), `bouclier-lumiere` (Dame aux ailes d'or), `recyclage`, `reanimation`, `defausse-adverse` | Chacune a maintenant son bonus ; auparavant la créature n'était jouée que pour son corps. |

Ce qui reste volontairement hors du modèle : `prixPv` et les effets sans carte
au catalogue (`sable`, `regarder-dessus`, `compteurs-arme`) ; et l'arrivée
`gel` de la **Tour de neige**, qui ne désigne pas encore sa cible — c'est un
manque du moteur (`arriveeCiblePortee`), pas de l'IA.

### Les capacités de clan du Nord

La Furie appartient au set **Neige** et à lui seul ; elle se lit sur la carte
(`furie`) et le moteur l'applique sans table d'effets supplémentaires. Les
valkyries n'émettent plus de Résonance viking.

- **Eirik du Premier Serment** (1 mana, 1/1, mythique, Contre-attaque et
  Compagnie) — une créature légendaire de type Guerrier viking. Une créature qui
  le frappe avec Attaque ciblée ou le cible avec une capacité encaisse ses
  dégâts d'attaque ; un sort qui l'atteint — ciblé ou de zone — fait riposter
  sur le sorcier adverse, même si le coup le détruit. Sa rareté le limite à un
  exemplaire par deck ; il est révélé au premier étage du Fjord.
- **Compagnie** (`compagnie: { tribu, atk, def }`, moteur : `appliquerCompagnies`
  dans `rpgDuel.js`) — « +1/+1 pour chaque **autre** créature de sa tribu dans
  son camp ». Eirik ne se compte pas lui-même : seul sur la table il reste le
  1/1 imprimé, et chaque frère d'armes viking le fait grandir (2/2 avec un
  Berserk, 3/3 avec deux). Le type se lit sur la ligne de type imprimée, comme
  la Résonance : un Viking du camp adverse ne compte jamais. C'est un effet de
  **présence**, pas un renfort acquis — une créature qui tombe fait redescendre
  le bonus, sans jamais tuer (défense et PV restent au plancher de 1). Le
  moteur ne retient que l'écart déjà appliqué (`compagnieBonusAtk` /
  `compagnieBonusDef`), donc une arme, la Furie ou un renfort temporaire ne
  dérivent pas. La pastille « Compagnie viking » et le journal suivent l'effet.
- **Furie X** (Loup des neiges 1 ; Valkyrie au corbeau, Guerrier au bouclier
  rond et Berserk des trois hivers 2 ; Jarl au marteau de guerre et Maître du
  marteau 3) — un état
  continu : tant que la défense actuelle d'une créature vivante est sous sa
  **DEF de base** — la défense imprimée de sa carte, sans les renforts ni les
  auras — elle gagne **+X/+0**. Ces renforts peuvent donc absorber une
  blessure sans la faire passer sous le seuil. Le bonus d'attaque est compté
  à part : dès que la créature retrouve sa DEF de base, il est retiré sans
  toucher aux autres renforts,
  puis une nouvelle chute sous le seuil peut le rallumer. Le bouclier d'une
  créature n'absorbe plus aucun dégât : un coup qui entame les PV fait donc
  passer sous le seuil, et une créature qui meurt n'entre pas en Furie.
- **L'appel du corbeau** (Valkyrie au corbeau, 5 mana, 3/4, Envol, Furie 2) — à son
  arrivée, son contrôleur pioche une carte dont la ligne de type contient
  **Viking**, choisie uniformément au hasard parmi les exemplaires encore
  dans son deck. Le type imprimé décide : un Loup des neiges (type Loup) et
  les sorts Neige ne sont pas éligibles. S'il ne reste aucun Viking dans le
  deck, l'arrivée ne fait pas piocher de carte de remplacement.
- **Provocation** (Berserk des trois hivers, 3 mana, 2/4, Furie 2) — quand
  le Berserk attaque, le défenseur doit lui assigner au moins un bloqueur
  légal si un tel blocage est possible. S'il y a plusieurs provocateurs et
  trop peu de bloqueurs, l'affectation doit couvrir le plus grand nombre de
  provocateurs qu'un appariement légal permet ; sans bloqueur légal,
  l'attaque peut passer.

Les créatures du Nord gardent leurs capacités propres (Provocation du
Berserk, Envol des valkyries, bouclier d'arrivée du Guerrier, vent froid
d'arrivée de la Valkyrie des glaces).

Le **vent froid** de la Valkyrie des glaces ne choisit pas son camp : 1 dégât
à **toutes** les créatures de la table, les siennes comprises — elle encaisse
son propre point de dégât et court la même chance de gel (25 %) que les
autres. C'est le même drapeau `inclutAllies` que l'Ifrit al-Ahmar ; la
brume de l'animation couvre donc les deux rangées (`rpg-mass-freeze--table`)
et non la seule ligne adverse.

Deux règles encadrent ces attaques. **Une seule phase d'attaque par tour**, et
par camp : une fois le combat déclaré et résolu, il n'y en a pas de second avant
le tour suivant (`duel.attaqueJouee`, posé par `rpgLancerAttaque` sur une
déclaration acceptée et remis à `null` par `rpgFinDeTour`). Et **Attaque ciblée**
(Fériel, le Djinn de foudre, et les armes qui le donnent) : déclaré
attaquant, le porteur **peut** frapper une créature adverse de votre choix —
elle a **30 % de chances d'être manquée** — sans riposte, avant les blessures
de combat, et **son attaque s'arrête là**, même si la frappe rate : ni blocage,
ni échange, ni dégâts au sorcier. Dirigée vers le sorcier adverse, l’attaque ciblée
le touche avec **100 % de précision** ; les bloqueurs s'appliquent normalement.
Sans proie désignée, le porteur attaque normalement.

Moteur : `src/games/rpgDuel.js` (testé), catalogue créatures dans
`src/games/rpgCards.js` (`RPG_CREATURE_CARDS`, première dizaine du set).

### Le roi Kusayla et son guépard (Sable)

Le catalogue accueille **Le roi Kusayla** (`kusayla-roi-des-imazighen`), la
figure du souverain awraba qui défit l'expédition omeyyade dans le défilé de
**Tahouda** (683) puis tint Kairouan jusqu'à sa mort au combat, en 688. La fiche
suit la mémoire amazighe du roi — Aksel, Aksil, Kusayla, Koceila, selon les
traditions — sans en faire un sujet de polémique : c'est le roi qui défend sa
terre, rien de plus.

- **Un héros hybride Sable + Ténèbres, mythique** : 5 manas, **4/5**,
  `kind: 'hero'`, `colors: ['sable', 'tenebres']`, ligne de type « Créature
  légendaire — Roi amazigh », une seule copie par deck (`cardCopyLimit`). Le
  Sable est la terre qu'il défend, les Ténèbres la nuit où il frappe : son coût
  exige **un pip de chaque couleur** (`colorCost: { sable: 1, tenebres: 1 }`,
  les quatre autres manas sont génériques), et son cadre se partage en deux
  suivant l'ordre canonique des couleurs, `hybride-sable-tenebres`
  (`#a98cbf`). Il n'entre ni dans les recettes de départ ni dans la dotation :
  il se révèle au sommet de la **Tour des Sables** (`sables-3`), avec Tin Hinan
  et Yamina — c'est la **seule carte teintée de Ténèbres** de la tour, la
  couleur ne s'installant pour de bon qu'à la Nécropole.
- **Contre-attaque** — le même drapeau que Tojiro et Eirik
  (`contreAttaque: true`, `riposteDeContreAttaque` dans `rpgDuel.js`) : une
  créature adverse qui le frappe avec Attaque ciblée ou le cible avec une
  capacité encaisse ses 4 dégâts d'attaque ; un sort qui l'atteint, ciblé comme
  de zone, fait riposter sur le sorcier adverse — à condition qu'il survive à
  la vague (les sorts de zone passent par `ripostesDeZone`).
- **Le guépard du roi** — `arrivee: { type: 'jetons', jeton: 'guepard', nombre: 1 }` :
  quand Kusayla arrive, **un guépard 2/1 avec Rapidité entre en jeu sans coût**,
  sur le chemin des chiens de sable de Tarek (voir la section des
  créatures-jetons). Aucune cible à désigner, donc aucune attente : la pose et
  le fauve se résolvent d'un seul geste, et seul le coût du roi est payé. Le
  guépard est une **carte-jeton** (`RPG_JETON_CARDS`, hors catalogue) : elle ne
  se collectionne pas, ne s'achète pas et n'entre dans aucun deck.
- Sa peinture est un plein art 4:5 dédié, refaite dans la veine **soulslike**
  (la seule carte du catalogue à ce registre) : le roi **à cheval** sur un champ
  de bataille de cendre, **armure de plaque dorée complète et rongée**, **tête
  nue — aucun heaume**, visage d'un homme d'environ **trente-cinq ans** aux longs
  cheveux noirs, l'or qui **luit faiblement de l'intérieur**, une **grande hache
  de fer noirci** levée, le **guépard** au pelage fauve doré, taches noires et
  larme de l'œil, qui court à sa droite, et des **accents dorés dans le fond**
  (l'arche brisée, les bannières, les boucliers coulés, la poussière) sans
  jamais dépasser l'éclat de l'armure (direction artistique
  `RPG-CARD-ART.md`). Sa révision de cache est `kusayla-roi-imazigh-v1`,
  déclarée dans `rpgCardArt.js` — le guépard-jeton porte la sienne,
  `guepard-jeton-v1`.

### Bouchra, la guerrière des crêtes (Sable)

**Bouchra, guerrière des crêtes** (`bouchra-guerriere-des-cretes`) ajoute au
Sable une combattante de tempo : une **mythique** à **2 manas, 3/1**, ligne de
type « Créature légendaire — Guerrière amazighe », **un seul exemplaire** par
deck. C'est, avec Eirik du Premier Serment (Neige, 1 mana 1/1, Compagnie), la mythique la
moins chère du catalogue : sa puissance calculée est **44,45**, dans la bande
mythique (41,8 à 44,4), et son corps de 3/1 pour deux manas est le plus
agressif du Sable.

- **Rapidité** — sa chèvre de guerre ne connaît pas le mal d'invocation : elle
  attaque le tour où elle arrive, comme le Djinn de foudre ou Fériel.
- **Esquive** — 30 % de chances d'esquiver une attaque, une Magie ou une
  Sorcellerie (les capacités ne s'esquivent pas). C'est sa seule défense : elle
  ne porte **pas de bouclier**, elle glisse dans la pente. À 1 PV, une attaque
  sur trois seulement est annulée — la mythique se joue en tempo, pas en mur.
- **Attaque ciblée** — déclarée attaquante, elle peut frapper une créature
  adverse de votre choix (25 % de chances de rater, 100 % contre le sorcier) :
  ses **3 dégâts** passent **sans riposte** et son attaque s'arrête là. C'est la
  mécanique des archers du Soleil rouge, et son grand arc la rend naturelle.
- **Rien à l'arrivée, aucune cible à désigner** : `arriveeCiblePortee` rend
  `null` — son arc se paie en attaquant, pas en se posant.
- Elle n'appartient à aucun boîtier de départ : elle se révèle à l'étage 3 de la
  **Tour des Listes** (`listes-3`), avec la gardienne des ksour, puis s'achète
  au Souk.
- Sa peinture (plein art 4:5, révision `bouchra-cretes-v2`) la montre en noir
  des pieds à la tête, **toute jeune — une vingtaine d'années, visage lisse**,
  **un grand arc recurve bandé à la joue et un carquois dans le dos — ni sabre,
  ni bouclier**, sur sa chèvre lancée dans le sentier des Aurès — poussière
  étirée derrière eux, cailloux projetés, flou de mouvement sur le fond, visage,
  flèche et corde nets. Direction artistique `RPG-CARD-ART.md`.

### Les créatures-jetons (les chiens de sable de Tarek, le guépard de Kusayla)

Tarek, **Le Porteur**, porte deux capacités qui se lisent sur la même ligne :

> Quand Tarek arrive en jeu, il crée deux chiens de sable 1/1 avec Rapidité
> sans coût. Tant que Tarek est en jeu, vos créatures Sable **adjacentes**
> gagnent +1/+1.

- **l'aura** ne touche plus que les créatures Sable **adjacentes** de **son**
  camp (les chiens du Tarek du sorcier appartiennent au sorcier) : quand Tarek
  arrive seul, ses deux jetons prennent les cases 1 et 2 — seul celui de la
  case 1, voisin de Tarek, passe de 1/1 à 2/2 ;
- **l'arrivée** est le nouvel effet `jetons` du moteur : elle fait naître deux
  **créatures-jetons** (`RPG_JETON_CARDS`, fiche `chien-de-sable`, 1/1, coût 0,
  `jeton: true`). Aucun sable n'est payé en plus : le coût de Tarek est le seul
  paiement.

Un jeton **se comporte comme une créature posée depuis la main** — mal
d'invocation compris, il attaque et bloque dès le tour suivant — et il occupe
une vraie case : le chien voisin de Tarek arrive à 2/2 et retombe à 1/1 si
Tarek quitte la table, tandis que le chien de la case suivante reste une 1/1.

Le second jeton du set est le **Guépard** de Kusayla (`guepard`, 2/1, coût 0,
`jeton: true`, `rapidite: true`) : le roi l'appelle à son arrivée, un seul
exemplaire. Il ne connaît pas le mal d'invocation — **Rapidité** le rend prêt le
tour même, comme la bête qui court déjà devant le cheval — mais il ne survit
pas plus qu'un autre corps 2/1. Sa peinture est un plein art 4:5 dédié
(`public/cards/guepard.jpg`), un guépard fauve sur la cendre du champ de
bataille, révision de cache `guepard-jeton-v1`.

Ce qu'un jeton **n'est pas** :

- il n'est pas une carte de collection : hors de `RPG_DUEL_CARDS`, donc absent
  des decks, du draft et de l'atelier ; seuls les effets le font entrer en jeu ;
- il ne retourne jamais dans une main : un renvoi (`retour-main`, Ressac ou
  Courant de retour) le fait **cesser d'exister** au lieu de le rendre à son
  propriétaire — sinon un chien de sable deviendrait une carte gratuite et
  rejouable.

Enfin, seuls les effets d'arrivée **qui désignent une cible** reçoivent un
`cibleId` (`rpgJouerCreature`) : la création de jetons n'a pas de cible, donc
elle ne peut pas être interceptée par le contresort de Boualem.

Quand Boualem contre un effet qui le ciblait, l'effet n'est pas annulé : il est
**relancé sur une nouvelle cible légale**, et c'est **celui qui joue Boualem**
— jamais le lanceur du sort — qui la choisit, parmi **toutes les créatures de
la table**, y compris celles du lanceur (`duel.boualemEnAttente`, résolu par
`rpgResoudreContresortBoualem`). L'IA choisit seule à la place de son camp et
vise de préférence le camp du lanceur ; s'il ne reste aucune cible légale,
l'effet se dissipe.

Illustration : `public/cards/chien-de-sable.jpg`, peinture plein art 4:5 dans la
palette et la matière de celle de Tarek (direction artistique `RPG-CARD-ART.md`).

Deuxième famille de jetons, côté Soleil rouge : le **Daimyō du Soleil rouge**
lève **deux Samouraïs 1/1** (`samourai-du-daimyo`) en arrivant, par le même
effet `jetons`. Le jeton est un **Samouraï** au sens des règles — la Résonance
samouraï le renforce donc comme la bannière de son seigneur — mais il ne porte
ni Harakiri (un jeton n'est pas une carte du set) ni Rapidité : il garde le mal
d'invocation, comme les chiens de sable. Illustration dédiée
`public/cards/samourai-du-daimyo.jpg`, plein art 4:5.

### L'aura de forge (Kenshi de la forge)

Le Kenshi de la forge est un **1/2 à 3 mana** qui porte une aura de voisinage :

> Tant qu'il est en jeu, vos créatures adjacentes gagnent +1/+0, quel que
> soit leur type.

- **Seulement ses deux voisines, dans son propre camp, mais tous les types** —
  Samouraïs, yōkai et créatures non-Samouraïs reçoivent la forge si elles
  occupent une case voisine ; le camp adverse et les cases plus lointaines
  n'en profitent pas. Une case vide coupe le voisinage.
- **La source ne se forge jamais elle-même.** Deux sources voisines d'une même
  créature lui donnent +2/+0 ; deux sources éloignées ne se donnent rien.
- **La défense ne bouge jamais** : perdre l'aura ne peut pas tuer, et l'attaque
  retombe au plancher de 0. Chaque entité ne retient que l'écart appliqué
  (`auraKenshiBonus` — nom historique de l'accumulateur), même contrat que
  l'aura Sable de Tarek et l'égide d'Amani — les statistiques déjà gagnées
  (Furie, renforts) ne dérivent pas.
- L'aura se **cumule** avec la Résonance samouraï et la bannière du Daimyō
  quand la cible est voisine : sous un Torii et un Kenshi, un Samouraï de base
  gagne +2/+1.

Moteur : `appliquerAurasBuffAutres` (`rpgDuel.js`), appelée par
`rafraichirAuras` avec les autres auras de présence ; elle lit toutes les
fiches `aura.type === 'buff-autres'` qui donnent de l'attaque — le Kenshi et
**Bou Jeloud** de la Tour oubliée. L'adjacence vient de `casesRangee` et
`voisines` : les cinq cases dessinées en mode sans terrains, l'ordre d'arrivée
dans le format historique. Le catalogue imprime l'aura sur la carte
(`aura: { type: 'buff-autres', atk: 1, def: 0, saufSoi: true, camps: 'camp' }`),
et `rpgCardPower.js` en tient compte dans la valeur de la carte.

### La bannière (Daimyō du Soleil rouge)

Le Daimyō porte la seule capacité de ce genre au catalogue :

> Quand le Daimyō arrive en jeu, il crée deux créatures-jetons « Samouraï »
> 1/1. Tant qu'il est en jeu, chaque fois qu'un Samouraï de votre camp attaque,
> ce Samouraï gagne +1/+1.

- **C'est un déclenché d'attaque, pas une aura.** Le renfort (`banniere: {
  tribu: 'samourai', atk: 1, def: 1 }`) se pose au moment où l'attaque est
  **déclarée** — donc avant les blessures : la frappe du tour en profite déjà
  (`rpgLancerAttaque`, `rpgAttaquerCreature`, `rpgAttaquerSorcier`). Le moteur
  l'applique à travers `appliquerBannieresAttaque`, qui partage la lecture des
  types avec la Résonance (`cardReceivesResonance`).
- **Le gain reste acquis.** La bannière ne reprend jamais ce qu'elle a donné :
  l'attaque finit, le Daimyō meurt, le Samouraï grandit reste grand.
- **Un camp, pas les deux.** Contrairement à la Résonance, la bannière ne
  renforce que le camp de sa source ; deux bannières en jeu se cumulent.
- **Le Daimyō est un Samouraï** : sa propre attaque le grandit aussi.

## 4. La boucle de tour : six phases

Un tour compte **six phases**, dans l'ordre (`RPG_PHASES` dans `rpgDuel.js`, lue
dans `duel.phase`). Le rail de l'interface les allume une à une ; le moteur les
enregistre mais ne verrouille aucun geste : chaque fonction garde sa propre règle.

| # | Phase | Ce qui s'y passe |
| --- | --- | --- |
| 1 | **Début de tour** (`debut`) | On dégage ses terrains et ses créatures, le mana non dépensé s'évapore, **on pioche 1 carte**, les échos et retours programmés tombent. |
| 2 | **Phase principale** (`principale`) | On pose **un terrain** (un par tour), on engage ses terrains, on joue des **créatures** et des **magies** en payant le mana. |
| 3 | **Phase d'attaque** (`attaque`, ⚔) | On déclare **toutes** les créatures attaquantes d'un coup, puis on confirme. |
| 4 | **Phase de blocage** (`blocage`) | Le défenseur désigne ses bloqueurs. **Les deux camps peuvent jouer des magies rapides** avant les blessures — le joueur comme le sorcier. |
| 5 | **Deuxième phase principale** (`principale2`) | Après le combat : mêmes gestes qu'en phase 2 — créatures, magies, terrain. **Le terrain reste unique pour tout le tour** (celui de la phase 2 compte). Les créatures qui ont attaqué **restent engagées** jusqu'à leur prochain tour. |
| 6 | **Fin de tour** (`fin`, la grande pastille dorée ⧗) | Quand un camp termine son tour, **l'adversaire peut jouer une magie rapide** (une fenêtre, `rpgOuvrirFinDeTour`). Ensuite seulement le tour se ferme (`rpgFinDeTour`) et les effets « jusqu'à la fin du tour » prennent fin. |

Précisions :

- **Seules les magies rapides** se jouent hors de son tour (blocage, fin de tour).
  Les sorcelleries restent réservées à ses phases principales. Un **contre** n'a
  rien à contrer en fin de tour : il ne compte pas dans « j'ai une réponse ».
- **Le Rempart de dunes** (« jusqu'à la fin du tour ») protège pendant toute la
  fin de tour, y compris face à la magie rapide adverse ; il disparaît à la
  fermeture du tour, après la fenêtre.
- **Fenêtre de fin de tour du sorcier** : si le joueur a en main une magie rapide
  qu'il peut payer, un bandeau « Fin du tour du sorcier — Magie rapide ? » avec un
  bouton **Passer** s'ouvre ; sinon la fenêtre se referme d'elle-même. Fin du tour
  du joueur : le sorcier joue au plus une magie rapide (`rpgSorcierMagieRapide`),
  s'il en a une qui vaut son mana — il garde le mana qu'il n'a pas dépensé.
- **Le sorcier a, lui aussi, une deuxième phase principale** : après son combat,
  il peut encore annoncer des cartes (le joueur répond comme d'habitude), puis sa
  fin de tour s'ouvre.
- Pendant la phase de blocage d'une attaque du joueur, le sorcier peut répondre
  par une magie rapide une fois les blocages acceptés, avant les blessures.

### Ce qui se passe à la charnière des deux tours

Deux effets ne se résolvent pas dans le tour qui les joue ; le moteur les
note sur le camp concerné et les liquide au tour suivant (`rpgFinDeTour`) :

- **le bonus borné** (`effet.tours`, la carte `buff`) — *Rempart de dunes*
  donne `+0/+3` à toutes les créatures du joueur **jusqu'à la fin du tour** :
  le gain est inscrit dans `camp.bonusTemporaires` **avec le tour qui le voit
  naître**, puis retiré quand *ce* tour-là se termine, avant que l'autre camp ne
  commence. Une sorcellerie meurt donc avec son propre tour — elle renforce vos
  attaques et vos échanges, elle ne vous protège pas pendant le tour adverse ;
  et le jour où une magie rapide portera le même `tours`, elle s'évaporera avec
  l'échange en cours plutôt qu'avec le tour du camp renforcé. Contrairement
  à la Résonance, ce retrait **peut** faire tomber une créature déjà entamée
  (le plancher de 1 ne s'applique qu'aux auras de table) : on ne renforce pas
  trois tours pour rien.
- **l'écho** (`effet.echo`, la carte `degats`) — *Nuage de cendres* inflige
  d'abord ses 2 dégâts, puis promet les mêmes **au début du prochain tour de
  son lanceur** : la promesse est consignée dans `camp.degatsEchos` de la
  victime (avec `coteSource`, le camp qui l'a lancée) et ne retombe que quand
  son lanceur reprend la main — l'autre camp a donc son tour entier pour jouer
  avant qu'elle ne tombe, et elle brûle alors ce qu'il a posé entre-temps. La
  promesse est écrite **même sur une table vide** : un nuage suspendu au-dessus
  d'une table déserte attend le tour adverse ; si rien ne s'y trouve à son
  heure, l'écho se dissipe et le journal le dit. Sur plusieurs tours
  (`echo.tours`), chaque reprise de main du lanceur retire un tour à la
  promesse. La vague venue d'écho **se voit** : à l'ouverture du tour du
  lanceur, la carte du sort se réaffiche en preview au centre de la table, et
  le bandeau « SECONDE VAGUE » nomme la vague — le sort se reconnaît à sa
  deuxième apparition, comme au premier lancer.

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

Sur les cartes de sort, le **losange jaune** (Magie Rapide, éclair) et le
**rond violet** (Sorcellerie, étincelle) gardent leurs formes et leurs couleurs
de famille, quel que soit l'élément de la carte, y compris pour une hybride.
L'élément reste indiqué par la pastille, le cadre et le coût. Le bandeau de
famille reprend les mêmes teintes (or pour la Magie Rapide, améthyste pour la
Sorcellerie). La **lueur de carte jouable**, elle, ne dit plus la famille : elle
est en azur — le cyan des cartes jouables de MTG Arena, serré contre la face —
pour toute la main, et l'or n'y sert qu'à une carte **mythique** jouable — la
rareté, pas le sort.

### Le chiffre d'un effet s'écrit sur la carte

Une carte qui **change les statistiques** d'une créature porte son chiffre sur
sa face, dans la même plaque que les statistiques d'un corps ou le bonus d'un
porteur : la **Lame de mer** affiche `⚔ -2 🛡 -2`, l'**Embuscade** aussi (elle
rabote toute la table adverse), la **Vipère de verre** `⚔ -2 🛡 0`, la
**Brisure de verre** `-1/-1`, et les renforts **+1/+1**, **+2/+1**, `+0/+3`,
**+2/+2** en teinte de bonus. Sans ce chiffre, le nombre ne vivait que dans la
phrase de règle — or une face de carte n'imprime pas la règle, et « donne
-2/-2 » se lisait donc seulement en ouvrant la fiche.

- la source du chiffre est unique — `modificationStats(carte)` et
  `libelleModificationStats(carte)` (`rpgCards.js`) lisent `effet` **ou**
  `arrivee` (`buff` / `debuff`) et écrivent `-2/-2`, `+1/+1`, jamais `+-2` ;
- la même valeur devient une pastille (`pastillesPourCarte`,
  `effetIcons.js`) : « Affaiblissement -2/-2 » sur le sprite `i-degats`,
  « Renfort +1/+1 » sur `i-aura` — donc aussi dans les pastilles du Souk, du
  guide et de l'aperçu, où le survol dit sa règle : « La cible perd 2 en
  attaque et 2 en défense. Si sa défense tombe à 0, elle est détruite. » La
  vipère ne cite que l'attaque qu'elle retire ;
- les **armes** sont exclues du calcul : leur bonus de porteur (`bonusArme`)
  s'affiche déjà, et deux chiffres pour la même chose se contrediraient ;
- les créatures en main gardent leurs propres statistiques : la modification
  d'une arrivée (Vipère de verre) se lit sur la pastille et
  dans la règle, pas à la place du `atk/def` du corps ;
- l'atelier de decks écrit le même libellé dans sa ligne compacte
  (` · -2/-2` derrière le type), et les lecteurs d'écran reçoivent la valeur
  (« Effet sur les statistiques : -2 attaque, -2 défense ») sur la carte en
  main comme sur l'aperçu.

### Un effet dépensé reste écrit, en gris

Tenacité qui a déjà sauvé son porteur, Bouclier qui a bloqué son sort : l'effet
ne s'efface pas de la face, il **se grise** (`is-epuisee`, `effet-icons.css`) —
icône, mot, pastille de l'aperçu et lignes de règle. Le joueur voit ce qu'il a
dépensé au lieu de deviner pourquoi la carte a changé.

Le bouclier **prêté** suit la même règle. Une Parade de verre ou la Hache de la
banquise ne s'impriment pas sur la fiche de la créature : c'est
`bouclierEpuise` (`rpgDuel.js`, posé par `briserBouclier`) qui garde la trace
de la parade tombée, et `IconesCarte` / `effetsEpuisesPourEntite`
(`effetIcons.js`) qui rallument son icône violette en gris. Sans cette trace,
l'icône s'évaporait à la chute du bouclier et le joueur ne savait plus si la
protection avait été rompue ou si elle n'avait jamais existé.

### Le bouclier d'arrivée se désigne

Trois cartes portent un `arrivee.bouclier` : le Guerrier au bouclier rond, la
Veilleuse des citernes et la Tour de sable. Elles le **donnent**, elles ne se
contentent pas de le garder : `choisirCible: true` ouvre la désignation sur la
table (`arriveeEnAttente` puis `rpgResoudreArriveeCiblee`) et le bouclier va à
la créature alliée touchée. Salem reste en `cible: 'soi'` : le sien ne se prête
pas.

Le Guerrier ajoute `cibleSoi: true` — sa parade peut rester sur lui. Sans cette
exception, un Guerrier seul sur le champ n'aurait aucune cible légale
(`arriveeACibleLegale` ne retient que les autres créatures amies), la carte
serait injouable et la leçon Neige n'aurait plus de bouclier à faire tomber.
Le texte imprimé le dit : « une créature alliée ciblée — ou lui-même — reçoit
un bouclier ».

## 7. Les contres (deck Marée des abysses)

Le deck **Marée des abysses** (`RPG_DECK_MAREE_BASE`, mono-Eau, 16 Mer) joue la
réponse : des **contres** qui défont la carte que le sorcier vient d'annoncer.

Il n'y a **pas de prévention** : aucun contre ne reste en réserve pour la suite.
Un contre ne peut être joué que pendant une annonce du sorcier, et il vise
**cette** carte-là.

| Carte | Contre | Effet |
|---|---|---|
| *Contresort des abîmes* (×3) | n'importe quelle carte annoncée (créature ou sort) | `cible: 'carte'` |
| *Silence d'écume* (×3) | la magie rapide ou la sorcellerie annoncée | `cible: 'sort'` |
| *Déflection* (×2) | un sort annoncé, puis piochez une carte | `cible: 'sort'`, `pioche: 1` |
| *Écueil* (×2) | la **créature** annoncée (jamais un sort, jamais une arme) | `cible: 'creature'` |

La famille des contres se lit comme une échelle : **Écueil** (2 manas) ne
recouvre que les créatures, **Silence d'écume** (2) les sortilèges,
**Déflection** (3) les sortilèges avec pioche, **Contresort des abîmes** (4)
tout ce qui s'annonce. Chaque carton a sa fenêtre — la plus étroite est la
moins chère.

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

**Bakunawa** (mythique) n'a plus d'effet de contre : à son arrivée, la lune
dévorée **interdit à une créature adverse de bloquer** jusqu'à la fin de son
prochain tour (débuff ciblé, `empeche-blocage`). Les autres bêtes : **Kraken**
(à sa destruction, pioche 2), **Léviathan** (à son arrivée : **renvoie toutes
les autres créatures** en main — `retour-main`, `cible: 'toutes-autres'`),
**Jörmungandr** (pioche 3 cartes et défausse 1 carte à l'arrivée). La langue
de l'Eau est le contrôle : elle **ronge** (−X/−X, la *Lame de mer*, la
*Brisure de verre*), elle ne brûle plus — voir la note de direction (§11).

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
| *Courant de retour* (×1) | Sorcellerie — Eau, 3 mana | Renvoyez une créature adverse ciblée dans la main de son propriétaire, puis piochez une carte. |

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

## 9. Les armes (l'équipement attaché en jeu)

L'**arme** est le cinquième type de carte du duel (`RPG_ARME_CARDS` dans
`rpgCards.js`, fiche via `armeById`). Elle ne reste pas seule sur la table :
elle s'**attache directement**, en étant jouée depuis la main et payée en
mana, sur une créature alliée — **héros et jetons compris**. L'emplacement
est unique :

- **une arme par créature** : attacher la seconde arme envoie la première
  au cimetière ;
- l'arme suit son porteur : quand il **quitte la table** (destruction,
  renvoi en main, exil), l'arme part au cimetière — un jeton qui cesse
  d'exister l'entraîne avec lui ;
- le porteur gagne les bonus imprimés (**+X/+Y**) et les mots-clés donnés
  (`donne` : Attaque ciblée, Rapidité, immunité contre une couleur) **tant que
  l'arme est attachée** ; le retrait se fait sans tuer, avec le plancher de
  1 PV du patron Résonance. La **Rapidité** accordée désactive le mal
  d'invocation du porteur, dans les deux sens ;
- comme tout ce qui entre en jeu, une arme peut être **contrée** à la
  pose ; contrée, elle ne s'attache pas et son éventuel effet d'arrivée
  n'a pas lieu.

Quatre armes forment le prototype — une par élément, des effets **mixtes
étagés par rareté** (dérogation photoréaliste : voir `RPG-CARD-ART.md`) :

| Carte | Élément | Coût | Effet |
|---|---|---|---|
| Takouba des pistes | Sable (commune) | 3 | **+2/+0 et Infiltration** : le porteur ne peut pas être bloqué, par personne — l'arme de départ, offerte dès la première collection, est devenue une arme d'assaut pur (aucune défense ajoutée). |
| Bâton des citernes | Eau (rare) | 4 | +1/+2 ; à son arrivée et pour **3 manas** (capacité activée au tour du contrôleur) : un jeton **Serpent des citernes** 3/1 Rapidité, **détruit à la fin du tour** de sa création. |
| Lance de givre | Neige (rare) | 3 | **+1/+0 et Attaque ciblée** au porteur, tant que la Lance reste attachée ; elle ne donne aucun bouclier. |
| Armure de cendres | Braise (**mythique**, unique dans un deck) | 4 | **+3/+3, Rapidité** et **immunité contre la Braise** : le porteur ne peut pas être ciblé par la Braise et n'en reçoit aucun dégât (protection pilotée par `rpgEstProtegee`). |

Le serpent des citernes est le deuxième jeton du catalogue
(`RPG_JETON_CARDS`, `serpent-des-citernes.jpg`) : contrairement au chien de
sable, il est **éphémère** (`detruireFinDuTour`), soldé par
`detruireEphemeres` dans `rpgFinDeTour`. Les quatre armes équipent les cinq
decks du catalogue (40 cartes, au moins 40 % de terrains) ; les decks
d'Histoire n'en reçoivent pas.

Le **Sabre maudit** (Soleil rouge, rare, coût 4) est une arme de même nature : le moteur le
traite comme une magie à effet `arme` (ciblage, `porteur.armes`), mais sa présentation est celle
des armes — cadre ordinaire de Braise, ligne « Arme — Sabre maudit », stats de porteur (+4/-2) dans
la main, l'aperçu, l'atelier et le guide, et texte « Arme — Le porteur gagne… ». `carteEstArme`
et `bonusArme` (`rpgCards.js`) disent qu'une carte est une arme pour l'affichage.

Illustrations : `public/cards/<identifiant>.jpg` plein art 4:5 — un porteur
en pleine action, l'arme entièrement dans le cadre (voir la dérogation
photoréaliste de `RPG-CARD-ART.md`).

Présentation : les cartes Arme utilisent **le cadre ordinaire de leur
élément**, comme les autres cartes du catalogue. Il n’existe plus de cadre
métallique, de guilloché de Damas, de variante `arme` ni de classe CSS
spécifique aux armes. La couleur et les éventuels motifs suivent donc les
mêmes règles que pour une créature, une magie ou un terrain de cet élément ;
une arme mythique conserve les effets de rareté communs, sans traitement de
matière particulier. L’épaisseur est celle du gabarit de la face, sur PC
comme au doigt, sans changer la taille extérieure des cartes.

**Créature armée = cadre ordinaire de la créature.** Une créature qui porte
une arme conserve son propre cadre et sa propre couleur. L’équipement ne
remplace plus cette présentation par un cadre d’arme : il reste consultable
dans les effets et dans l’aperçu, tandis que la carte posée demeure un
emplacement ordinaire de la rangée, exactement de la taille de ses voisines.
Le cadre ne change rien au jeu : la créature reste l’unique carte qui agit.
Une créature armée ne se regroupe avec aucun homonyme
(`groupEntitesParCarte`, `rpgCardStacks.js`) ; elle forme toujours sa propre
pile d’exemplaires, même au doigt. `armesPortees` lit à la fois l’arme du
prototype (`entite.arme`) et l’arme de l’effet « arme » des magies
(`entite.armes`, le Sabre maudit).

**L'aperçu dit l'équipement.** Sur la carte posée, ni le texte d'effet ni
le bonus d'attaque/défense de l'arme ne sont imprimés (et aucun infobulle
n'en révèle le texte). Les compteurs d'effet sont des **petits losanges
chiffrés sous le repère de couleur** d'une carte mono, mais **sous son coût**
si elle est hybride : Heures sur la créature et sable sur la Jitte équipée,
côte à côte si les deux sont présents ; ils disparaissent à zéro, et leur
nature reste annoncée au lecteur d'écran. Les « ×N » des
piles comptent des exemplaires, non des effets, et conservent leur bouton.
Au survol, à l'appui long et sur la fiche ouverte depuis la table, l'aperçu
de la créature contient une petite carte pour **chaque arme portée** : image,
coût, nom et texte d'effet (abrégé visuellement au survol, entier sur la
fiche). Les bonus et effets directs accordés par l'arme rejoignent aussi le
texte d'effet de la créature en bleu (« Bonus d’équipement : +X/+Y ·
Infiltration », par exemple). La pile armée et les règles du duel ne changent
pas.

**Désarmer l'adversaire.** *Brise-lame* (`brise-lame`, Magie Rapide Braise,
coût 3, inhabituelle) détruit **une arme équipée à une créature adverse** et
fait piocher une carte. La cible doit porter au moins une arme — prototype
(`entite.arme`) ou Sabre maudit (`entite.armes`) — et n'être ni protégée contre
la Braise, ni protégée contre les sorts. L'arme rejoint le cimetière de son
camp ; ses bonus, ses mots-clés et son bouclier quittent le porteur, qui reste
en jeu avec ses statistiques imprimées. Comme tout sort qui désigne une
créature adverse, l'Esquive et la Contre-attaque peuvent répondre ; la pioche,
elle, reste acquise même si l'effet est esquivé. `rpgSortACibleValide` éteint
la carte en main tant qu'aucune créature adverse n'est équipée.

## 10. Le Butin (set Sable)

Le **Butin** est le mot-clé offensif du set Sable (`nerfs-set-sable.md`) :
quand une créature dotée du Butin **touche le sorcier adverse en combat**, son
contrôleur **pioche une carte puis en défausse une**.

- le déclenchement exige une **blessure de combat au sorcier** : une créature
  bloquée qui n'a pas le champ libre ne butine rien ; l’attaque ciblée portée à
  une créature non plus ; le Grand Voile blanc, qui avale les coups, l'annule ;
- c'est le même chemin que les déclencheurs d'armes du Sable : les bilans de
  combat (`rpgLancerAttaque`, `rpgAttaquerSorcier`) disent qui a frappé le
  sorcier et pour combien, et `declencherButins` (`rpgDuel.js`) résout la
  pioche puis la défausse — la défausse passe par `defausseEnAttente`, comme
  toutes les défausses ;
- les déclencheurs **se cumulent** : deux créatures à Butin qui touchent le
  sorcier au même combat font piocher 2 puis défausser 2 — chaque source
  garde son effet entier, les demandes de défausse s'ajoutent
  (`ouvrirDefausseEnAttente`, `rpgDuel.js`). Même règle pour les autres
  effets de contact : le Tribut du set Ténèbres transfère ses PV par
  créature, les armes du Sable déclenchent chacune la leur, et deux
  défausses d'effet dans la même fenêtre (deux « Nom effacé ») se cumulent
  aussi ;
- le mot-clé se lit sur la fiche (`butin: true`, `rpgCards.js`), et vaut
  **+1,2** dans la formule de puissance (`rpgCardPower.js`) ;
- son icône est la **besace percée** (`#effet-butin` du sprite
  `preview-effets-icone.html`), pastille sous la ligne de type. Dans un aperçu
  de carte, la pastille porte un **« ? » cerclé** et ouvre sa **bulle** au
  survol (au toucher comme au clavier) : les phrases des mots-clés génériques
  (Rapidité, Attaque ciblée, Envol…) ne s'impriment plus, seules leurs
  pastilles les portent — une indication « Survolez un mot-clé pour lire son
  effet » les accompagne. Le reste de la description de la carte reste écrit
  (déclencheurs d'arrivée, effets de sorts et d'armes) — l'aperçu dit toujours
  ce que fait la carte (`effetsDetailles().texte`, `HoverCardPreview`,
  `RpgDuelPage.jsx`).

Porteurs (set Sable) : **Fennec des décombres** (2 mana 3/1, Rapidité + Butin —
son Esquive a été rendue au Butin), **Chien du guet** (2 mana 2/2), **Faussoyeur des dunes**
(3 mana 2/2, nouveau — à son arrivée : renvoyez une créature de votre
cimetière en main). Butin et réanimation/récupération portent ensemble
l'identité du Sable : **il prend, il revend, il ressuscite**.

## 11. Note de direction : les dégâts bruts = la Braise

**Les dégâts bruts sont la langue de la Braise.** C'est elle qui brûle, qui
brûle encore, qui brûle le visage : « X dégâts » en texte de carte veut dire
le feu (le *Feu d'ifrit*, le *Braisier du souk* qui frappe la table **et** le
sorcier, `etSorcier`). Les autres éléments ne parlent pas comme ça :

- **Eau** : elle **ronge** (−X/−X, la *Lame de verre* en plus franc, la
  *Brisure de verre* en rideau), elle **renvoie** (*Sonneur fêlé*, la vague du
  *Léviathan*), elle **éteint** (interdits de blocage, le *Silence d'écume*,
  l'*Écueil*). Ses dégâts directs ont été convertis en pertes de pouvoir —
  une créature défaite par l'Eau est **amputée**, jamais brûlée ;
- **Sable** : **tempo et récupération** — le Butin, les renvois du cimetière
  en main (recyclage), la réanimation, les compteurs d'Heures ;
- **Neige** : **le corps et le froid** — statistiques, Furie, gel, durs à
  renverser.

Quand une nouvelle carte doit infliger des dégâts nus, elle est **Braise** ou
elle doit réécrire son effet dans la langue de son élément (dégâts = brûlure,
eau = retrait de pouvoir, sable = prélèvement, neige = blocage/froid). Toute
la campagne de rééquilibrage des cinq sets suit cette règle
(`nerfs-set-{braise,eau,sable,neige,soleil-rouge}.md`).
