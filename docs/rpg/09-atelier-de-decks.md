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
| Barre de filtres à **bascules** (symboles de mana, coût, type, rareté, « possédées ») | `.rpg-atelier__toolbar` : quatre **pips de couleur** (`aria-pressed`, cumulables en OU) + « Hybrides » ; coûts **1 à 6 et 7+** (un filtre de coût écarte les terrains) ; types ; raretés (losange coloré) ; « Possédées » ; recherche sur nom, ligne de type **et texte** ; tri (coût — terrains en fin —, nom, couleur, rareté) ; « ↺ Réinitialiser » n'apparaît que si un filtre est actif |
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
`tests/rpg-collection.test.js`.

- **La dotation de départ** est une règle, pas une liste figée : toutes les
  cartes **communes et inhabituelles** du set (29 cartes ; la pétra, matière
  à scénario, en est exclue).
- **Les récompenses d'étage** (`RPG_RECOMPENSES_PAR_ETAGE`) donnent les
  cartes rares : les 20 étages des sept chapitres débloquent au fil de l'eau
  **46 cartes** — collection complète : **75 cartes** sur les 82 du set. Les
  épique et mythique se gagnent aux boss ; le Kraken mythique attend la
  victoire sur « Le Pêcheur de perles ».
- **Le suivi** : `carteDebloqueePar(id)` dit quelle étage débloque une carte
  (l'atelier s'en sert pour ses messages), `carteEstDebloquee(id, collection)`
  répond à la question de l'instant. La collection voyagée dans un état
  synchronisé est normalisée avant comparaison (`normaliserCollection`).
- **Le cache local** : `letsplay_sablier_collection_v1` — lecture tolérante,
  écriture silencieuse, valeur illisible → collection de départ, comme partout
  dans la maison.

Le rythme de débloquage suit celui du mode Histoire : le Sable est là dès le
départ, l'Eau arrive au souk, la Braise se mérite à mi-parcours, la Neige
n'existe qu'au fond des abysses — un deck maison d'une couleur donnée suppose
donc d'être allé chercher cette couleur dans la ville.

## Les règles de construction

Les mêmes quotas que les decks du catalogue (`rpgValiderDeck`, étendus aux
decks maison par `rpgValiderDeckMaison` dans `src/games/rpgDeckBuilder.js`) :

| Règle | Valeur |
|---|---|
| Taille | exactement **40 cartes** (un brouillon peut être enregistré en dessous, il n'est pas jouable) |
| Terrains | au moins **40 %** du deck, en quantité libre |
| Épique / mythique | **× 1** |
| Autres non-terrains | **× 3** |

Un deck maison porte un nom (60 caractères au plus, tronqué sans casser), un
identifiant `maison-*` généré (jamais codé en dur dans les tests : les
vérifications cherchent par nom), et une carte emblème optionnelle qui
habille son boîtier. Le normalisateur (`normaliserDeckMaison`) expose le nom
sous `nom` **et** `name`, pour que l'étagère, la fiche et la plaque du duel
lisent tous la même chose.

## L'étagère maison

- **Le plafond** : six decks maison (`RPG_DECKS_MAISON_LIMITE`). La crate
  reste visible mais l'atelier refuse d'ouvrir un septième et le dit.
- **L'étiquette** : chaque boîtier maison porte la mention DECK MAISON, la
  même carcasse 3D que le catalogue, son compteur de cartes — et un badge
  « brouillon » quand il n'est pas complet.
- **Le tri** : les decks maison passent **après** le catalogue, du plus récent
  au plus ancien (`decksTous = [...RPG_DECKS, ...decksMaison]`, la liste
  filtrée par couleur passe par `decksVisibles`).

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
| `src/games/rpgCollection.js` | dotation de départ, récompenses d'étage, `carteDebloqueePar`, `normaliserCollection` |
| `src/games/rpgDeckBuilder.js` | limites (nom, plafond, `RPG_DECK_TAILLE`), `rpgValiderDeckMaison`, `normaliserDeckMaison`, `fusionnerEtatsSablier`, et le panneau du deck : `courbeDeMana`, `repartitionCouleurs`, `completerEnTerrains` |
| `src/games/RpgDeckAtelier.jsx` + `rpg-deck-atelier.css` | l'éditeur façon Arena (grille, bascules, panneau du deck) : composant pur, tout état vient en props, la persistance et l'aperçu au survol restent au parent |
| `src/games/useDecksSablier.js` | casier local, collection, compte, `statutSync`, suppression à pierre tombale |
| `src/games/rpgSablierRemote.js` | transport Supabase (lecture `maybeSingle`, upsert tolérant) |
| `src/games/RpgDuelPage.jsx` | le câblage : crate, étagère maison, fiche, ligne d'état, `enregistrerAtelier` |
| `src/auth/AuthContext.jsx` | le contexte de compte, lu défensivement par le hook |
| `supabase/schema.sql` | la table `rpg_sablier_progress` et ses règles RLS |
| `tests/rpg-collection.test.js`, `tests/rpg-deck-builder.test.js` | les règles vérifiées (`npm run check:rpg`) |
| `scripts/rpg-deck-smoke.jsx` + `scripts/rpg-deck-ui-check.mjs` | la page montée dans jsdom : atelier complet, brouillon, duel maison, édition, copie, garde-fous de source (`npm run check:rpg-deck-ui`) |

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

Les vérifications : `npm run check:rpg` (les règles pures, 240 tests) et
`npm run check:rpg-deck-ui` (la page rendue dans jsdom, plus les garde-fous de
source) — les deux doivent rester verts, ainsi que `npx vite build`.
