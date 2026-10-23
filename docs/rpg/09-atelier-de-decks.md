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
   le compteur `N / 30 cartes` et sa jauge, la **courbe de
   mana**, la répartition des couleurs, la liste par type, la **carte
   emblématique** du boîtier. La validation (`rpgValiderDeckMaison`) court
   **en direct** : elle dit à chaque instant si le deck tiendrait le format,
   et **vérifie la collection** — une carte verrouillée refuse de rejoindre le
   deck et annonce où se débloquer (« Le Souk la vendra après « Le Pêcheur de
   perles » — La Tour des Abysses »).
3. **Enregistrer** — un deck peut être enregistré **en brouillon** (moins de
   30 cartes) : il rejoint l'étagère, mais son bouton reste « Indisponible »
   tant que le format n'est pas tenu, et sa fiche l'explique. Un deck
   complet est **jouable aussitôt**. Quand le joueur enregistre, le jeu
   **propose de donner un nom au deck** (panneau `.rpg-atelier__nommage`) :
   trois suggestions tirées de son contenu, et le champ reste libre. La
   sauvegarde referme l'atelier, ouvre la fiche du deck et confirme sur la
   ligne d'état.
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

## La création assistée

Le bouton **« ✦ Création assistée »** de l'atelier ouvre un assistant en trois
étapes (`RpgDeckAssistant.jsx`, fil `.rpg-assistant__fil`) :

1. **Couleurs** — une à trois des cinq couleurs du jeu ;
2. **4 créatures** — créatures **et héros** possédés de ces couleurs, choisis
   librement sur la grille ;
3. **4 sorts** — tout ce qui n'est ni créature ni héros : **magies et armes**,
   mêmes règles.

Puis **« Générer le deck »** : `genererDeckAssiste` (`src/games/rpgDeckAuto.js`)
complète les vingt-deux places restantes avec des cartes qui **complètent** les
huit choisies. Chaque candidat est noté sur la **synergie** avec les familles
de mots-clés déjà choisies (le mot de la famille plafonné, sinon son
couple), la **couverture** des familles absentes, la **courbe de mana** visée,
le **mix créatures / sorts**, les **couleurs** et la puissance intrinsèque —
le tout dans la collection, avec **× 2 exemplaires** par carte (× 1 pour un
mythique). Le deck fini (30 cartes) revient dans l'atelier, annoncé **prêt à
jouer** ; chaque carte reste modifiable à la main, comme dans une création
classique.

À l'enregistrement, le **nommage** s'ouvre pour tout deck, assisté ou non :
trois suggestions sont tirées du contenu (« Les Disciples de … », « Le Serment
de … », « La Garde de … », particules respectées — « d'Anqa »), et le champ
reste libre.

## La disposition : ce que l'on emprunte à Magic Arena

Le constructeur de decks d'Arena est la référence des joueurs de cartes sur
PC ; l'atelier en reprend les gestes, dans la matière du Sablier (nuit,
laiton, encres claires — `src/games/rpg-deck-atelier.css`).

