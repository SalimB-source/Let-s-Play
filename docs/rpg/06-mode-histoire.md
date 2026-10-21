# 06 — Mode Histoire : les Tours de Bab El

> État : **tours jouables et épisode I scénarisé**. Voir aussi
> [`10-scenario-la-derniere-liste.md`](10-scenario-la-derniere-liste.md) et la
> [bible visuelle des personnages](11-bible-visuelle.md). Le duel
> (`src/games/rpgDuel.js`) accepte un deck, une puissance et un **profil d'IA**
> par sorcier adverse (`src/games/rpgAI.js`), et l'interface du duel
> (`src/games/RpgDuelPage.jsx`) est rejouable telle quelle à chaque étage.

## Le principe

Le joueur gravit des **tours** de plusieurs **étages**. Chaque étage est tenu
par un sorcier de la Chambre des Heures (ou de la ville basse) avec son deck,
sa personnalité et sa difficulté propres. Le sommet est un **Grand
Horloger**. La piste initiale en deux manches n’est pas implémentée : le boss
reste un duel autonome. Entre deux étages, on garde sa progression —
jamais de grind obligatoire (règle du dossier `03-combat.md`).

La métaphore est celle de la ville : plus on monte, plus les étages tiennent ;
en bas, le sable a déjà tout repris.

## Découpage d’une tour (première esquisse : la Tour des Listes)

Ce tableau conserve les intentions initiales. Les decks, puissances et profils
exactement joués sont désormais ceux de `src/games/rpgStoryTours.js`.

| Étage | Sorcier | Deck | Profil IA | Note |
| --- | --- | --- | --- | --- |
| 1 | Le Guetteur de palier | Cour des Djinns (mono-Braise) | `recit` / `equilibre` | tuto : il annonce ses coups mal |
| 2 | La Scribe de la Liste | Sentiers de cendre (hybride) | `normale` / `controle` | joue le retrait, punit les plateaux serrés |
| 3 | Le Puisatier des Cendres | Veilleurs du Désert (miroir) | `normale` / `prudent` | bloque bien, soigne, épuise |
| 4 | La Souffleuse de verre | Variante hybride + Fériel | `normale` / `agressif` | Coups rapides, course aux PV |
| 5 | Le Grand Horloger | Deck propre + 2 mythiques | `veilleur` / `controle` | **boss** : un duel autonome, comme les autres étages |

**La Tour des Abysses** (4 étages, bleue) : ses quatre sorciers jouent la Marée
des abysses, avec contres et bêtes marines. Avec **la Tour du Fjord** (la
Neige), ce sont les **deux tours dédiées à une couleur** ; les trois autres
mélangent encore leurs couleurs. Dans le mode Histoire, le sorcier peut jouer
n'importe quel deck de campagne (`RPG_STORY_DECKS`).

Une tour = 5 étages × 1 duel, un boss tous les 3 étages mineurs si on
découpe plus grand (les autres tours : la Tour des Heures, la Tour du
Souk, la Tour des Sables, la Tour du Fjord…). Les noms et dialogues vivent
dans le dossier [`02-histoire.md`](02-histoire.md).

## La Tour du Fjord — la Neige entre dans la campagne

La quatrième tour est la maison du deck **Serment des Neuf Hivers** : elle
donne à la couleur Neige une place dans le mode Histoire, sans toucher aux
règles du duel. Comme les autres, elle suit la convention « un étage = un duel
autonome » (deck complet, PV pleins, rien de reporté).

| Étage | Sorcier | Deck | Profil IA | Note |
| --- | --- | --- | --- | --- |
| 1 | La Garde du fjord | `gardes-du-fjord` (21 Glaciers, boucliers et brumes) | `normale` / `prudent` | la muraille épuise avant de rendre les coups |
| 2 | La Meute des neiges | `meute-des-neiges` (loups, berserks, éclairs) | `normale` / `agressif` | la course : le premier tour décide |
| 3 | La Valkyrie du fjord | `serment-des-neuf-hivers` (le deck Neige du catalogue) | `veilleur` / `agressif` | vol, coups rapides et pioches du Père des corbeaux |
| 4 | Le Maître des Neuf Hivers | `maitre-des-neuf-hivers` (le Serment essuyé + les figures) | `veilleur` / `controle` | **boss** : le Père des corbeaux et le Maître du marteau |

