# 07 — L'onglet Deck : les decks sont des boîtiers 3D

> L'onglet **Deck** du menu (`GameModeMenu`, `src/games/RpgDuelPage.jsx`)
> présente chaque deck comme un boîtier rigide posé sur une étagère. Un clic
> ouvre le deck : **la liste de ses cartes n'existe qu'à ce moment-là.** Un
> bouton **« Sélectionner »** sous chaque boîtier choisit le deck de jeu, et ce
> choix est **mémorisé sur l'appareil** ; une rangée de puces **filtre l'étagère
> par couleur**.

## Le parcours

1. **Étagère fermée** (`.rpg-deck-catalog--closed`) — à l'entrée dans l'onglet,
   aucun deck n'est ouvert : on ne voit que le filtre de couleur et les boîtiers
   (illustration, nom, couleur, nombre de cartes) avec leur bouton
   **« Sélectionner »**. Ni fiche, ni liste de cartes, ni bouton « Jouer avec ce
   deck ».
2. **Clic sur un boîtier** — il **ouvre** le deck, sans le sélectionner : les
   boîtiers se réduisent dans la colonne de gauche (`.rpg-deck-catalog--open`),
   la fiche apparaît à droite (description, répartition, **liste des cartes**,
   bouton de jeu). Changer de boîtier change de fiche.
3. **« ✕ Fermer le deck »** referme la fiche : l'étagère reprend tout l'écran.
   Quitter l'onglet puis y revenir referme aussi (`openDeckId` repart de `null`).

Sur écran étroit (≤ 820 px) la fiche passe sous les boîtiers, qui forment une
rangée de trois ; elle est amenée à l'écran à l'ouverture.

## Sélectionner un deck, et s'en souvenir

Ouvrir un boîtier et le choisir sont deux gestes distincts :

| Geste | Effet |
|---|---|
| Clic sur le boîtier | montre la fiche et la liste ; **ne change pas** le deck de jeu |
| **« Sélectionner »** (sous le boîtier) | le deck devient le deck de jeu et est **mémorisé** |
| « Jouer avec ce deck » (dans la fiche) | sélectionne, mémorise **et** lance un duel avec ce deck |
| « Lancer le duel » (écran Jouer) | joue avec le deck de jeu courant |

- **Qui est sélectionnable** : **tous les decks complets** — Veilleurs du Désert,
  Sentiers de cendre, la Cour des Djinns, **la Marée des abysses** (le deck
  Eau, contres et bêtes marines) **et le Serment des Neuf Hivers** (le deck
  Neige) (`deckEstSelectionnable` : 40 cartes qui tiennent les quotas de
  `rpgValiderDeck`). Le champ `role` de
  `RPG_DECKS` ne limite rien : il dit seulement quel camp tient le deck *par
  défaut* (`joueur` : decks de départ ; `adversaire` : le deck du sorcier). Un
  deck qui ne passerait pas la validation aurait un bouton désactivé
  « Indisponible » et sa fiche l'expliquerait.
- **L'adversaire s'adapte** (`deckAdversePour`) : en duel libre, le sorcier joue la
  **Cour des Djinns** ; si c'est justement **vous** qui la jouez, il prend les
  **Veilleurs du Désert** (le deck de départ du joueur) — jamais le même paquet
  que vous. La carte « ADVERSAIRE » de l'écran Jouer (nom, couleur, phrase
  `affrontement`, illustration) et la plaque « LE SORCIER » du duel (nom du deck,
  avatar) annoncent le deck réellement joué. Le mode Histoire garde le deck de
  chaque étage.
- **Retour visuel** : le bouton du deck de jeu passe à « ✓ Sélectionné » (vert,
  `aria-disabled` : il reste focalisable mais sans effet), la carte reçoit un
  liseré vert (`.is-active`), et une ligne d'état (`role="status"`) nomme le
  deck de jeu. Juste après un clic, elle confirme « Mémorisé sur cet appareil… »
  — ou prévient « Non mémorisé » si le navigateur refuse l'écriture. L'écran
  **Jouer** annonce le même deck (nom, couleurs, illustration du boîtier).
- **Mémorisation** (`src/games/rpgDeckChoice.js`) : `localStorage`, clé
  `letsplay_sablier_deck_v1`, valeur `{"deckId":"sentiers-de-cendre"}` — même
  convention que `rpgStory.js` (accès tolérant, lecture normalisée, écriture
  silencieuse). Au lancement, `RpgDuelPage` repart de ce deck.