| Arena | L'atelier |
|---|---|
| La collection est une **grille de cartes**, pas une liste | `.rpg-atelier__cartes` : vignettes plein art au cadre de la couleur de la carte (`cardFrameColor`), médaillon de coût avec pips, attaque / défense des créatures, losange de rareté |
| **Clic gauche +1, clic droit −1** | le bouton `.rpg-atelier__carte-ajout` couvre la vignette ; `contextmenu` sur la vignette ou sur une rangée du deck retire un exemplaire (et ne montre pas le menu du navigateur) ; un petit « − » (`.rpg-atelier__carte-retrait`) apparaît au survol, toujours visible au doigt |
| Compteur « 2/4 » posé sur la carte | `.rpg-atelier__carte-count` : `×N/limite` ; une carte au quota s'éteint (`.is-full`), une carte verrouillée porte un cadenas et dit où se gagner (`.is-locked`) |
| **Aperçu grand format au survol** | le même `HoverCardPreview` que le duel et le catalogue : la page passe `onHoverCard` / `onLeaveHoverCard`, l'atelier les pose sur les vignettes (souris **et** focus clavier) et les rangées du deck |
| Barre de filtres à **bascules** (symboles de mana, coût, type, rareté, « possédées ») | `.rpg-atelier__toolbar` : quatre **pips de couleur** (`aria-pressed`, cumulables en OU) + « Hybrides » ; coûts **1 à 6 et 7+** ; types ; raretés — **commune, inhabituelle, rare, mythique**, comme Magic (losange coloré) ; « Possédées » ; recherche sur nom, ligne de type **et texte** ; tri (coût, nom, couleur, rareté) ; « ↺ Réinitialiser » n'apparaît que si un filtre est actif |
| Panneau du deck à droite : nom en titre, compteur, **courbe de mana**, couleurs, liste par type | `.rpg-atelier__deck` (collant à l'écran sur PC) : nom en champ-titre, `N / 30 cartes` et jauge (verte à 30, rouge au-delà), créatures / magies / armes / **coût moyen**, verdict de validation ; `courbeDeMana` dessine sept barres (1…6, 7+) ; `repartitionCouleurs` liste par couleur cartes et pips exigés ; la liste va **Créatures → Magies → Armes**, rangées « vignette · médaillon de coût · nom · − × N + » triées par coût |
| **« Ajouter des terrains »** | *(retiré)* : les terrains ont quitté le jeu, le mana est automatique — `completerEnTerrains` ne fait plus rien et le bouton a disparu |
| Vider le deck | « ⌫ Vider le deck », confirmation en deux temps sur le bouton lui-même |
| **Créer sans cliquer** | **« ✦ Création assistée »** : un assistant en trois étapes (couleurs, 4 créatures, 4 sorts) puis le moteur `genererDeckAssiste` complète le deck ; à l'enregistrement, le jeu propose de **nommer** le deck |

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

Le même format que les decks du catalogue (`rpgValiderDeck`, étendu aux
decks maison par `rpgValiderDeckMaison` dans `src/games/rpgDeckBuilder.js`) :

| Règle | Valeur |
|---|---|
| Taille | exactement **30 cartes** (un brouillon peut être enregistré en dessous, il n'est pas jouable) |
| Terrains | **aucun** : les terrains ont été retirés du jeu, le mana est automatique |
| Couleurs | **1 à 3** |
| Mythique | **× 1** |
| Autres cartes | **× 2** |

Un deck maison porte un nom (60 caractères au plus, tronqué sans casser), un
identifiant `maison-*` généré (jamais codé en dur dans les tests : les
vérifications cherchent par nom), et une carte emblème optionnelle qui
habille son boîtier. Le normalisateur (`normaliserDeckMaison`) expose le nom
sous `nom` **et** `name`, pour que l'étagère, la fiche et la plaque du duel
lisent tous la même chose.

## Les recettes : d'où viennent les decks du catalogue

Les **treize paquets du jeu** — les huit boîtiers de l'étagère et les cinq
variantes de la campagne — sont composés par recette, pas écrits carte par
carte. Les huit starters privilégient les mécaniques déjà présentes au
catalogue, puis le composeur complète les places dans l'identité du deck.

Trois fichiers portent cette règle, sans dépendance circulaire :

| Fichier | Ce qu'il contient |
|---|---|
| `src/games/rpgCardPower.js` | l'échelle de puissance d'une carte |
| `src/games/rpgDeckRecipes.js` | les huit recettes de starter et les cinq recettes d'Histoire |
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
  places de chaque famille, pour un total de trente (`terrains` reste dans le
  schéma, mais il est toujours vide depuis le retrait des terrains) ;
- `signature` — les cartes d'archétype posées avant le remplissage, même si
  une carte mieux classée frappe à la porte ;
- pour les starters, `mythiquesTotalMax` et `raresTotalMax` — des plafonds
  globaux comptant les cartes rares distinctes non-terrain. La plupart des
  starters ont une mythique ; le Serment des Neuf Hivers et le Soleil rouge
  en ont deux ;
- pour les paquets d'Histoire, `mythiquesMax` et `raresMax` — des plafonds par
  famille, conservés pour régler la montée des Tours.

Le composeur pose la signature, remplit les familles par rareté puis puissance,
et poursuit jusqu'à ce qu'aucune place ne reste vide. Les plafonds globaux des
starters sont durs : ils s'appliquent aussi à la signature et à la passe finale.
Les plafonds d'Histoire restent par famille. Chaque carte ne dépasse jamais sa
limite légale (une copie d'une mythique, deux des autres cartes).

### Les huit decks du catalogue

La répartition des raretés ci-dessous compte les **copies** ; le nombre de
créatures, magies et armes est donné à part. Chaque ligne totalise
trente cartes, sans terrain. Le plafond rare est celui de la recette et compte
les cartes rares distinctes, pas leurs copies. Les héros sont comptés parmi les
créatures.

| Deck | Terrains / Créatures / Magies / Armes | Commune | Inhabituelle | Rare | Mythique | Plafond rare distinct |
|---|---:|---:|---:|---:|---:|---:|
| Veilleurs du Désert | 0 / 18 / 6 / 6 | 13 | 6 | 10 | 1 | 5 |
| Cour des Djinns | 0 / 21 / 9 / 0 | 10 | 2 | 17 | 1 | 10 |
| Sentiers de cendre | 0 / 16 / 8 / 6 | 15 | 4 | 10 | 1 | 6 |
| Marée des abysses | 0 / 10 / 18 / 2 | 15 | 2 | 12 | 1 | 7 |
| Serment des Neuf Hivers | 0 / 17 / 12 / 1 | 10 | 1 | 17 | 2 | 10 |
| Serment du Soleil rouge | 0 / 20 / 10 / 0 | 8 | 2 | 18 | 2 | 10 |
| Balance des Heures | 0 / 19 / 10 / 1 | 12 | 8 | 9 | 1 | 6 |
| Lettres de Marque | 0 / 19 / 9 / 2 | 12 | 8 | 9 | 1 | 7 |

| Starter | Mécaniques mises en avant | Mythiques du boîtier |
|---|---|---|
| Veilleurs du Désert | Butin, protection, pioche de Tislit, équipements et récupération de cartes | Takouba de Tin Hinan |
| Cour des Djinns | dégâts en vagues, effets à la mort, retour différé d'Anqa, Honneur et Résonance samouraï | Anqa des braises |
| Sentiers de cendre | Pétra et mana bicolore, Butin, équipements, Coup rapide | Fériel |
| Marée des abysses | contresorts, rebonds, Vipère de verre et serpents du Bâton des citernes | Léviathan |
| Serment des Neuf Hivers | Furie, appel viking, gel et contrôle du combat | Valkyrie des glaces ; Maître du marteau |
| Serment du Soleil rouge | Honneur, Résonance samouraï et Bannière du Daimyō | Daimyō du Soleil rouge ; Kagutsuchi, Flamme originelle |
| Balance des Heures | Prix, Tribut, destruction, défausse et réanimation | La Dévoreuse |
| Lettres de Marque | Abordage, cale, Cargaison, Butin et course | La Barbe-Rousse |

**Les autres mythiques ne sont pas ajoutées à la dotation.** Elles se révèlent
au fil de l'Histoire, puis s'obtiennent dans les boosters du Souk. Le Serment
des Neuf Hivers et le Soleil rouge ont chacun deux mythiques dans leur starter ;
les autres figures du Nord et du Japon — notamment le Cavalier des deux sabres,
Orochi et Susanoo — restent à ouvrir. Les figures marines hors du Léviathan,
les autres grandes figures des Ténèbres et les mythiques hors du boîtier pirate
suivent la même progression de révélation et d'achat.

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

- les trente cartes, l'identité chromatique et la composition par recette ;
- au moins une carte de chaque rareté et le quota mythique déclaré par la
  recette de chacun des huit starters ;
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
| `src/games/rpgDeckBuilder.js` | limites (nom, plafond, `RPG_DECK_TAILLE = 30`), `rpgValiderDeckMaison`, `normaliserDeckMaison`, `fusionnerEtatsSablier`, et le panneau du deck : `courbeDeMana`, `repartitionCouleurs` (`completerEnTerrains` ne fait plus rien : le mana est automatique) |
| `src/games/rpgDeckAuto.js` | la création assistée : `genererDeckAssiste` (complétion notée), `scoreComplementarite`, `suggestionsNomsDeck`, `particuleDe` |
| `src/games/RpgDeckAssistant.jsx` | l'assistant en trois étapes (couleurs, 4 créatures, 4 sorts) : composant pur, `onGenerer({ couleurs, creatures, sorts })` rend la main à l'atelier |
| `src/games/RpgDeckAtelier.jsx` + `rpg-deck-atelier.css` | l'éditeur façon Arena (grille, bascules, panneau du deck) : composant pur, tout état vient en props, la persistance et l'aperçu au survol restent au parent |
| `src/games/rpgLongPress.js`, `src/games/RpgDuelPage.jsx` | le geste d'aperçu au doigt, délégué au menu entier (l'atelier compris) par `onPointerDown` |
| `src/games/useDecksSablier.js` | casier local, collection, compte, `statutSync`, suppression à pierre tombale |
| `src/games/rpgSablierRemote.js` | transport Supabase (lecture `maybeSingle`, upsert tolérant) |
| `src/games/RpgDuelPage.jsx` | le câblage : crate, étagère maison, fiche, ligne d'état, `enregistrerAtelier` |
| `src/auth/AuthContext.jsx` | le contexte de compte, lu défensivement par le hook |
| `supabase/schema.sql` | la table `rpg_sablier_progress` et ses règles RLS |
| `tests/rpg-collection.test.js`, `tests/rpg-deck-builder.test.js`, `tests/rpg-deck-auto.test.js` | les règles vérifiées (`npm run check:rpg`) |
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
- **L'assistant choisit, l'algorithme complète** : les huit cartes posées à la
  main disent ce que le joueur veut jouer ; la notation (synergie, couverture,
  courbe, mix) ne fait que traduire ce vœu en trente cartes. « Sorts » veut
  dire magies **et** armes — tout ce qui n'est ni créature ni héros — et les
  choix entrent ×2 (×1 si mythique), comme s'ils avaient été cliqués un par
  un dans la grille.
- **Nommer à l'enregistrement, pas avant** : le nom raconte le deck fini ;
  les suggestions naissent donc du contenu réel, une fois la génération (ou la
  sélection manuelle) terminée — et le champ reste libre pour qui veut le
  sien.

Les vérifications : `npm run check:rpg` (les règles pures — moteur, collection,
deck builder), `npm run check:rpg-deck-ui` (la page rendue dans jsdom, plus les
garde-fous de source, l'atelier par la crate jusqu'à la copie) et
`npm run check:rpg-ui` (le geste d'aperçu au doigt, atelier compris) — ces
commandes doivent rester vertes, ainsi que `npx vite build`.