- Les quatre decks de la tour sont **mono-Neige** (vérifié par test : chaque
  carte porte l'identité Neige, et le seul terrain est le Glacier) et passent
  `rpgValiderDeck` — les figures mythiques y restent à un exemplaire.
- Un étage peut porter un **portrait de sorcier** (`avatar`, un identifiant
  d'illustration de `public/cards/`) : la plaque « LE SORCIER » montre alors ce
  visage au lieu de l'Ifrit générique. Le test vérifie que chaque portrait
  annoncé est une carte du catalogue et une peinture réellement livrée
  (`tests/rpg-story.test.js`).

## La Tour du Soleil rouge — le Japon fantastique et la voie du sabre

La sixième tour est le sanctuaire du deck **Serment du Soleil rouge** : elle
donne aux samouraïs, yōkai et forgerons de la Braise une tour dédiée.

| Étage | Sorcier | Deck | Profil IA | Note |
| --- | --- | --- | --- | --- |
| 1 | L’Avant-garde du Soleil | `gardes-du-soleil` (ashigaru, hatamoto, archers, bannière) | `normale` / `agressif` | pose la ligne d'attaque et teste les défenses |
| 2 | Les Lames écarlates | `lames-du-soleil` (kenshis, ronins, jitte, souffle de feu) | `normale` / `equilibre` | coups rapides, ripostes et gestion de table |
| 3 | Le Daimyō d’Amayas | `serment-du-soleil-rouge` (le deck Samouraï du catalogue) | `veilleur` / `agressif` | jetons grandissants et résurgence de Kagutsuchi |
| 4 | Le Maître du Soleil rouge | `maitre-du-soleil-rouge` (Susanoo, Kagutsuchi, katana) | `veilleur` / `controle` | **boss** : les figures mythiques et le Kenshi légendaire |

- Plateau attitré : **La Cour de l'Empereur** (`cour-de-l-empereur`).
- Maquette 3D procédurale : pagode étagée aux toits recourbés, grand torii écarlate et bannières samouraï.
- Ambiance sonore : synthèse koto/taiko pentatonique en mi mineur (`playSoleilRouge`).

## La Tour de la Nécropole — les Ténèbres et la pesée des âmes

La septième tour incarne l'antique nécropole de **La Balance des Heures** : elle
déploie les malédictions, le Tribut et le jugement d'outre-tombe.

| Étage | Sorcier | Deck | Profil IA | Note |
| --- | --- | --- | --- | --- |
| 1 | Les Veilleurs de basalte | `momies-de-la-necropole` (momies, scarabées, sarcophage) | `normale` / `prudent` | muraille défensive et régénération des dépouilles |
| 2 | La Meute du Seuil | `chacals-du-seuil` (chacals du seuil, couveuses, tribut) | `normale` / `agressif` | rapidité, vol de vie et pression continue |
| 3 | La Balance des Heures | `balance-des-heures` (le deck Ténèbres du catalogue) | `veilleur` / `controle` | défausse adverse, exils et réanimations |
| 4 | Le Juge de la Nécropole | `juges-de-la-necropole` (Celui qui juge, Dernière Pesée) | `veilleur` / `controle` | **boss** : destruction de masse et sentence finale |

- Plateaux attitrés : **La Nécropole des dalles** (`necropole-des-dalles`) pour
  les trois premières cryptes — le plateau du désert en plein jour, le cercle
  d'hiéroglyphes et les pyramides dressées sur le plateau, deux à gauche et une
  à droite —, et **Le Palais du Pharaon** (`palais-du-pharaon`) pour le
  tribunal du sommet : le jugement se rend dans la salle du trône, sur le
  dallage d'albâtre, devant le trône et les colonnes de lotus.
- Maquette 3D procédurale : pylône monumental, obélisques veilleurs, colonnes de lotus et sarcophage de basalte.
- Ambiance sonore : harpe modale phrygienne, percussions rituelles et basses profondes (`playNecropole`).

## Ce qui existe déjà (à brancher, pas à réinventer)

- **Profils d'IA** : `rpgNouveauDuel({ sorcierIA: { niveau, style } })`.
  - `niveau` : `recit` (se trompe volontairement) · `normale` · `veilleur`
    (calcule les lignes létales, garde son burn pour conclure).
  - `style` : `agressif` · `equilibre` · `prudent` · `controle`.
  - Chaque sorcier d'étage porte le sien — c'est **la** personnalité de
    gameplay des boss, sans toucher aux règles.
- **Decks et puissance** : `RPG_DECKS` (déjà 3 archétypes validés par
  `rpgValiderDeck`). `sorcierPuissance` ne modifie plus les PV du sorcier —
  tous les duels se jouent à 25 PV de départ de chaque côté
  (`RPG_PV_SORCIER_PAR_PUISSANCE` = 0) ; la puissance reste l'indice de
  difficulté affiché sur la fiche d'étage.
- **Le duel complet** : `RpgDuelPage` rejoue tel quel, avec `joueurDeck`,
  `sorcierDeck`, `sorcierPuissance`, `rng` en props.
- **IA tactique** (`rpgAI.js`) : ciblage (kill, menace, visage létal),
  blocages (échanges, chump sous pression, survie), choix d'attaquants
  (rentabilité de la déclaration entière), séquencement de la phase principale.

## Ce qui est en place (octobre 2026)

1. **Le conteneur mode Histoire** — `src/games/rpgStory.js` + l'écran « Histoire »
   de `RpgDuelPage` : **galerie des tours en 3D** d'abord (une maquette
   distincte par tour — les étages restent masqués tant que la tour n'est pas
   ouverte), puis **page de la tour** au clic sur sa carte (même maquette en
   grand format, étages dévoilés, retour à la galerie) → lancement du duel avec
   les bons props ; écran de victoire d'étage (étage suivant / rejouer / retour
   aux tours) et de défaite (recommencer / retour), dont les boutons ont tous la même hauteur
   et leur texte centré verticalement (la flèche de « Étage suivant » reste sur la
   ligne du nom d'étage) ; **sauvegarde** de la
   progression en localStorage (`letsplay_sablier_histoire_v2`, migration de la
   v1). Les scènes et décisions restent locales ; le compte synchronise les
   decks et la collection, pas encore le récit. Le mode Histoire porte sa
   propre **miniature dédiée** (`public/sablier-story/mode-histoire.jpg`)
   affichée sur le bouton d'accueil et dans l'en-tête de la campagne.
2. **Les données des tours** — `src/games/rpgStoryTours.js` (id, nom, miniature,
   fonction, deck, puissance, ia, note, et depuis la Neige `avatar` — la figure de
   l'étage sur la plaque du sorcier) : **sept tours, vingt-huit étages, seize decks**
   (les archétypes existants et leurs variantes, tous à 30 cartes sans terrain validées).
3. **La règle de continuité entre étages** — **décision : piste A (simple) retenue
   pour l'instant**. Chaque étage est un duel autonome : deck complet, PV pleins,
   aucune ressource reportée ; seule la progression (étages déblayés) compte.
   La piste B (bouclier de verre conservé entre les étages) reste différée.
   **Les étages ne donnent plus de cartes : ils les révèlent** (dossier 13).
   `rpgCollection.js` porte la carte des révélations, `rpgBoosters.js` en fait
   les viviers du Souk, et le gel des acquis a repris une fois pour toutes ce
   que l’ancienne règle avait donné.

4. **La Dernière Liste, épisode I** : l’entrée « Commencer le récit » précède
   les tours libres. La Tour des Listes porte dix scènes illustrées, une
   décision chez la Scribe et deux épilogues. Le journal relit les scènes sans
   changer les choix. Les portraits canoniques du registre `rpgStoryCast.js`
   sont communs aux dialogues et aux duels ; les anciens joueurs peuvent
   passer les combats déjà remportés. Aucune règle de combat supplémentaire.
5. **Le lecteur animé (octobre 2026)** — `RpgStoryScene.jsx` + `rpgStoryLecture.js`.
   La lecture devient une scène vivante, sans toucher aux transitions du récit
   (`rpgStoryFlow.js` reste la seule source de vérité du curseur) :
   - **machine à écrire** (`useMachineAEcrire`) : la réplique s’écrit à
     `MS_PAR_CARACTERE` (16 ms/caractère) ; le texte complet reste dans le DOM,
     la partie à venir est masquée (`visibility`, jamais de saut de mise en
     page) ; un clic sur la réplique, Espace, Entrée ou → l’affiche d’un bloc.
     Les commandes du récit restent actives pendant l’écriture : un bouton
     avance toujours, la machine n’est jamais un verrou.
   - **auto-lecture** : entre répliques d’une même scène seulement — jamais
     vers un duel, jamais dans un choix, jamais quand le fil du récit est
     ouvert ou l’onglet caché (`delaiAutoLecture` plafonne à 6 s).
   - **fil du récit** : panneau latéral (z-index propre, Échap ou clic hors
     panneau pour le refermer) qui relit les répliques déjà vues de la scène.
     Une relecture n’est jamais une décision.
   - **clavier** : Espace / Entrée / → tournent la page (sauf commande
     focusée, sauf choix en attente — un choix ne se fait jamais à la place
     du joueur) ; Échap referme le fil.
   - **mise en scène de roman visuel** : pendant les scènes, **deux
     personnages maximum par plan** — de vrais **sprites détourés** ancrés
     **en bas de l'écran, au premier plan** (`public/sablier-story/stands/stand-*.webp`,
     fond transparent), générés depuis les peintures canoniques par
     `tools/make-stands.py` (fond magenta retiré par inondation depuis les
     bords, halo désincrusté, bords adoucis) — mêmes visages, même style de
     peinture, aucun recolorage. À gauche l'hôte de la scène (`scene.figure`),
     à droite celui qui parle, ou son interlocuteur attitré quand l'hôte
     parle ; celui qui parle est en pleine lumière, l'autre dans l'ombre. Ces
     bords ne sont pas figés : `placerPlateauHistoire()` rend `[{ id, miroir }]`
     et échange les deux places quand les regards peints les tourneraient vers
     le **même** bord de l'écran ; si l'échange ne suffit pas (deux figures
     peintes du même côté, comme Amaní et Yamina), la seconde est retournée
     (`miroir: true`, `scale: -1 1` via `[data-miroir="oui"]`). Personne ne
     tourne le dos à son interlocuteur, personne ne regarde le bord de l'écran
     pendant qu'on lui parle. `REGARDS_PEINTS` recense les quinze figures
     franchement de trois quarts — `feriel`, `reine-etals`, `nageuse`,
     `devoreur`, `dernier-fennec`, `marchand`, `boualem`, `djinn-souk` vers la
     gauche de leur peinture ; `sonneur`, `horloger-zenith`, `meute-neiges`,
     `salem`, `guetteur`, `yamina`, `amani` vers la droite ; les autres sont
     frontales et tiennent indifféremment l'un ou l'autre bord. Sans cette
     règle, Fériel placée à gauche fixait le bord de l'écran pendant que Salem
     la regardait : les deux semblaient regarder dans la même direction. Le
     champ `stand` du registre `rpgStoryCast.js` porte les sprites et
     `standHistoire()` les résout ; les personnages des actes suivants, encore
     sans sprite, retombent sur le portrait encadré (même placement).
     **Les personnages dépassent de l'écran** : chaque sprite est plus haut que
     la fenêtre et son bas descend sous le bord (`--rpg-story-debord`,
     `clamp(44px, 13vh, 156px)` sur écran large) — les jambes sont coupées par
     le bord lui-même, jamais par une boîte, et c'est ce débord qui fait la
     taille : la figure visible fait toujours `100vh - --rpg-story-tete`
     (`max(22vh, 150px)`), donc le sprite grandit sans que la tête monte vers le
     cartouche. Le portrait encadré du repli, lui, remonte du débord
     (`margin-bottom`) : c'est le personnage qui dépasse, pas le cadre. Les
     sprites sont purs décors (`pointer-events: none`, fixés au bas de
     l'écran, 38vw de large) ; la **boîte de dialogue passe devant leur buste** (style
     Persona : contour blanc franc, pointes blanches, ombre dure) avec
     l'**étiquette de nom en bulle blanche à encre sombre**, soulignée de la
     couleur du personnage ; les décisions passent en colonne centrale
     au-dessus du duo. Sur mobile / écran étroit en portrait, la fenêtre de
     scène (`.rpg-narrative__fenetre` / `.rpg-narrative__plateau`) pose le duo
     juste au-dessus de la boîte de dialogue et son débord est plus court
     (`clamp(42px, 8.5vh, 92px)`) : le bas des personnages glisse derrière le
     bord supérieur de la bulle, qui recule d'autant sa marge, au lieu de
     s'arrêter au-dessus d'elle — les personnages ne sont jamais cachés sous le
     texte en bas d'écran ; en paysage mobile, les personnages remontent
     jusqu'à la barre d'en-tête de part et d'autre d'une boîte centrale
     resserrée, leur débord passant sous le bord bas. Briefings de duel,
     épilogues et journal gardent les portraits canoniques en page.
   - **décor vivant** : travelling lent (Ken Burns) sur la peinture de la
     scène et voile de sable en boucle sans couture, sous le texte
     (`.rpg-narrative__decor` / `__sable`, couches `position: fixed` en
     `z-index: -1`, le fond statique de la section reste le repli).
   - **portrait vivant** : respiration lente, halo externe dans la couleur du
     personnage quand il parle, lumière baissée quand la ville porte la voix.
     Le portrait canonique n’est jamais recoloré, retourné ni remplacé.
   - **sablier de scène** : en pied de page, le sable du haut est ce qu’il
     reste à lire ; une granule tombe tant que la scène continue.
   - **préférences** : « Texte animé » et « Auto-lecture » dans la barre de
     confort de lecture, persistées dans `letsplay_sablier_lecture_v1`
     (`chargerPreferencesLecture` / `sauverPreferencesLecture`, écriture
     protégée : un stockage refusé n’interrompt jamais la session).
   - **sons** : blip de réplique, page-turn de changement de scène, select de
     choix, menu d’ouverture du fil — via `onSfx` (`jouerSfx`), déjà soumis au
     coupe-son du jeu.
   - **accessibilité** : `prefers-reduced-motion` reçoit le texte d’un bloc et
     un écran fixe (bloc final de `rpg-story.css`) ; le texte complet est
     annoncé une seule fois par réplique via une région `role="status"`
     visuellement masquée, la machine à écrire n’étant qu’un effet visible.
   - Vérifications : `npm run check:rpg-lecture` (rythmes et préférences),
     `npm run check:rpg-story-ui` (le smoke narratif rejoue scènes, relectures,
     choix, journal et migration avec le lecteur animé monté, et lit
     `rpg-story.css` : le débord des personnages sous le bord de l'écran, la
     remontée du portrait encadré et les trois mises en scène y sont vérifiés),
     `npm run check:rpg-story-browser` (vrai navigateur : les personnages
     restent largement visibles au-dessus de la boîte sur 320–1440 px).
6. **L'affiche de la campagne, et son livre (octobre 2026)** —
   `RpgStoryCampaign.jsx`. Sous le titre : la promesse, puis **le livre des
   actes**. Ce n'est plus une grille de cartes : les actes **atteints** sont
   les onglets verticaux du volume (`[data-campaign-act]`, `aria-pressed`,
   libellé `Acte {romain}` seulement — le titre vit dans `aria-label`), et une
   **double page** les ouvre (`[data-campaign-page]`) : à gauche l'acte
   (`Acte N · statut`, titre, résumé, trois portraits), à droite ses paliers
   (`[data-campaign-step]` avec leur statut). Le livre s'ouvre sur l'acte en
   cours ; cliquer un autre onglet pose un aperçu et **tourne la feuille**
   (`is-tournee`, `@keyframes rpg-campaign-feuille`, 720 ms), les pages
   rejouant leur entrée à chaque acte. Cliquer l'acte en cours revient à lui.
   Aucun acte non atteint n'a d'onglet ; le bouton de reprise, le badge et
   `[data-story-next-act]` restent hors du livre. En `prefers-reduced-motion`
   la feuille n'apparaît pas et la page change sans animation ; sous 699 px le
   livre passe en une colonne, onglets à plat sous la page.

## Ce qu'il reste à construire

Les actes du Souk, des Abysses, du Fjord et des Sables, les fins du portail,
les registres optionnels et la synchronisation du récit. Ces quatre tours
restent accessibles en duels libres, sans scènes de campagne pour l’instant.

## Règles de design (à ne pas casser)

- **Aucun coup surprise** : le mode Histoire change les adversaires, jamais
  les règles du duel (les intentions et la lecture restent le contrat).
- **La difficulté est de l'information**, pas des réflexes ni des buffs
  cachés : étage 1 en `recit`, boss en `veilleur`, et la puissance de l'étage
  (`sorcierPuissance`) est **affichée** sur la fiche d'étage. Elle ne donne
  plus de PV supplémentaires — le sorcier et le joueur partent tous les deux
  à 25 PV (et peuvent monter au-dessus, les soins ouvrent la réserve), la
  difficulté passe par le deck et le profil d'IA.
- **Pas d'obligation de grind** : les trois decks de base gagnent la première
  tour tels quels ; les étages révèlent des cartes au Souk, ils ne commandent
  pas la suite de l'histoire — et le Souk ne vend rien qu'une marche atteinte
  n'a pas déjà révélé.
- **Chaque sorcier a une signature lisible** (style + cartes emblématiques),
  pour que le joueur explique pourquoi il a gagné — la règle d'or de
  [`03-combat.md`](03-combat.md).
- **Tout le texte reste lisible, en thème clair comme en thème sombre** : le menu,
  le mode Histoire et le duel forment un écran de jeu **sombre dans les deux
  thèmes**. Les jetons du site qu'ils lisent (`--ink`, `--muted`, `--dim`,
  `--line*`, `--cyan`, `--violet`) sont réancrés sur `.rpg-battle` dans
  `rpg-battle.css` ; tout nouveau jeton lu par le CSS du jeu doit y être ajouté.
  Un étage verrouillé s'estompe par la couleur, jamais par `opacity` ; les
  descriptions d'étage passent à la ligne (pas d'ellipse) ; l'overlay de fin
  d'étage porte son propre `z-index` pour rester au-dessus de la table. Le
  balayage d'encre (`scripts/theme-ink-sweep.mjs`) exclut le motif `.rpg-`.
  `npm run check:rpg-story-ui` vérifie ces points dans les sources CSS.

