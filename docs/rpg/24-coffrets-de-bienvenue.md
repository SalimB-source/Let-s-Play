# Les coffrets de bienvenue

> Dossier 24 — le tout premier choix d'un nouveau joueur : trois coffrets de
> couleurs différentes, un seul ouvert, et la cérémonie qui le présente vague
> par vague.

Code : `src/games/rpgCoffretBienvenue.js` (règles pures), `RpgCoffretBienvenue.jsx`
(écran), `rpg-coffret-bienvenue.css`. La collection suit dans `rpgCollection.js`.

## 1. Le principe

À la première connexion, le Sablier ne donne plus la dotation entière du
catalogue : il présente **trois coffrets**, de **trois couleurs différentes**
tirées parmi les quatre couleurs historiques — Sable, Braise, Neige, Eau. Le
joueur en ouvre **un seul**, et ce coffret **remplace sa dotation de départ**.

- Trois coffrets sur les quatre couleurs : l'offre n'est jamais la même d'un
  appareil à l'autre, mais elle ne propose jamais deux fois la même couleur.
- Le tirage est **fait une fois** puis rangé sur l'appareil
  (`letsplay_sablier_coffret_bienvenue_v1`) : revenir sur l'écran sans choisir
  repropose **les mêmes** trois coffrets, jamais trois autres.
- Le choix est **définitif**. Choisir une deuxième fois ne remplace rien, et un
  identifiant inconnu laisse l'offre intacte.

## 2. Ce qu'il y a dans un coffret

Trente cartes exactement, toutes jouables ensemble :

| Contenu | Nombre | Exemplaires |
|---|---|---|
| Une **mythique**, tirée au hasard dans la couleur | 1 | 1 |
| Des **rares**, distinctes, tirées au hasard | 3 | 1 chacune |
| Des **communes et inhabituelles** de la couleur | le reste | 2 au plus |

Le remplissage suit l'ordre de la couleur du coffret, puis de sa **couleur
alliée** : le Sable pour la Braise, l'Eau pour la Neige. Deux raisons, toutes
deux arithmétiques : la Braise n'a que huit communes et inhabituelles, la Neige
dix — avec deux exemplaires au plus, ni l'une ni l'autre ne remplit les
vingt-six places laissées par la mythique et les trois rares. Le coffret reste
donc **à deux couleurs au plus**, dans la limite de trois que le format
autorise, et il est **toujours un deck valide** (`rpgValiderDeck`) : trente
cartes, quotas de rareté respectés.

Le coffret ouvert devient aussi un **deck de la maison** (`coffretEnDeckMaison`) :
il porte le nom du coffret, sa mythique en peinture de boîtier, et il est jouable
tout de suite, sans passer par l'atelier.

## 3. Le coffret, et ce qu'il montre

Le coffret fermé porte une **peinture** : la mythique de vitrine de sa couleur
(`mythiqueVitrineDuCoffret`, la même que les boosters du Souk affichent —
`MYTHIQUE_VITRINE_PAR_ELEMENT`). C'est une vitrine, **pas** la mythique qui sera
tirée : le coffret donne envie sans vendre la surprise de la troisième vague.
La même image est imprimée sur le boîtier qui s'ouvre, sous la même référence
`data-rpg-coffret-vitrine` — la vitrine et la cérémonie ne peuvent pas se
contredire.

### Le coffret est un boîtier de deck

Le coffret n'a **pas** sa propre 3D. Il prend la forme des boîtiers de deck du
jeu (`DeckBox`, `src/games/rpg-deckbox.css`) : six faces posées autour d'un cube
déformé sous une `perspective`, laque sombre cerclée de laiton, peinture plein
art, plaque du nom, emblèmes de la couleur, compte des cartes.

Ce n'est pas seulement de l'économie de code — c'est la bonne histoire : le
coffret **devient** le deck de la maison une fois ouvert (`coffretEnDeckMaison`).
Le joueur ne voit pas deux objets, mais le même, avant et après. Et tout ce qui
rend un boîtier vivant est déjà écrit et réglé, une fois, pour les trois écrans
de deck : balancement continu décalé d'un boîtier à l'autre, inclinaison au
curseur (`inclinerBoitier`), redressement au survol et au focus, ombre au sol,
reflets de laiton.

