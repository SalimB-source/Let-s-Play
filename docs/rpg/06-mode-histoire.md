# 06 — Mode Histoire : les Tours de Bab El

> État : **conception**. Le socle technique existe déjà : le duel
> (`src/games/rpgDuel.js`) accepte un deck, une puissance et un **profil d'IA**
> par sorcier adverse (`src/games/rpgAI.js`), et l'interface du duel
> (`src/games/RpgDuelPage.jsx`) est rejouable telle quelle à chaque étage.

## Le principe

Le joueur gravit des **tours** de plusieurs **étages**. Chaque étage est tenu
par un sorcier de la Chambre des Heures (ou de la ville basse) avec son deck,
sa personnalité et sa difficulté propres. Le sommet est un **Grand
Horloger** en deux manches. Entre deux étages, on garde sa progression —
jamais de grind obligatoire (règle du dossier `03-combat.md`).

La métaphore est celle de la ville : plus on monte, plus les étages tiennent ;
en bas, le sable a déjà tout repris.

## Découpage d'une tour (exemple : la Tour des Listes)

| Étage | Sorcier | Deck | Profil IA | Note |
| --- | --- | --- | --- | --- |
| 1 | Le Guetteur de palier | Cour des Djinns (mono-Braise) | `recit` / `equilibre` | tuto : il annonce ses coups mal |
| 2 | La Scribe de la Liste | Sentiers de cendre (hybride) | `normale` / `controle` | joue le retrait, punit les plateaux serrés |
| 3 | Le Puisatier des Cendres | Veilleurs du Désert (miroir) | `normale` / `prudent` | bloque bien, soigne, épuise |
| 4 | La Souffleuse de verre | Variante hybride + Fériel | `normale` / `agressif` | Coups rapides, course aux PV |
| 5 | Le Grand Horloger | Deck propre + 2 mythiques | `veilleur` / `controle` | **boss** : deux phases (deux duels enchaînés, PV partiellement conservés) |

Une tour = 5 étages × 1 duel, un boss tous les 3 étages mineurs si on
découpe plus grand (les autres tours : la Tour des Heures, la Tour du
Souk, la Tour des Sables…). Les noms et dialogues vivent dans le dossier
[`02-histoire.md`](02-histoire.md).

## Ce qui existe déjà (à brancher, pas à réinventer)

- **Profils d'IA** : `rpgNouveauDuel({ sorcierIA: { niveau, style } })`.
  - `niveau` : `recit` (se trompe volontairement) · `normale` · `veilleur`
    (calcule les lignes létales, garde son burn pour conclure).
  - `style` : `agressif` · `equilibre` · `prudent` · `controle`.
  - Chaque sorcier d'étage porte le sien — c'est **la** personnalité de
    gameplay des boss, sans toucher aux règles.
- **Decks et puissance** : `RPG_DECKS` (déjà 3 archétypes validés par
  `rpgValiderDeck`), `sorcierPuissance` ajuste les PV du sorcier.
- **Le duel complet** : `RpgDuelPage` rejoue tel quel, avec `joueurDeck`,
  `sorcierDeck`, `sorcierPuissance`, `rng` en props.
- **IA tactique** (`rpgAI.js`) : ciblage (kill, menace, visage létal),
  blocages (échanges, chump sous pression, survie), choix d'attaquants
  (rentabilité de la déclaration entière), séquencement de la phase principale.

## Ce qu'il reste à construire

1. **Le conteneur mode Histoire** (`src/games/rpgStory.js` + écran dans
   `RpgDuelPage` ou page dédiée) :
   - sélection de tour → liste d'étages → lancement du duel avec les bons
     props ; écran de victoire d'étage (récompense, dialogue, étage suivant) ;
   - **sauvegarde** de la progression (localStorage d'abord, Supabase ensuite
     comme le reste du site — voir `src/auth/`).
2. **Les données des tours** : un fichier `rpgStoryTours.js` (id, nom,
   étages [{ sorcier, deckId, puissance, ia, dialogueIntro, recompense }]).
   Aucun deck nouveau n'est obligatoire pour la première tour : les trois
   archétypes existants + des variantes de puissance suffisent.
3. **La règle de continuité entre étages** (choisir une piste) :
   - piste A (simple) : chaque duel repart à 50 PV, deck complet — purement
     tactique ;
   - piste B (narrative) : on garde un **bouclier de verre** accumulé
     (jusqu'à 10 PV de moins subis au premier tour du duel suivant), ce qui
     récompense les victoires propres sans grind.
4. **Dialogue et cadence** : avant/après chaque duel, une carte-scène sobre
   (le site a déjà les habitudes visuelles — voir `city-rush-story.css` pour
   la mécanique d'enchaînement réutilisable dans *City Rush*).

## Règles de design (à ne pas casser)

- **Aucun coup surprise** : le mode Histoire change les adversaires, jamais
  les règles du duel (les intentions et la lecture restent le contrat).
- **La difficulté est de l'information**, pas des réflexes ni des buffs
  cachés : étage 1 en `recit`, boss en `veilleur`, les PV supplémentaires
  (`sorcierPuissance`) sont **affichés** sur la fiche d'étage.
- **Pas d'obligation de grind** : les trois decks de base gagnent la première
  tour tels quels ; les récompenses ouvrent des cartes du classeur, pas la
  suite de l'histoire.
- **Chaque sorcier a une signature lisible** (style + cartes emblématiques),
  pour que le joueur explique pourquoi il a gagné — la règle d'or de
  [`03-combat.md`](03-combat.md).
