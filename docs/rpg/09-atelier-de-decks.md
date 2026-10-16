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
  cartes **communes et inhabituelles** du catalogue (49 cartes après le reclassement
  du Sonneur fêlé ; Pétra, rare, en est exclue).
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

Les **onze paquets du jeu** — les six boîtiers de l'étagère et les cinq
variantes de la campagne — sont composés par recette, pas écrits carte par
carte. Les six starters privilégient les mécaniques déjà présentes au
catalogue, puis le composeur complète les places dans l'identité du deck.

Trois fichiers portent cette règle, sans dépendance circulaire :

| Fichier | Ce qu'il contient |
|---|---|
| `src/games/rpgCardPower.js` | l'échelle de puissance d'une carte |
| `src/games/rpgDeckRecipes.js` | les six recettes de starter et les cinq recettes d'Histoire |
| `src/games/rpgDeckComposer.js` | `composerDeck(recette, catalogue)` et l'application des plafonds |

### La puissance d'une carte

`puissanceCarte(carte)` classe d'abord par **palier de rareté** — commune 1,
inhabituelle 2, rare 3, mythique 4, multiplié par dix — puis par la **valeur de
la carte rapportée à son mana** (`valeurCarte` : ⚔ 1,3 le point, 🛡 1, la
vol 2,5, un contresort 3,5 sur une carte, un sort de dégâts 1,25 le point sur
une cible, le soin 0,5, la pioche 1,5…). Aucune commune ne peut donc dépasser
une rare, quel que soit son texte ; à palier égal, la carte la plus rentable
passe devant.

### Une recette, ses quotas et sa signature

Chaque recette fixe :

- `identite` — la ou les couleurs du deck. **Aucune carte ne sort de cette
  identité** ;
- `terrains`, `creatures`, `magies` et, pour les decks concernés, `armes` — les
  places de chaque famille, pour un total de quarante ;
- `signature` — les cartes d'archétype posées avant le remplissage, même si
  une carte mieux classée frappe à la porte ;
- pour les starters, `mythiquesTotalMax: 1` et `raresTotalMax` — des plafonds
  globaux comptant les cartes rares distinctes non-terrain (quatre pour cinq
  decks, six pour le Soleil rouge) ;
- pour les paquets d'Histoire, `mythiquesMax` et `raresMax` — des plafonds par
  famille, conservés pour régler la montée des Tours.

Le composeur pose la signature, remplit les familles par rareté puis puissance,
et poursuit jusqu'à ce qu'aucune place ne reste vide. Les plafonds globaux des
starters sont durs : ils s'appliquent aussi à la signature et à la passe finale.
Les plafonds d'Histoire restent par famille. Chaque carte ne dépasse jamais sa
limite légale (une copie d'une mythique, trois des autres cartes non-terrain) ;
les terrains sont sans plafond de copies.

### Les six starters

La répartition des raretés ci-dessous compte les **copies** ; les terrains sont
présentés à part. Chaque ligne totalise quarante cartes. Le plafond rare compte
les cartes rares distinctes, pas leurs copies.

| Deck | Terrains / Créatures / Magies / Armes | Commune | Inhabituelle | Rare | Mythique | Plafond rare distinct |
|---|---:|---:|---:|---:|---:|---:|
| Veilleurs du Désert | 17 / 15 / 4 / 4 | 5 | 7 | 10 | 1 | 4 |
| Cour des Djinns | 18 / 16 / 6 / 0 | 12 | 2 | 7 | 1 | 4 |
| Sentiers de cendre | 17 / 13 / 6 / 4 | 6 | 8 | 8 | 1 | 4 |
| Marée des abysses | 16 / 8 / 15 / 1 | 12 | 1 | 10 | 1 | 4 |
| Serment des Neuf Hivers | 17 / 13 / 9 / 1 | 9 | 3 | 10 | 1 | 4 |
| Serment du Soleil rouge | 16 / 17 / 7 / 0 | 9 | 3 | 11 | 1 | 6 |

| Starter | Mécaniques mises en avant | Unique mythique |
|---|---|---|
| Veilleurs du Désert | Butin, protection, pioche de Tislit, équipements et récupération de cartes | Takouba de Tin Hinan |
| Cour des Djinns | dégâts en vagues, effets à la mort, retour différé d'Anqa, Honneur et Résonance samouraï | Anqa des braises |
| Sentiers de cendre | Pétra et mana bicolore, Butin, équipements, Coup rapide | Fériel |
| Marée des abysses | contresorts, rebonds, Vipère de verre et serpents du Bâton des citernes | Léviathan |
| Serment des Neuf Hivers | Furie, Résonance, gel et contrôle du combat | Maître du marteau |
| Serment du Soleil rouge | Honneur, Résonance samouraï et Bannière du Daimyō | Kagutsuchi, flamme originelle |

**Les autres mythiques ne sont pas ajoutées à la dotation.** Les étages les
révèlent, puis les boosters du Souk peuvent les donner. Le starter marée ne
contient ainsi que le Léviathan, tandis que Kraken, Bakunawa et Jörmungandr
restent à ouvrir ; Cavalier des deux sabres, Orochi et Susanoo attendent aussi
les boosters pour le Soleil rouge. Les rares hors starter suivent la même
progression de révélation et d'achat.

Le Sonneur fêlé passe de rare à inhabituelle pour composer une Marée avec les
quatre raretés ; il entre alors dans la dotation de départ et sort des
révélations d'Abysses 1. L'Appât de la meute passe de commune à inhabituelle
pour la même raison de composition. Les deux cartes restent dans la dotation,
qui comprend toutes les communes et inhabituelles.

### Les cinq paquets d'Histoire

Les recettes d'Histoire gardent leurs plafonds **par famille** : elles règlent
la difficulté sans laisser une créature rare empêcher le sorcier d'aligner ses
sorts.

| Paquet | Étages | Terrains / Créatures / Magies | Plafonds | Signature |
|---|---|---:|---|---|
| `souffleuse-de-verre` | Listes 4 · Souk 4 | 17 / 17 / 6 | 4 mythiques · 3 rares | Fériel · Trait de braise ×3 · Fennec ×3 · Vent rouge ×2 · Djinn de foudre |
| `gardes-du-fjord` | Fjord 1 | 21 / 12 / 7 | 1 mythique · 2 rares | Dame des neuf mondes · Mur ×3 · Brume ×2 · Festin ×2 · Scalde · Guerrier |
| `meute-des-neiges` | Fjord 2 | 21 / 13 / 6 | 0 mythique · 3 rares | Loup ×3 · Berserk ×2 · Guerrier · Hurlement |
| `maitre-des-neuf-hivers` | Fjord 4 | 18 / 15 / 7 | 2 mythiques · 4 rares | Père des corbeaux · Maître du marteau |
| `grand-horloger` | Listes 5 · Sables 3 | 17 / 17 / 6 | 3 mythiques · 4 rares | Tin Hinan · Sahir · Anqa |

### Le contrôle

`npm run check:rpg-decks` (`tests/rpg-decks-puissance.test.js`) recalcule chaque
liste à partir de sa recette et vérifie :

- les quarante cartes, l'identité chromatique et la composition par recette ;
- au moins une carte de chaque rareté et exactement une mythique dans chacun
  des six starters ;
- les plafonds rares, la disponibilité en boosters des rares et mythiques hors
  starters, et les cartes d'illustration présentes dans leur boîtier ;
- les plafonds de campagne par famille et le classement des cartes de
  remplissage.

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
