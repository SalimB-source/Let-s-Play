# 09 — L'atelier de decks : construire ses propres boîtiers

> L'atelier (`RpgDeckAtelier`, `src/games/RpgDeckAtelier.jsx`) vit **dans
> l'onglet Deck** du menu — aucun nouvel onglet. Tant qu'il est ouvert, il
> remplace l'étagère ; à l'enregistrement, le deck rejoint l'étagère comme un
> boîtier de plus, étiqueté **DECK MAISON**. Ce que l'on peut y mettre est
> borné par une **collection à débloquer en jouant l'Histoire**, et les decks
> maison se gardent **sur l'appareil**, puis se synchronisent **par compte**
> (Supabase).

## Le parcours

1. **La crate « Nouveau deck »** — un boîtier entrouvert (`.rpg-deck-choice--neuf`)
   termine l'étagère, après les decks du catalogue et les decks maison. Un clic
   ouvre l'atelier en création : nom proposé par défaut (il n'existe pas encore
   sur l'étagère), cartes vides.
2. **L'atelier** — pleine largeur, disposé **comme le constructeur de Magic
   Arena** (voir « La disposition » plus bas) : à gauche **la collection en
   grille** de cartes illustrées, surmontée d'une barre de filtres à
   bascules ; à droite **le panneau du deck** — le **nom** (60 caractères),
   le compteur `N / 40 cartes` et sa jauge, `N terrains · P %`, la **courbe de
   mana**, la répartition des couleurs, la liste par type, la **carte
   emblématique** du boîtier. La validation (`rpgValiderDeckMaison`) court
   **en direct** : elle dit à chaque instant si le deck tiendrait les quotas,
   et **vérifie la collection** — une carte verrouillée refuse de rejoindre le
   deck et annonce où se débloquer (« Vainquez « Le Pêcheur de perles » — La
   Tour des Abysses »).
3. **Enregistrer** — un deck peut être enregistré **en brouillon** (moins de
   40 cartes) : il rejoint l'étagère, mais son bouton reste « Indisponible »
   tant que les quotas ne sont pas tenus, et sa fiche l'explique. Un deck
   complet est **jouable aussitôt**. L'enregistrement referme l'atelier,
   ouvre la fiche du deck et confirme sur la ligne d'état.
4. **La fiche maison** — comme celle du catalogue : répartition, liste,
   bouton de jeu — plus trois gestes propres (**Modifier**, **Supprimer**,
   **Copier** dans `.rpg-deck-detail__actions`) :
   - **Modifier** rouvre l'atelier avec les cartes du deck chargées ;
     renommer **remplace** le deck, sans en dupliquer un second ;
   - **Supprimer** demande une **confirmation en deux temps** sur la fiche
     elle-même (`window.confirm` est proscrit dans la maison), puis retire le
     boîtier de l'étagère — l'identifiant part dans une liste de pierres
     tombales, pour qu'une synchronisation ne le fasse pas revenir ;
   - **Copier** ouvre l'atelier en création avec les cartes du deck (copie
     **filtrée par la collection** : on n'hérite que de ce que l'on possède),
     nommé `… (copie)`.
5. **Jouer** — un deck maison **complet** se sélectionne comme n'importe quel
   deck du catalogue : « Sélectionner », « Jouer avec ce deck », ligne d'état,
   plaque du duel — tout suit. **Le duel libre seulement** : le mode Histoire
   garde les decks écrits pour chaque étage (`deckSeJoue` refuse un deck
   maison en Histoire).

## La disposition : ce que l'on emprunte à Magic Arena

Le constructeur de decks d'Arena est la référence des joueurs de cartes sur
PC ; l'atelier en reprend les gestes, dans la matière du Sablier (nuit,
laiton, encres claires — `src/games/rpg-deck-atelier.css`).