- **Valeur illisible** : JSON corrompu, deck inconnu ou retiré du catalogue (ou
  devenu invalide), mauvais type → on retombe sur le deck par défaut (le premier
  deck de départ du joueur), sans erreur. **Stockage indisponible** (mode privé, quota) : le choix
  vaut pour la session mais ne survit pas au rechargement.
- **Duel en cours** : la plaque « VOUS » garde le deck avec lequel le duel a
  démarré (`deckDuelId`) ; un nouveau choix vaut pour le **prochain** duel (la
  ligne d'état le rappelle quand un duel est en cours).

## Filtre par couleur

Une rangée de puces au-dessus de l'étagère (`.rpg-deck-filter`, groupe nommé,
`aria-pressed`) : **Toutes**, puis une puce par couleur réellement employée par
un deck — aujourd'hui Sable, Braise, Eau, Neige et Hybride (aucune puce ne mène
à une étagère vide : une couleur n'apparaît qu'avec son premier deck). Une
couleur retient les decks qui l'emploient (le deck hybride Sable + Braise compte
pour le Sable **et** pour la Braise) ; **Hybride** retient les decks de plusieurs
couleurs. Un compteur annonce « 5 / 5 decks » (`aria-live`).

- Le filtre porte sur **l'étagère** (quels boîtiers sont affichés), pas sur les
  cartes d'un deck ouvert. Un deck ouvert que le filtre écarte se referme ; revenir
  à « Toutes » ne le rouvre pas. Le deck de jeu reste le deck de jeu même masqué.
- Le filtre n'est pas mémorisé (il repart sur « Toutes » à chaque lancement) ;
  il reste choisi quand on change d'onglet, comme celui du Catalogue.
- La logique est pure et testée : `src/games/rpgDeckFilter.js`
  (`tests/rpg-deck-choice.test.js`).

Hauteur : sur un écran peu haut, les boîtiers de l'étagère se réduisent
(`--bw` borné par `21vh`) pour que le bouton « Sélectionner » reste visible sans
défiler (1280 × 720 : oui ; 1366 × 650 : oui).

## Anatomie d'un boîtier

`DeckBox` (même fichier) et `src/games/rpg-deckbox.css` : de la **3D CSS pure**,
sans image de boîtier ni bibliothèque. Six faces (`front`, `back`, `left`,
`right`, `top`, `bottom`) sont posées autour du centre d'un volume
`--bw × --bh × --bd`, sous une `perspective`.

- **Face avant** : l'illustration plein art (`boxArt`), cadre de laiton, couvercle
  séparé par un joint, médaillon(s) d'élément (SVG), fermoir, plaque au nom du
  deck, reflet.
- **Dos gauche** : nom du deck à la verticale, médaillons, nombre de cartes.
- **Dessus** : creux pour le pouce ; **dos** : blason de l'élément.
- **Teintes** par élément (`--sable` laiton, `--braise` braise, `--hybride`
  mélangée, `--eau`) via les variables `--accent`, `--hide`, `--glow`.
- **Tailles** : `--shelf` (étagère), `--mini` (colonne de gauche, sans texte),
  `--showcase` (en-tête de la fiche).
- **Mouvement** : léger balancement continu (décalé d'un boîtier à l'autre) ; la
  souris tourne le boîtier vers le curseur (`inclinerBoitier`), qui se redresse
  au survol / au focus. Au toucher, pas d'inclinaison : la page défile.
  `prefers-reduced-motion` coupe le balancement et les transitions.
- **Accessibilité** : le décor est `aria-hidden` ; le clic est porté par un
  `<button>` **voisin** du boîtier (nom, rôle, couleur et nombre de cartes en
  texte, `aria-pressed` = deck ouvert), dont la zone cliquable couvre le tout.
  Le bouton n'est volontairement pas le parent de la 3D : certains navigateurs
  aplatissent les enfants d'un `<button>`. Le bouton « Sélectionner » est un
  second frère, posé **au-dessus** de la zone cliquable étirée (`position` +
  `z-index`) : sans cela, un clic dessus ouvrirait le deck.

## Ajouter un deck ou changer une illustration