## Vues 3D des tours

- `RpgStoryTowerPreview.jsx` remplace les vignettes et les bannières par un
  canvas Three.js. Les noms, résumés, compteurs, étages et règles ne changent pas.
- `rpgStoryTowerModels.js` construit cinq maquettes procédurales : sablier et
  astrolabe (Listes), étals et auvents (Souk), portail ouvert et ruines (Sables),
  galeries bleues et algues (Abysses), corniches gelées et drakkar (Fjord). Les
  pièces sont fusionnées par matériau (7 à 10 meshes par tour) ; les textures
  de pierre/zellige sont générées localement, sans modèle ou CDN externe.
- `rpgStoryTowerScene.js` charge la 3D à l'arrivée dans l'écran, ajuste le cadrage
  au conteneur, borne la résolution et tourne à 24 images/s au maximum. La
  boucle s'arrête hors champ et en onglet caché. `prefers-reduced-motion` garde
  une vraie vue 3D mais fixe, sans boucle de rendu. Les gestes tactiles restent
  disponibles pour le défilement et la carte reste un bouton clavier.
- Sans WebGL2, en cas d'échec du chargement ou de perte du contexte, la peinture
  `miniature` de `public/sablier-tours/` prend le relais, sans bloquer les étages.
  Le démontage libère les textures, géométries, matériaux, observateurs,
  écouteurs, RAF et le contexte WebGL (y compris lors des allers-retours).
- Vérifications : `npm run check:rpg-story-3d` (modèles/cadrage/ressources),
  `npm run check:rpg-story-ui` (navigation/progression et repli sans WebGL),
  puis, avec le serveur Vite et Chromium, `npm run check:rpg-story-3d-ui`
  (vrai rendu, animations, téléphone, perte du contexte et nettoyage).