| Arena | L'atelier |
|---|---|
| La collection est une **grille de cartes**, pas une liste | `.rpg-atelier__cartes` : vignettes plein art au cadre de la couleur de la carte (`cardFrameColor`), médaillon de coût avec pips, attaque / défense des créatures, losange de rareté |
| **Clic gauche +1, clic droit −1** | le bouton `.rpg-atelier__carte-ajout` couvre la vignette ; `contextmenu` sur la vignette ou sur une rangée du deck retire un exemplaire (et ne montre pas le menu du navigateur) ; un petit « − » (`.rpg-atelier__carte-retrait`) apparaît au survol, toujours visible au doigt |
| Compteur « 2/4 » posé sur la carte | `.rpg-atelier__carte-count` : `×N/limite` (`×N` pour un terrain, illimité) ; une carte au quota s'éteint (`.is-full`), une carte verrouillée porte un cadenas et dit où se gagner (`.is-locked`) |
| **Aperçu grand format au survol** | le même `HoverCardPreview` que le duel et le catalogue : la page passe `onHoverCard` / `onLeaveHoverCard`, l'atelier les pose sur les vignettes (souris **et** focus clavier) et les rangées du deck |
| Barre de filtres à **bascules** (symboles de mana, coût, type, rareté, « possédées ») | `.rpg-atelier__toolbar` : quatre **pips de couleur** (`aria-pressed`, cumulables en OU) + « Hybrides » ; coûts **1 à 6 et 7+** (un filtre de coût écarte les terrains) ; types ; raretés — **commune, inhabituelle, rare, mythique**, comme Magic (losange coloré) ; « Possédées » ; recherche sur nom, ligne de type **et texte** ; tri (coût — terrains en fin —, nom, couleur, rareté) ; « ↺ Réinitialiser » n'apparaît que si un filtre est actif |
| Panneau du deck à droite : nom en titre, compteur, **courbe de mana**, couleurs, liste par type | `.rpg-atelier__deck` (collant à l'écran sur PC) : nom en champ-titre, `N / 40` et jauge (verte à 40, rouge au-delà), terrains / créatures / magies / **coût moyen**, verdict de validation ; `courbeDeMana` dessine sept barres (1…6, 7+) ; `repartitionCouleurs` liste par couleur cartes, pips exigés et terrains producteurs ; la liste va **Créatures → Magies → Terrains**, rangées « vignette · médaillon de coût · nom · − × N + » triées par coût |
| **« Ajouter des terrains »** | **« ⛰ Compléter en terrains »** (`completerEnTerrains`) : remplit les places libres jusqu'à 40 avec des terrains **possédés**, au prorata des **pips** exigés par les sorts (à défaut des couleurs des cartes, à défaut du Sable), parts entières aux plus forts restes ; ne retire jamais rien |
| Vider le deck | « ⌫ Vider le deck », confirmation en deux temps sur le bouton lui-même |

Les règles pures du panneau (`courbeDeMana`, `repartitionCouleurs`,
`completerEnTerrains`, `RPG_DECK_TAILLE`) vivent dans
`src/games/rpgDeckBuilder.js` et sont testées par
`tests/rpg-deck-builder.test.js` ; les gestes (bascules, clic droit, courbe,
complétion, vidage, aperçu au survol) sont joués dans jsdom par
`scripts/rpg-deck-smoke.jsx` (`npm run check:rpg-deck-ui`).

Sous 1100 px la courbe et les couleurs s'empilent ; sous 820 px le panneau du
deck passe sous la grille, et le « − » des vignettes reste visible (pas de
survol au doigt). `prefers-reduced-motion` coupe les transitions des
vignettes, de la jauge et des barres.

## La collection : ce que l'on possède

`src/games/rpgCollection.js` — module pur, testé par
`tests/rpg-collection.test.js`. Depuis l'ouverture du Souk (dossier 13), **les
étages ne donnent plus de cartes : ils les révèlent**, et le Souk les vend.

- **La dotation de départ** est une règle, pas une liste figée : toutes les
  cartes **communes et inhabituelles** du set (38 cartes ; la pétra, matière
  à scénario, en est exclue).
- **Les acquis figés** (`figerAcquisitions`) — le gel de migration. Au premier
  lancement de la version du Souk, les cartes que l'ancienne règle avait
  données pour les étages déjà vaincus sont reprises **une fois**, rangées dans
  `letsplay_sablier_acquis_v1`, et le gel est posé (`gel: true`). Il est
  définitif : plus rien n'y entre ensuite. Sans lui, retirer les récompenses
  aurait effacé les collections existantes et rendu injouables les decks
  maison qui les utilisent.
- **Les cartes du Souk** — achetées dans un booster, rangées dans le
  portefeuille (`rpgCredits.js`), elles rejoignent la collection par la même
  porte (`collectionJoueur({ souk })`, lot 4).
- **Les apports du compte** — cache local `letsplay_sablier_collection_v1`,
  fusionnés en union, jamais retirés.
- **Le suivi** : `carteReveleePar(id)` dit quel étage révèle une carte (l'atelier
  s'en sert pour ses messages : « Le Souk la vendra après « tel étage » »),
  `cartesReveleesParEtage(etageId)` rend la liste d'un palier, et
  `revelationsDepuisEtages` celle d'une progression. La collection voyagée dans
  un état synchronisé est normalisée avant comparaison (`normaliserCollection`).

Le rythme de débloquage suit celui du mode Histoire, et **il passe désormais par
le vivier du Souk** (`rpgBoosters.js`) : le Sable est là dès `listes-1`, l'Eau
arrive avec les citernes du Souk, la Braise se mérite aux Listes, la Neige
n'existe qu'au fond des Abysses — un deck maison d'une couleur donnée suppose
donc d'être allé chercher cette couleur dans la ville, **et de l'avoir
achetée**.

## Les règles de construction

Les mêmes quotas que les decks du catalogue (`rpgValiderDeck`, étendus aux
decks maison par `rpgValiderDeckMaison` dans `src/games/rpgDeckBuilder.js`) :

| Règle | Valeur |
|---|---|
| Taille | exactement **40 cartes** (un brouillon peut être enregistré en dessous, il n'est pas jouable) |
| Terrains | au moins **40 %** du deck, en quantité libre |
| Mythique | **× 1** |
| Autres non-terrains | **× 3** |

Un deck maison porte un nom (60 caractères au plus, tronqué sans casser), un
identifiant `maison-*` généré (jamais codé en dur dans les tests : les
vérifications cherchent par nom), et une carte emblème optionnelle qui
habille son boîtier. Le normalisateur (`normaliserDeckMaison`) expose le nom
sous `nom` **et** `name`, pour que l'étagère, la fiche et la plaque du duel
lisent tous la même chose.

## Les recettes : d'où viennent les decks du catalogue

Le joueur qui ouvre l'atelier veut comprendre ce que l'étagère lui propose. Les
dix boîtiers du jeu — les cinq du catalogue et les cinq variantes de la
campagne — ne sont plus écrits à la main : ils sont **composés** par la règle
« **les meilleures cartes d'abord** ».

Trois fichiers la portent, sans dépendance circulaire :

| Fichier | Ce qu'il contient |
|---|---|
| `src/games/rpgCardPower.js` | l'échelle de puissance d'une carte |
| `src/games/rpgDeckRecipes.js` | les dix recettes (données pures) |
| `src/games/rpgDeckComposer.js` | `composerDeck(recette, catalogue)` |

### La puissance d'une carte

`puissanceCarte(carte)` classe d'abord par **palier de rareté** — commune 1,
inhabituelle 2, rare 3, mythique 4, multiplié par dix — puis par la **valeur de
la carte rapportée à son mana** (`valeurCarte` : ⚔ 1,3 le point, 🛡 1, la
vol 2,5, un contresort 3,5 sur une carte, un sort de dégâts 1,25 le point sur
une cible, le soin 0,5, la pioche 1,5…). Aucune commune ne peut donc dépasser
une rare, quel que soit son texte ; à palier égal, la carte la plus rentable
passe devant. Le classement ne lit jamais le catalogue : il ne lit que la fiche
de la carte, ce qui permet de le rejouer sur une carte toute neuve.

### Une recette, cinq lignes

Une recette dit ce qui ne se négocie pas, et rien d'autre :

- `identite` — la ou les couleurs du deck. **La composition ne peut jamais
  sortir de l'identité** : un deck mono-Sable reste cent pour cent sable ;
- `terrains` — le nombre de terrains, jusqu'à la peinture de chaque variante ;
- `creatures` et `magies` — les places de chaque famille ;
- `signature` — les cartes d'archétype, posées **avant** tout le reste et
  conservées même si une carte mieux classée frappe à la porte : c'est l'âme
  du deck (le Djinn de foudre et le Vent rouge dans l'Hybride, les valkyries
  dans le Serment, le Fennec chez les Veilleurs) ;
- `mythiquesMax` et `raresMax` — les **plafonds de la campagne** seulement,
  comptés **par famille** : les cinq boîtiers du catalogue n'en ont pas, les
  cinq paquets de l'Histoire si.

### Comment le composeur remplit

1. il pose la **signature** ;
2. il remplit au fil du classement, plafonds d'abord ;
3. puis les rares sans plafond, puis tout le reste — de sorte qu'une place ne
   reste jamais vide ;
4. si une carte de la recette n'existe pas (ou plus) au catalogue, sa place
   revient à la meilleure carte restante de la même famille.

Chaque carte est prise à son **maximum légal** : une mythique à un exemplaire,
les autres à trois, les terrains en quantité libre. Les plafonds ne se
contournent jamais : quand le plafond tombe, la famille passe à la carte
suivante du classement, même moins puissante.

### Les dix recettes

| Deck | Identité | Terrains / Créatures / Sorts | Plafonds | Signature |
|---|---|---|---|---|
| Veilleurs du Désert | Sable | 17 / 18 / 5 | — | Amani ×3 · Cavalier · Tiziri · Amayas · Tislit · Tempête de sable |
| Cour des Djinns | Braise | 22 / 12 / 6 | — | Braisier ×3 · Trait de braise ×3 · Nuage de cendres ×3 |
| Sentiers de cendre | Sable + Braise | 17 / 18 / 5 | — | Djinn de foudre ×3 · Vent rouge ×2 · Rempart de dunes |
| Marée des abysses | Eau | 16 / 10 / 14 | — | Contresort ×3 · Silence d'écume ×3 · Ressac ×2 · Courant de retour |
| Serment des Neuf Hivers | Neige | 17 / 16 / 7 | — | Jarl · Loup · Guerrier · Mur ×2 · Hurlement · Brume |
| `souffleuse-de-verre` | Braise + Sable | 17 / 17 / 6 | 4 mythiques · 3 rares | Fériel · Trait de braise ×3 · Fennec ×3 · Vent rouge ×2 · Djinn de foudre |
| `gardes-du-fjord` | Neige | 21 / 12 / 7 | 1 mythique · 2 rares | Dame des neuf mondes · Mur ×3 · Brume ×2 · Festin ×2 · Scalde · Guerrier |
| `meute-des-neiges` | Neige | 21 / 13 / 6 | 0 mythique · 3 rares | Loup ×3 · Berserk ×2 · Guerrier · Hurlement |
| `maitre-des-neuf-hivers` | Neige | 18 / 15 / 7 | 2 mythiques · 4 rares | Père des corbeaux · Maître du marteau |
| `grand-horloger` | Braise + Sable | 17 / 17 / 6 | 3 mythiques · 4 rares | Tin Hinan · Sahir · Anqa |

Les paliers de la Tour du Fjord sont lisibles d'un coup d'œil : **une** figure
mythique pour la Garde, **aucune** pour la Meute, **deux** pour le Maître,
**trois** pour le Grand Horloger. La montée des Tours est préservée par la
recette, pas par un cas particulier dans le code.

### Ce que la composition a changé

- **Les mythiques montent toutes** dans les boîtiers : les trois figures Sable
  chez les Veilleurs, les six de la Cour (Braise), les neuf de l'Hybride, les six
  de la Marée, les quatre du Nord — et les héros (Salem, Tarek, Yamina, Boualem)
  entrent dans les paquets de départ, à un exemplaire ;
- **les listes resserrent leurs cartes distinctes** autour des meilleures :
  les Veilleurs passent de treize à douze, la Cour de douze à dix, l'Hybride de
  vingt à quinze, la Marée de dix-sept à treize, le Serment de vingt à quinze.
  Les cartes écartées (Scalde des runes, Géant des banquises, Drakkar de
  l'ancien Serment, Éclairs du marteau, Festin des vaillants…) restent au
  catalogue et dans la collection ;
- **La Cour des Djinns ne bouge pas** : son vivier Braise était déjà aligné au
  complet — un boîtier que la règle confirme au lieu de le réécrire ;
- **Le Grand Horloger gagne une réparation** : ses deux mythiques de Braise
  étaient injouables, le paquet n'avait aucune source de Braise. Sa recette lui
  donne Pétra ×2, trois Montagnes et deux Crêtes de cendre, à côté des dix
  terrains de son identité sable.

### Les cartes hors deck

Douze cartes du catalogue ne figurent dans aucun boîtier, parce qu'elles sont
les moins bien classées de leur couleur : quatre **Sable** (Chien du guet,
Guetteur du beffroi, Dune marchante, Faiseur de passage), sept **Eau** (Porteuse
de cruches, Veilleuse des citernes, Sonneur fêlé, Eau de la source, Lame de mer,
Parade de verre, Brisure de verre) et le **Géant des banquises**, seul Neige
laissé de côté. Elles restent dans la collection et l'atelier : le joueur peut
les mettre dans un deck maison, aucun boîtier ne les aligne d'office.

### Le contrôle

`npm run check:rpg-decks` (`tests/rpg-decks-puissance.test.js`) recalcule chaque
liste à partir de sa recette et exige que :

- chaque deck soit **exactement** `composerDeck(recette)` ;
- **aucune carte laissée de côté ne soit mieux classée qu'une carte retenue de
  sa famille** (la signature, les terrains et les plafonds expliquent les seules
  exceptions admises, et seule la dernière carte d'une famille peut être
  partielle quand le quota est coupé) ;
- les mythiques de l'identité soient toutes là, à un exemplaire ;
- les plafonds de la campagne tiennent, boîtier et étage compris ;
- l'identité chromatique soit stricte, et le boîtier (`boxArt`) tiré d'une carte
  du deck.

## L'étagère maison

- **Le plafond** : six decks maison (`RPG_DECKS_MAISON_LIMITE`). La crate
  reste visible mais l'atelier refuse d'ouvrir un septième et le dit.
- **L'étiquette** : chaque boîtier maison porte la mention DECK MAISON, la
  même carcasse 3D que le catalogue, son compteur de cartes — et un badge
  « brouillon » quand il n'est pas complet.
- **Le tri** : les decks maison passent **après** le catalogue, du plus récent
  au plus ancien (`decksTous = [...RPG_DECKS, ...decksMaison]`, la liste
  filtrée par couleur passe par `decksVisibles`).

## L'aperçu d'une carte au doigt

L'atelier vit dans l'écran de menu, qui arme déjà le geste de la maison
(`rpgLongPress.js`, une seconde de contact) pour **toute** carte portant un
`data-card-id`. Les vignettes de la grille et les rangées du deck le portent,
si bien qu'au doigt :

- tenir une carte une seconde ouvre son aperçu (`HoverCardPreview`, variante
  `appui-long`) sans rien ajouter ni retirer ; le clic synthétique qui suit est
  avalé, donc une vignette ou un « + » / « − » tenu une seconde **ne modifie
  pas** le deck — c'est le clic simple qui agit ;
- l'illustration d'une carte ne part jamais en drag natif
  (`.rpg-battle [data-card-id] img { -webkit-user-drag: none }`) : le doigt
  consulte au lieu d'attraper l'image ;
- l'atelier **annonce** le geste dans son en-tête (`.rpg-atelier__astuce`),
  montrée au seul pointeur grossier — au pointeur fin, l'aide « clic / clic
  droit / survol » prend sa place.

## Les comptes : garder ses decks et sa collection

`src/games/useDecksSablier.js` — le hook rendu par `RpgDuelPage` et passé au
menu (`decksMaison`, `collection`, `statutSync`, `onEnregistrerDeckMaison`,
`onSupprimerDeckMaison`). Il lit le contexte d'authentification
**défensivement** : hors fournisseur ou en démo, tout reste local et rien ne
casse.

- **Sans compte**, l'étagère l'annonce sobrement : « Decks gardés sur cet
  appareil ». Le casier vit dans `localStorage`
  (`letsplay_sablier_decks_maison_v1`, valeur `{decks: […], supprimes: […]}`),
  accès tolérant comme toujours — stockage refusé → les decks valent pour la
  session, la ligne d'état prévient « Non mémorisé ».
- **Avec un compte**, l'état du compte porte tout : table
  `rpg_sablier_progress` (`supabase/schema.sql`), une ligne par utilisateur,
  **RLS fermée** (`for select to authenticated using (auth.uid() = user_id)`,
  idem en écriture). Le transport (`src/games/rpgSablierRemote.js`) lit avec
  `maybeSingle` — un compte neuf n'a pas de ligne, ce n'est pas une erreur.
- **La fusion** (`fusionnerEtatsSablier({local, distant})`) arbitre entre
  l'appareil et le compte : **l'horodatage le plus récent gagne**, à égalité
  le local ; les decks maison sont réunis par identifiant, les suppressions
  marquées dans `supprimes` ne reviennent pas, la collection est celle de
  l'état retenu et les pierres périmées (`supprimes` refermées) sont élaguées.
  Le résultat alimente le casier local **et** le cache de collection, puis
  repart vers la table. La ligne de l'étagère suit : « Synchronisé ✓ »,
  « Synchronisation… », « Hors ligne — gardé sur cet appareil ».
- **La connexion gagne tout** : créer un compte après avoir joué en local
  pousse le casier et la collection locaux ; se connecter sur un nouvel
  appareil ramène les decks et la collection du compte.

## Les fichiers

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgCollection.js` | dotation de départ, **révélations** d'étage, **gel des acquis**, `carteReveleePar`, `normaliserCollection` |
| `src/games/rpgDeckBuilder.js` | limites (nom, plafond, `RPG_DECK_TAILLE`), `rpgValiderDeckMaison`, `normaliserDeckMaison`, `fusionnerEtatsSablier`, et le panneau du deck : `courbeDeMana`, `repartitionCouleurs`, `completerEnTerrains` |
| `src/games/RpgDeckAtelier.jsx` + `rpg-deck-atelier.css` | l'éditeur façon Arena (grille, bascules, panneau du deck) : composant pur, tout état vient en props, la persistance et l'aperçu au survol restent au parent |
| `src/games/rpgLongPress.js`, `src/games/RpgDuelPage.jsx` | le geste d'aperçu au doigt, délégué au menu entier (l'atelier compris) par `onPointerDown` |
| `src/games/useDecksSablier.js` | casier local, collection, compte, `statutSync`, suppression à pierre tombale |
| `src/games/rpgSablierRemote.js` | transport Supabase (lecture `maybeSingle`, upsert tolérant) |
| `src/games/RpgDuelPage.jsx` | le câblage : crate, étagère maison, fiche, ligne d'état, `enregistrerAtelier` |
| `src/auth/AuthContext.jsx` | le contexte de compte, lu défensivement par le hook |
| `supabase/schema.sql` | la table `rpg_sablier_progress` et ses règles RLS |
| `tests/rpg-collection.test.js`, `tests/rpg-deck-builder.test.js` | les règles vérifiées (`npm run check:rpg`) |
| `scripts/rpg-deck-smoke.jsx` + `scripts/rpg-deck-ui-check.mjs` | la page montée dans jsdom : atelier complet, brouillon, duel maison, édition, copie, garde-fous de source (`npm run check:rpg-deck-ui`) |
| `scripts/rpg-preview-smoke.jsx` | le scénario d'appui long, créateur de deck compris (grille, « + », ligne du deck, « − ») : l'aperçu s'ouvre, le deck ne bouge pas (`npm run check:rpg-ui`) |

## Les décisions, et pourquoi

- **L'atelier dans l'onglet Deck**, pas un onglet de plus : la création est un
  geste du même lieu que la sélection ; l'étagère suffit à porter la crate.
- **Brouillons autorisés** : un deck à moitié pensé doit pouvoir être posé et
  repris ; ce qui n'est pas complet n'est simplement pas jouable — la fiche
  l'explique au lieu de refuser l'enregistrement.
- **Collection à débloquer**, pas catalogue complet d'entrée : construire un
  deck est la deuxième moitié du jeu ; la première est d'aller gagner les
  cartes dans la ville.
- **Duel libre seulement** : les étages de l'Histoire sont calibrés (leur
  deck adverse, leur difficulté) ; un deck maison y casserait la lecture. En
  duel libre, c'est le joueur qui choisit son défi.
- **Suppression en deux temps, pierres tombales** : une suppression est
  définitive à l'échelle de l'appareil ; la confirmation sur la fiche évite
  le `window.confirm` proscrit, la liste `supprimes` évite la résurrection
  lors d'une fusion avec un appareil qui ne sait pas encore.

Les vérifications : `npm run check:rpg` (les règles pures — moteur, collection,
deck builder), `npm run check:rpg-deck-ui` (la page rendue dans jsdom, plus les
garde-fous de source, l'atelier par la crate jusqu'à la copie) et
`npm run check:rpg-ui` (le geste d'aperçu au doigt, atelier compris) — ces
commandes doivent rester vertes, ainsi que `npx vite build`.