Dans `RPG_DECKS` (`src/games/rpgCards.js`), renseigner `boxArt` : l'identifiant
d'une illustration de `public/cards/` — de préférence celle d'une carte
emblématique **du deck** (c'est ce que vérifie `npm run check:rpg`, avec
l'unicité). Sans `boxArt`, le boîtier retombe sur la première carte non-terrain.

| Deck | Illustration du boîtier |
|---|---|
| Veilleurs du Désert | `cavalier-amazigh-du-desert` |
| Cour des Djinns | `ifrit-al-ahmar` |
| Sentiers de cendre | `feriel` (cheval de feu dans les dunes : Sable + Braise) |
| Marée des abysses | `leviathan` |
| Serment des Neuf Hivers | `valkyrie-des-glaces` (Valkyrie et monture pâle dans la tempête) |

Les raretés sont **celles de Magic** — commune, inhabituelle, rare, mythique
(`CARD_RARITIES`) ; il n'existe pas d'« épique ». Seule la **mythique**
(`CARD_UNIQUE_RARITIES`) ne se joue qu'en **un exemplaire** ; les autres cartes
non-terrain restent limitées à trois, les terrains illimités (`cardCopyLimit`).
Dans le set Neige, les quatre figures du Nord sont mythiques — comme tous les
héros du jeu — et portent un cadre **bleu glacé brillant**, orné de zelliges.
Chaque mythique conserve la couleur de sa carte (`CARD_FRAME_COLORS` : rouge
Braise, bleu Eau, beige de dune pour le Sable, bleu clair Neige). Tous les cadres
sont des **anneaux ornés** (`rpg-battle.css`, « Cadres ornés ») : la couleur y est
peinte sous une résille de losanges gravée. Les **hybrides** ont deux moitiés
d'aplats élémentaires séparées en diagonale (Braise rouge et Sable beige, par
exemple), **sans fond brillant ni balayage animé**, sur la table, en main, dans
le mulligan, le catalogue, le guide et l'atelier. Les combinaisons futures à
trois ou quatre couleurs auront autant de bandes diagonales. Seules les
**mythiques mono-élément** ajoutent au cadre leur zellige et un reflet animé ;
une mythique hybride garde le zellige mais pas le balayage du cadre. Leur
épaisseur suit la largeur de la carte, dans l'esprit d'une carte Magic (≈ 3,5 %,
trois gabarits `--rpg-card-border*`). Les **illustrations mythiques** portent
aussi un vernis léger : une lumière douce et un reflet mobile sur la peinture,
sous les repères de jeu. Il reste fixe si le mouvement est réduit et s'atténue
sur une créature fatiguée ; une carte verrouillée dans l'atelier reste grisée.
Ce cadre ne déborde jamais sur l'aperçu rapide : au survol comme à l'appui long,
l'encadré reste sans fond, l'illustration flotte sur la table (voir
`mobile-layout.md`). **Exception des armes** : les quatre cartes Arme
partagent une même matière — un **acier métallique** à motif de
**guilloché de Damas** (fines ondes gravées tous les 18 × 12 px) — mais
chaque élément teint son acier : rouge (Braise), bleu (Eau), doré (Sable)
ou glacé (Neige). Clé `arme` de `cardFrameInfo`, règle commune
`.rpg-card--frame-arme` et variantes `.rpg-card--frame-arme-<élément>`.
L'Armure de cendres, mythique,
perd le zellige de sa rareté mais garde le **reflet animé** sur l'acier
(`rpg-card--frame-brillant`). Le cadre des armes est en outre **renforcé** :
son anneau vaut **×1,6 le gabarit** de chaque face (sur PC comme au doigt),
sans changer la taille extérieure de la carte — l'illustration cède un peu
de sa marge, et le guilloché y gagne en lisibilité.

## Vérifications

- `npm run check:rpg-deck-ui` — rend la vraie page dans jsdom : étagère sans liste,
  boîtiers à six faces illustrés et distincts, ouverture / changement /
  fermeture, retour sur l'onglet ; **sélection** (un clic de boîtier ne
  sélectionne pas, « Sélectionner » mémorise, la Cour des Djinns se sélectionne
  comme les autres), **relance** (le choix est restauré), sauvegarde corrompue /
  périmée, stockage indisponible, **adversaire** (Cour contre Veilleurs, plaques,
  avatar, deck envoyé au moteur), **filtre** (puces, compteur, fiche refermée si le deck est
  écarté), « Jouer avec ce deck » et « Lancer le duel » avec les vrais decks, reprise
  d'un duel en cours ; plus des garde-fous sur la 3D (perspective, `preserve-3d`,
  faces cachées, animations réduites) et sur le bouton (au-dessus de la zone
  cliquable, pleine largeur en disposition ouverte, 44 px au doigt).