Le module de coffret n'ajoute que ce qui lui est propre :

- la **mise en page** des trois boîtiers (`.rpg-coffret__boites`) et le bouton
  qui porte le clic et l'inclinaison ;
- la **légende**, sous le boîtier : emblème + couleur, nom du coffret,
  sous-titre, puis `30 cartes · 1 mythique · 3 rares` ;
- le **contrat de données** : `deckDuCoffret` fabrique le deck que `DeckBox`
  attend. La couleur y est **déclarée** (`element`, `elements`), pas déduite des
  cartes : un coffret reste mono-couleur même si une carte incolore se glisse
  dans son socle. La peinture est la mythique de vitrine (`boxArt`).

### L'emblème de la couleur

Le boîtier de deck porte déjà l'emblème de sa couleur, à quatre endroits : la
bande du couvercle, les deux tranches et le sceau du dos (`rpg-deckbox__medal`).
Le coffret en profite tel quel — un coffret de Neige porte le flocon, pas le
sablier du Sable. La légende répète l'emblème avec le mot, pour les lecteurs qui
ne reconnaissent pas encore les silhouettes.

Ces dessins viennent de `src/games/rpgEmblemes.jsx` (`ElementEmblem`) — le
module que partagent les boîtiers, la jauge de mana du duel, le filtre du
catalogue et le salon : sablier pour le Sable, flamme pour la Braise, goutte
pour l'Eau, flocon pour la Neige, crâne pour les Ténèbres. Le module ne porte
aucune feuille de style (`fill: currentColor`) : la teinte vient du contexte.

Les illustrations sont chargées **sans `loading="lazy"`** : dans un calque
`position: fixed`, un navigateur peut ne jamais déclencher le chargement d'une
image différée, et la zone restait noire. Si l'URL versionnée (`?v=…`) échoue,
`IllustrationCarte` retente une fois sans la version, puis affiche une plaque
au nom de la carte — jamais un rectangle vide.

**La peinture ne porte aucune brillance.** Pas de reflet qui balaie
l'illustration, pas de `mix-blend-mode` sur l'image, pas de cadre hérité de
`rpg-battle.css` : ce qui est peint reste peint. C'est la règle pour la
cérémonie du **booster** comme pour celle du coffret.

La **rareté**, elle, se lit désormais à une lueur — mais une lueur qui vit
*derrière* la carte (`::before` flou, `aria-hidden`), jamais par-dessus :

| rareté | lueur | anneau | taille |
| --- | --- | --- | --- |
| commune | aucune | gris clair | 108 px |
| inhabituelle | halo d'acier, à peine perceptible | acier | 108 px |
| rare | halo froid franc | bleu froid | 160 px |
| mythique | halo d'or qui respire (4,6 s) | double anneau d'or | 296 px au plus |

Le contraste entre les quatre se joue donc sur **trois** axes — la taille, la
lueur et l'anneau — et non sur la seule bordure.

### Pas de cadre : la carte est la peinture

Aucune marge, aucun fond, aucune bordure autour de l'illustration : la carte
**est** l'image, avec un anneau d'un pixel et son nom posé dessous, hors du
volume. La tranche n'a donc que la hauteur de l'illustration — une légende ne
participe pas de l'épaisseur d'une carte.

C'est aussi ce qui rend leurs vraies couleurs aux peintures. Deux voiles ont
disparu :

- le **fond dégradé du cadre**, qui posait un lavis blanc puis noir derrière
  l'image — et, par un effet de bord, se retrouvait parfois devant ;
- la **teinte radiale** de la vitrine du coffret, qui colorait le haut de la
  peinture de la mythique pour la fondre dans la laque. Il ne reste que le
  dégradé du bas, celui qui rend le bloc imprimé lisible.

### La lueur ne doit jamais passer devant

Un détail de moteur, découvert en même temps : la lueur de rareté est un
`::before` **flou et teinté**. Tant que `perspective` était posée sur la carte
elle-même, le `::before` et la carte vivaient dans le même contexte 3D ; les
moitiés de carte inclinées vers l'arrière passaient en profondeur **derrière**
le halo, et l'illustration se retrouvait voilée de la couleur de sa rareté —
bleu sur les rares, or sur la mythique. La perspective est donc portée par
`rpg-coffret__carte-scene`, un enfant direct, et non par la carte : la lueur
reste dans le plan, derrière, et ne touche plus la peinture.