- `npm run check:rpg-decks` — **les dix paquets valent la composition de leur
  recette** : chaque deck est recalculé par `composerDeck`, aucune carte laissée
  de côté n'est mieux classée qu'une carte retenue de sa famille, les mythiques
  de l'identité sont toutes présentes et les plafonds de la campagne tiennent
  (voir la section « Le deck composé » plus bas) ;
- `npm run check:rpg` — `boxArt` existe, est unique et vient d'une carte du deck ;
  les cartes Neige sont mono-Neige, les mythiques en un exemplaire, les textes du
  Nord ne nomment jamais de divinité, et **les vingt cartes du set Neige du
  catalogue ont leur peinture plein art dédiée** (la liste `RPG_ART_PROVISOIRE`
  est vide et le test l'exige : le jour où une carte y entre, elle doit en sortir
  dès que sa peinture est livrée) ;
  `tests/rpg-deck-choice.test.js` couvre la règle de sélection, le choix de
  l'adversaire (jamais le même deck), la mémorisation (aller-retour, valeurs
  invalides, stockage absent ou en panne) et le filtre de couleur.
- Lisibilité (contraste ≥ 4,5:1) mesurée au navigateur dans les deux thèmes : la
  scène du menu reste sombre en thème clair (voir `06-mode-histoire.md`). Les
  couleurs du bouton, des puces et de la ligne d'état sont littérales (aucun jeton
  de thème) ; le garde-fou `check:rpg-story-ui` couvre ce fichier CSS.

## Le deck composé — les meilleures cartes d'abord

Les boîtiers de l'étagère ne sont plus écrits carte par carte : ils sont
**composés** à partir d'une **recette**. Une recette dit ce qui ne se négocie
pas — l'identité chromatique, le nombre de terrains, de créatures et de sorts,
la **signature** du deck — et le composeur y met les **meilleures cartes de
cette identité** : palier de rareté d'abord (mythique > rare > inhabituelle >
commune), puis la carte qui rend le plus pour son mana, chacune prise à son
maximum légal (un exemplaire pour une mythique, trois pour le reste).

Concrètement, pour le joueur :

- **la couleur du boîtier ne bouge pas** : un deck mono-Sable reste cent pour
  cent sable, l'hybride reste Sable + Braise. Seule la qualité des cartes
  change ;
- **les mythiques montent toutes** : les Veilleurs du Désert alignent leurs
  trois figures Sable, la Cour ses six de Braise, l'Hybride les neuf de ses deux
  couleurs, la Marée ses six, le Serment ses quatre — chaque boîtier part avec
  ses meilleures cartes sur la table au lieu de les réserver au hasard de la
  pioche ;
- **les héros entrent dans les paquets de départ** — Salem et Tarek chez les
  Veilleurs, Yamina et Boualem dans la Marée. Le dossier de conception les
  réservait à l'exploration ; la règle « les meilleures cartes d'abord » les
  fait entrer, à un exemplaire, et ils continuent de se gagner aux étages pour
  l'atelier ;
- **les cartes écartées restent jouables** : Chien du guet, Porteuse de
  cruches, Veilleuse des citernes, Sonneur fêlé, Géant des banquises et leurs
  semblables ne sont dans aucun boîtier parce qu'elles sont les moins bien
  classées de leur couleur, mais la collection et l'atelier de decks les
  proposent toujours ;
- **la fiche suit** : le compteur « × N » d'une ligne de la fiche de boîtier est
  calculé sur le deck réel, jamais écrit en dur ; un deck qui change de
  composition change sa fiche.

Les **cinq paquets de la campagne** suivent la même règle, avec deux garde-fous
qui préservent la montée des Tours : `mythiquesMax` et `raresMax`, comptés **par
famille** — un sorcier ne renonce pas à ses sorts rares parce qu'il a déjà
quatre créatures rares. La Tour du Fjord garde ainsi sa rampe : la Garde aligne
une seule figure mythique, la Meute aucune, le Maître deux, et le Grand Horloger
trois. Voir [`09-atelier-de-decks.md`](09-atelier-de-decks.md) pour les recettes
complètes.