## 4. La cérémonie, par vagues

L'ouverture ne montre pas trente cartes d'un coup. Trois vagues se succèdent,
dans cet ordre :

1. **Le socle** — les communes et les inhabituelles de la couleur ;
2. **Les trois rares** — une seule de chacune ;
3. **La mythique** — seule sur scène.

Chaque carte entre avec un retard croissant (`--rang`), et la barre de jalons
indique où l'on en est. `prefers-reduced-motion` présente tout d'un coup, sans
sortie ni flottement.

Chaque carte est un **volume** : une face avant (peinture, nom, rareté) et une
tranche à droite, née de l'arête et reculée de toute l'épaisseur — la même
grammaire que les faces du coffret, et que les cartes du Souk. La carte est vue
de trois quarts (`rotateX(6deg) rotateY(13deg)`) ; au survol elle se redresse
et s'avance de 26 px. L'épaisseur de la tranche suit la rareté (6 px pour une
commune, 10 px pour la mythique).

### L'ouverture lui rend son épaisseur

Aux proportions de l'étagère (`--bd: .42 × --bw`), la boîte de la cérémonie
ressemblait à une carte posée debout : à cette taille, une tranche de 39 px ne
suffit pas à lire un volume. Le boîtier de la cérémonie prend donc ses propres
mesures — profondeur `0.62 × largeur` (les proportions d'un boîtier de cartes
anglaises : 70 mm de large pour 40 mm d'épaisseur), hauteur tassée à `1.32`,
pose plus franchement de trois quarts (`--rx: -16deg`, `--ry: 32deg`). La
tranche perçue passe de 39 à 66 px, le dessus de 15 à 34 px — et la bouche du
boîtier ouvert devient un vrai creux au lieu d'une fente.

Ces valeurs ne touchent pas au boîtier partagé : `--bh` et `--bd` sont
redéclarés sur `.rpg-coffret__coffre .rpg-deckbox`, plus spécifiquement.

### L'ouverture montre le même coffret

L'acte zéro monte **le boîtier du choix**, agrandi, et l'ouvre. Quatre règles
suffisent, aucune ne redessine le boîtier :

- le **fermoir** (`.rpg-deckbox__latch`) saute — c'est le sceau qui cède, dans
  la langue du boîtier (560 ms) ;
- le **couvercle** est la face du dessus (`--top`). Sa charnière est déplacée
  sur l'arête arrière (`transform-origin: 50% 0`) et la rotation poussée de 90°
  à 152° : il se dresse derrière la boîte au lieu de rester posé dessus (860 ms) ;
- la **bouche** (`::after` du corps, même arête, deux pixels plus bas) apparaît
  alors. Sans elle, le boîtier ouvert montrait le vide entre son arête haute et
  sa face arrière ;
- le **corps** monte et tremble sur `translate` / `rotate`, qui s'ajoutent à la
  pose de trois quarts sans l'écraser — animer `transform` aurait fait sauter
  la boîte à plat.

La lumière, les rayons et les éclats restent **hors** du boîtier, dans la scène :
une nappe floutée posée dans un contexte `preserve-3d` traverserait les faces au
lieu de les éclairer.

## 5. La dotation, remplacée — pas amputée

`collectionJoueur` (`rpgCollection.js`) prend une source de plus : le coffret.

- **Un joueur qui a ouvert un coffret** possède exactement ses trente cartes,
  puis ce qu'il gagne — acquis du compte, apports d'un autre appareil, Souk.
- **Un joueur sans coffret** (sauvegarde d'avant cette version, ou catalogue
  incapable de composer une offre) garde la dotation du catalogue : `COLLECTION_DEPART`
  reste la base, et **aucune collection existante ne maigrit**.
- L'écran ne s'impose jamais à quelqu'un qui a déjà joué : un étage vaincu, des
  acquis ou une collection le ferment (`coffretBienvenueNecessaire`).

## 6. Plus aucun deck de base

Le coffret **remplace aussi la vieille étagère de départ**. `RPG_DECKS`
(`rpgCards.js`) est vide : le joueur ne reçoit plus trois paquets tout faits,
il part de son coffret, puis construit. Les huit anciens paquets restent écrits
sous le nom **`RPG_DECKS_ARCHETYPES`** — c'est le répertoire du sorcier, des
leçons du tutoriel et du mode Histoire ; ils ne sont plus offerts au joueur.

Le parcours d'un nouveau compte, dans l'ordre :

1. **l'écran des trois coffrets** (`RpgCoffretBienvenue`) — le choix est
   définitif, enregistré sur l'appareil et dans le compte ;
2. **`rangerCoffret`** (`useSablierBourse`) range les trente cartes dans la
   bourse (`rangerCoffretDansPortefeuille`, `rpgCredits.js`) — possession **et**
   stock de copies, sinon un coffret qui pose deux fois la même inhabituelle ne
   serait jouable qu'à moitié ;
3. **`enregistrerDeckMaison(coffretEnDeckMaison(coffret))`** pose le deck du
   coffret dans le casier (`maison-coffret-<couleur>`) : trente cartes, jouable
   tout de suite ;
4. **l'atelier et le Souk** font le reste : chaque booster ouvert agrandit la
   collection, chaque deck suivant se compose (`09-atelier-de-decks.md`).

### Le rattrapage au démarrage — `rpgDeckDeDepart.js`

Le casier ne doit pas laisser l'écran Jouer sans deck **sans raison**. À chaque
montage de `useDecksSablier`, `garantirDeckDeDepart({ casier, collection })`
passe :

| situation | ce qui est posé |
| --- | --- |
| le coffret de l'appareil a un deck absent du casier, ses cartes sont là | `maison-coffret-<couleur>`, à l'identique |
| le casier est **vide** et la collection tient trente cartes | `maison-de-depart`, composé par l'assistant dans les **couleurs dominantes** (deux au plus) |
| le casier a déjà des decks | rien : le rattrapage ne double pas l'étagère |
| collection trop mince pour trente cartes | rien : l'atelier est là pour ça |
| identifiant dans les **pierres tombales** (`supprimes`) | rien : un deck supprimé ne ressuscite pas — et supprimer un deck n'en fait pas naître un autre |
| la collection du coffret n'est pas encore descendue (autre appareil) | le deck composé prend le relais, sinon le coffret en dernier recours |

Le deck composé passe `rpgValiderDeck` : il est valide, pas « presque ». Et le
casier n'est écrit **qu'une fois** — réparé *et* complété ensemble, pour qu'un
enregistrement tardif n'écrase pas le deck de départ.

### Ce que cela change à l'écran

- **Jouer** : plus de section « decks du catalogue ». L'étagère n'affiche que
  les decks de la maison et le boîtier « Nouveau deck » ; sans deck, le menu
  n'invente rien (`deckParDefaut` → `null`).
- **La jouabilité** se juge désormais sur la collection **et le stock** :
  `deckSeJoue(deck, collection, exemplaires)` — un deck dont une carte n'est
  plus possédée s'affiche « DECK INCOMPLET » au lieu de mentir.
- **Le salon PvP** (`RpgPvpSalon`) n'aligne que les decks de la maison
  (`decksPourDefi(chargerDecksMaison())`) ; l'arbitre en ligne accepte les
  archétypes du répertoire et, pour les decks du joueur, vérifie la possession
  carte par carte.
- **Le sorcier** joue toujours un archétype (`deckAdverseParDefaut` prend le
  rôle `adversaire`, la Cour des Djinns), jamais le deck du joueur.

## 7. Ce que les tests protègent

`tests/rpg-coffret-bienvenue.test.js` :

- l'offre : trois coffrets, trois couleurs, trente cartes ;
- le contenu : une mythique (une seule), trois rares à un exemplaire, le reste
  en communes et inhabituelles, deux couleurs au plus ;
- la jouabilité : **deux cents tirages de suite** sont des decks valides ;
- le choix : définitif, insensible à un identifiant inconnu ;
- les vagues : socle → rares → mythique, et les trente cartes s'y retrouvent ;
- la dotation : remplacée avec un coffret, intacte sans.
