# Let’s Play — page officielle

Landing page éditoriale dédiée à **Let’s Play**, l’émission algérienne qui parle de gaming, cinéma, e-sport, tech et pop culture.

## Lancer le projet

```bash
npm install
npm run dev
```

Pour produire la version de production :

```bash
npm run build
```

## Thème clair / sombre

Le site se joue en deux thèmes. Le **sombre** reste l'identité d'origine et le
défaut ; le **clair** est un choix explicite de l'utilisateur.

- Bascule dans la barre de navigation (icône soleil / lune), dernière commande
  utilitaire à droite de la recherche. En menu mobile, elle occupe toute la
  largeur avec son libellé.
- Le choix est mémorisé (`localStorage`, clé `lp-theme`) et repris au chargement
  par un script en ligne dans `index.html` : la page ne s'affiche jamais en
  sombre avant de basculer, ce qui produirait un flash très visible.
- `?theme=light` (ou `?theme=dark`) force le thème le temps d'une visite :
  pratique pour partager un lien de recette.
- La barre du navigateur (`theme-color`) suit le thème actif.

Le thème clair est décrit dans **`src/theme.css`**, importé en dernier dans
`src/main.jsx` (il surcharge les dix-huit autres feuilles). Trois principes le
gouvernent, et il vaut la peine de les connaître avant d'y toucher :

1. **Les accents s'assombrissent pour le texte, pas pour le remplissage.** Le
   cyan `#22d3ee` tombe à 1,7:1 sur blanc. Chaque teinte existe donc en deux
   versions : `--cyan` (encre lisible), `--cyan-bright` (remplissages, halos).
   Le jaune de marque `--yellow` reste le jaune d'origine en aplat — c'est
   l'*encre posée dessus* qui est sombre — et `--yellow-ink` sert quand il doit
   être du texte.
2. **Les médias restent sombres.** Lecteur YouTube, fenêtre vidéo,
   vignettes et voiles posés sur une photo gardent leur fond sombre et leur
   texte blanc dans les deux thèmes. Seules les surfaces de l'interface
   passent au clair. La section 8 de `theme.css` (commentée) ré-affirme cette
   intention. Seule exception : le héros d'accueil utilise une image unique
   (`public/hero-keyart.jpg`) plein cadre, identique dans les deux thèmes,
   avec un voile sombre discret à gauche et un texte blanc/jaune pour garantir
   la lisibilité du titre, du texte et des actions (bloc « Héros clair » de la
   section 8).
3. **Les halos deviennent des ombres.** Un `text-shadow` néon sur fond clair
   produit un halo sale ; il est remplacé par une ombre colorée douce.

Deux points d'attention pour la suite :

- **Le wordmark est blanc à l'origine.** Sur fond clair, `Layout` sert
  `public/lets-play-logo-light.png` (généré par `tools/make-light-assets.py`) :
  mêmes formes, le « Let's » blanc devient indigo, le jaune et le violet de
  marque ne bougent pas. Si le logo officiel change, régénérer ce fichier.
- **Le mur des partenaires garde une bande sombre.** Les logos tiers (Djezzy,
  egor, LG, IFA, TMV…) sont dessinés clairs sur sombre : les recolorer serait
  trahir des marques qui ne nous appartiennent pas. C'est aussi un rappel du
  thème d'origine au milieu d'une page claire.

### Vérifier le thème clair

```bash
npm run theme:ink-sweep   # régénère la liste des encres à rabattre vers le sombre
```

`theme:ink-sweep` reparcourt les feuilles et réécrit la section « encre claire →
encre sombre » de `src/theme.css` : environ 200 règles posent une encre claire
(blanc, jaune de marque) parce qu'elles visaient un fond noir, et cette liste
mécanique évite d'en oublier une quand le site évolue. Les contextes qui gardent
leur encre claire (médias, bandeaux de marque, pastilles de statut) sont exclus
du générateur et traités à la main dans `theme.css`.

Contrôle de contraste (outil d'atelier, hors dépôt) : chaque page est parcourue
dans les deux thèmes, le fond effectif de chaque texte est calculé en empilant
les couches translucides, et tout ce qui passe sous le seuil WCAG AA est
signalé. Onze pages sont aujourd'hui à zéro écart en clair.

## Mise en page téléphone (iPhone, Android, WebView)

Le site bascule sur sa mise en page mobile via des requêtes média
`@media(max-width:800px)`. Or **la fenêtre de mise en page n'est pas toujours
la largeur de l'écran** :

- **Safari iOS mémorise un zoom par site** (menu « Aa » → −, pincement, ou
  « version ordinateur ») et le réapplique au chargement : la fenêtre de mise en
  page peut valoir 800–1100 px sur un écran de 390 px. Toutes les requêtes
  `max-width:800px` sont alors ignorées, et le téléphone affiche la mise en page
  du PC — barre de navigation complète, blocs côte à côte.
- **Une WebView n'honore `<meta name="viewport">`** que si l'application le lui
  demande ; sinon elle met la page en page à ~980 px, puis la réduit pour la
  faire tenir dans l'écran. Même symptôme dans l'APK.

Deux parades, dans cet ordre :

1. **`normalizePhoneViewport()`** (`src/lib/phoneLayout.js`, appelé avant le
   premier rendu dans `src/main.jsx`, puis deux fois après le montage — Safari
   applique parfois son zoom une fois la page chargée) : sur un téléphone
   (écran ≤ 600 px sur son petit côté) dont la fenêtre de mise en page dépasse
   800 px **et** reste plus haute que large, le `<meta name="viewport">` est
   réécrit — le navigateur recalcule alors la mise en page, qui revient à
   l'échelle 1. La fenêtre est écrite une fois sous sa forme d'origine, puis une
   fois sous une variante équivalente (`initial-scale=1` au lieu de `1.0`) : la
   chaîne change, donc le recalcul est relancé même si le viewport était déjà le
   bon, et au troisième appel il n'y a plus rien à faire. Un téléphone en
   **paysage** (fenêtre 844 × 390) n'est jamais touché : sa fenêtre est la
   largeur réelle de son écran, et la mise en page large y est celle voulue.
2. **Les feuilles de style ne dépendent plus de la seule largeur.** Chaque
   requête « petit écran » est écrite en OU d'une condition qui décrit un
   téléphone d'après la **taille d'écran** (`max-device-width`, insensible au
   zoom), et chaque requête « bureau » est restreinte aux appareils qui ne sont
   pas des téléphones en portrait :

   ```css
   /* petit écran — un téléphone à fenêtre large est couvert aussi */
   @media(max-width:800px), (hover:none) and (pointer:coarse) and (max-device-width:600px){ … }

   /* bureau — plus appliqué à un téléphone en portrait, mais toujours actif
      sur ordinateur, tablette et téléphone en paysage */
   @media(min-width:801px) and (hover:hover), (min-width:801px) and (min-device-width:601px){ … }
   ```

   Une liste média est fausse si **une** de ses conditions est inconnue du
   navigateur : la mise en page d'origine continue donc de fonctionner partout
   ailleurs (Firefox, qui ne connaît pas `device-width`, ignore simplement la
   seconde condition). C'est le même critère qui pilote le JavaScript : les
   décisions « mobile » de `Layout.jsx` (barre qui ne se cache pas au
   défilement, pastille de navigation masquée) et des contextes social /
   messagerie (`SOCIAL_MOBILE_MEDIA` : page `/messages` plutôt que pop-up)
   passent par `isPhoneLayout()` / `isHandheld()` du même module.

```bash
npm run check:phone-css      # échoue si une requête média perd sa condition téléphone
npm run check:phone-layout   # détection « téléphone » : zoom, paysage, iPad, bureau (jsdom)
```

`check:phone-css` relit toutes les feuilles, compte 86 requêtes « petit écran »
et 12 requêtes « bureau » et échoue si l'une d'elles repart sans garde-fou : un
nouveau composant qui écrirait `@media(max-width:700px)` sans la condition
téléphone casse la vérification. C'est la règle à connaître avant d'ajouter une
requête média. `check:phone-layout` rejoue les situations gênantes sur un faux
DOM (écran de 390 px et fenêtre de 860 px, viewport élargi, paysage, iPad,
ordinateur) et vérifie que la normalisation du viewport ne se déclenche que là
où il faut — et une seule fois.

Côté **APK Android**, la WebView reçoit `setUseWideViewPort(true)` et
`setLoadWithOverviewMode(true)` (`android/app/src/main/java/dz/letsplay/officiel/MainActivity.java`) :
sans eux, elle ignorait `<meta viewport>` et l'app affichait la mise en page PC.

## Mirage Rush : le plein écran

Le jeu (`/jeu/mirage-rush`) **se lance en plein écran de base**, sur ordinateur
comme sur téléphone. Le mécanisme est **commun aux jeux d'arcade**
(`gameFullscreen.js` / `useGameFullscreen.js`) : Vice City Rush s'en sert aussi
(voir « Vice City Rush : le plein écran »).

| Geste | Effet |
|---|---|
| Ouverture de la page | l'interface occupe tout de suite tout l'écran (couche fixe, sans geste) ; le navigateur exige un geste pour le plein écran natif : il part au **premier clic ou à la première touche** du joueur |
| Bouton **PLEIN ÉCRAN** de la barre du jeu | ouvre ou ferme, à tout moment (choix du mode, course, pause) |
| **LANCER EN PLEIN ÉCRAN** (écran du terrain) | n'apparaît qu'une fois le plein écran quitté : lance alors la course directement en plein écran |
| Touche **F** | ouvre ou ferme (Ctrl/Cmd/Alt + F restent au navigateur ; un « f » tapé dans un champ de saisie ne fait rien) |
| **Échap**, ou le geste « retour » d'Android | le navigateur referme le plein écran : la course se met **en pause** |

- **Plein écran de base.** La couche fixe (qui couvre tout le viewport) est posée
  au montage de la page, et le choix est « épinglé » : intro, courses et arrivées
  le gardent jusqu'à ce que le joueur le quitte (bouton de la barre, touche F,
  Échap ou geste « retour » du navigateur). Téléphone, tablette et application
  Android : le clic sur une carte de map (ou de coupe) demande en plus le natif
  dans le geste (`opensFullscreenOnLaunch()`), ce qui rouvre un plein écran
  quitté. Sur la seule couche fixe, Échap met simplement la course en pause.
- **Course en ligne** : la fenêtre de course a son propre bouton et la touche F.
  Jamais d'ouverture automatique — le départ vient du serveur, sans geste du
  joueur, et le navigateur refuserait. Pas de pause non plus : une course en
  ligne ne s'arrête pas pour un joueur. La fenêtre se referme à l'arrivée pour
  laisser voir les résultats.
- **Deux couches.** Le plein écran natif (Fullscreen API, préfixe WebKit compris ;
  dans l'APK, la WebView le prend en charge) et une couche fixe, la classe
  `is-immersive`, qui règle la mise en page. Quand l'API manque ou refuse (iPhone,
  `iframe` sans `allowfullscreen`), la couche fixe seule suffit pour jouer. À la
  sortie, la couche reste jusqu'à la fin de l'animation du navigateur : la piste
  ne rétrécit pas dans une fenêtre encore en plein écran.
- **Fluidité.** Une scène de cubes n'a pas besoin de la définition d'un écran 4K :
  `miragePixelBudget.js` plafonne l'image à environ 2,2 millions de pixels (un
  peu plus que 1920 × 1080) et le navigateur étire le reste. Le 1080p plein écran
  garde sa définition native ; la vue dans la page et le téléphone ne changent pas.

### Où vit le code

- `src/games/gameFullscreen.js` — les gestes du navigateur (demande, sortie, qui
  ouvre au lancement, touche F), sans React ; **partagé avec Vice City Rush** ;
- `src/games/useGameFullscreen.js` — l'état React : `is-immersive`, verrou de
  défilement `game-immersive-lock`, sortie différée jusqu'à `fullscreenchange` ;
- `src/games/FullscreenIcon.jsx` — l'icône, dessinée en SVG (le glyphe ⛶
  manque à beaucoup de polices) ; **partagée elle aussi** ;
- `src/games/MirageRushPage.jsx` (pause, intro, touche F) et
  `src/games/MirageOnline.jsx` (fenêtre de course) ; styles dans
  `src/games/mirage-rush.css` (`.is-immersive`).

### Vérifications

```bash
npm run check:mirage-fullscreen          # page et fenêtre en ligne dans jsdom, Fullscreen API simulée
node --test tests/game-fullscreen.test.js   # touche F, API, budget de pixels (moteur partagé)
```

jsdom n'a ni WebGL ni Fullscreen API : la vérification remplace le moteur 3D par
une doublure (`scripts/mirage-world-stub.jsx`) et la Fullscreen API par une
doublure qui répond comme un navigateur (elle sait aussi refuser, attendre, ou
fermer « de l'extérieur » comme Échap). Elle ne dit rien du rendu réel : pour
cela, ouvrir le jeu dans un vrai navigateur (`npm run dev`) et le passer en plein
écran sur un grand écran.

## Mirage Rush : une carte = une partie

L'écran 02 (après le choix du mode) n'a **plus de bouton de lancement** : c'est la
carte elle-même qui démarre la partie.

| Carte touchée | Effet |
|---|---|
| Map (RUÉE ou DUEL) | la partie démarre aussitôt sur cette map (compte à rebours, puis la course) |
| Map d'un défi (`?duel=…`) | la carte imposée est la seule jouable — les autres restent verrouillées |
| Coupe | la coupe choisie démarre aussitôt sa première course |
| Map en mode EN LIGNE | la map devient celle du salon, et le lobby s'ouvre |

- **✓ vert des cartes finies.** Une map gagnée en 1ʳᵉ place (`wonStages`) porte un
  ✓ vert dans son coin et le libellé « ✓ TERMINÉE · JOUER » : elle reste jouable
  pour rejouer. Une coupe remportée (`completedCups`) porte le même ✓ vert et
  « ✓ TERMINÉE · REJOUER ». Le ✓ est réservé aux cartes réellement finies : une
  carte seulement sélectionnée montre un point (●), une carte libre un ▶, une
  carte verrouillée son cadenas.
- **L'attente du moteur 3D** s'affiche en pastille (« CHARGEMENT DU PARCOURS… ») à
  la place de l'ancien bouton ; sur ordinateur, « LANCER EN PLEIN ÉCRAN » reste
  proposé à côté pour démarrer directement en grand.

### Où vit le code

- `src/games/MirageCoursePicker.jsx` — `MirageStagePicker` / `MirageCupPicker` :
  le clic appelle `onStart(…)`, et les classes `is-won` / `is-completed` /
  `is-imposed` portent le ✓ vert et la carte imposée d'un défi ;
- `src/games/MirageRushPage.jsx` — `startStageCard()` / `startCupCard()` lancent la
  course ou la coupe demandée dans le même clic, sans état intermédiaire ;
- `src/games/mirage-rush.css` — ✓ vert (`.is-won`, `.is-completed`), consigne
  (`.mirage-picker-hint`) et pastille d'attente (`.mirage-stage-loading`).

### Vérifications

```bash
npm run check:mirage-flow         # clic sur une carte = partie lancée, ✓ vert des maps et des coupes
npm run check:mirage-cup          # coupe lancée au clic, relance d'une coupe terminée
npm run check:mirage-fullscreen   # plein écran de base au lancement, natif au premier geste, commandes F / bouton / « LANCER EN PLEIN ÉCRAN »
```

## Mirage Rush : les bruitages des techniques de Cloud

Le chocobo doré ne se bat pas comme les autres cavaliers : ses deux pouvoirs —
l'**onde d'épée** jaune (W/Z) et l'**éclair** rouge (R) — ont leur propre
matière sonore, synthétisée en Web Audio dans `src/games/arcadeAudio.js` (comme
toute la bande-son du jeu, sans aucun fichier).

| Technique | Instant | Son |
|---|---|---|
| **Onde d'épée** (jaune) | lancer | `cloudSwordWave()` — rafale de vent qui s'ouvre, sifflement de lame, accord doré |
| **Onde d'épée** (jaune) | impact | `cloudWaveExplosion()` — déflagration grave, boule de feu qui s'assombrit, éclats dorés en cascade, écho du désert |
| **Éclair** (rouge) | évocation | `cloudStormCharge()` — vent d'orage qui se lève, grondement lointain dans le grave |
| **Éclair** (rouge) | frappe | `cloudThunderStrike()` — claquement sec, détonation qui tombe à 26 Hz, tonnerre qui roule et s'éteint |

- **Au bon instant.** Le monde three.js ne joue aucun son : quand la foudre
  claque et quand l'onde percute, il prévient la page
  (`callbacks.cloudStrike`, prop `onCloudStrike`), qui déclenche le bruitage.
- **En ligne aussi.** `MirageRushPage` et `MirageOnline` branchent les quatre
  sons ; le cavalier standard garde le lasso et le pistolet. Touché par un rival
  de Cloud, on entend le tonnerre ou l'explosion de l'onde
  (`cloudThunderStrike()` / `cloudWaveExplosion()`), pas le coup de pistolet ni
  le lasso.
- **Coupé, rien ne part.** Comme les autres bruitages, les quatre méthodes
  sortent immédiatement si la musique est arrêtée (bouton SON).

### Vérifications

```bash
node --test tests/mirage-audio.test.js   # vent doré, explosion, orage, tonnerre + câblage du monde et des deux pages
```

## Mirage Rush : Link & Épona, offerts 3 jours

Un crossover de plus dans la boutique de `/jeu/mirage-rush` : **Link & Épona**
(320 OR). Le cavalier porte la tunique et la casquette vertes, l'épée de légende
à la main droite et le bouclier hylien sanglé dans le dos ; le cheval de base
est remplacé par **Épona**, jument baie à crins blonds, liste et balzanes crème,
selle verte et cuir.

Le duo est **offert à tous les joueurs pendant 3 jours** (72 h), comme Cloud et
son chocobo le sont sans limite de date. Passé la fenêtre, il repasse
automatiquement derrière son prix de 320 OR : rien à reconfigurer, le
verrouillage est calculé sur l'horodatage courant.

| Skin | Accès | Prix habituel |
|---|---|---|
| Gyro Zeppeli | boutique | 200 OR |
| Cloud & son Chocobo | offert (accès temporaire permanent) | 280 OR |
| Link & Épona | offert 3 jours | 320 OR |

### Ses trois techniques

Quand Link est en selle, les objets spéciaux changent de nature (les
diamants chargent les mêmes barres, aux mêmes touches) :

| Couleur | Touche | Standard | Link |
|---|---|---|---|
| Bleu | AUTO | Bouclier | **Bombe** : sphère noire posée derrière Épona, mèche allumée de 1,5 s, puis explosion de zone qui fait tomber tout ennemi à **2 cases** ; un adversaire qui la **touche** la fait sauter avant la fin de la mèche |
| Jaune | W / Z | Lasso | **Boomerang** : blanc, va tout droit sur quelques mètres puis revient ; un adversaire touché est ralenti ; **deux lancers** par charge |
| Rouge | R | Pistolet | **Triforce** : le triangle d'or fonce sur l'adversaire **juste devant** et le fait tomber |
| Vert | AUTO | Turbo | Turbo (inchangé) |

En ligne, la victime reçoit l'effet qui correspond à la technique subie
(`link-boomerang`, `link-triforce`, `link-bomb`) : le message du salon et le
tangage du cavalier touché s'adaptent. La bombe emprunte le canal réseau du
tir avec une cause `link-bomb` pour rester reconnaissable.

### Où vit le code

- `src/games/mirageLinkPowers.js` — les trois effets 3D (pur three.js,
  testable) : `makeLinkBomb()` / `updateLinkBombVisual()` (mèche
  `LINK_BOMB_FUSE_DURATION`, portée `LINK_BOMB_AOE_TILES`), `detonateLinkBomb()`
  (détonation au contact, rayon `LINK_BOMB_TOUCH_RADIUS`) / `linkBombTouched()`,
  `makeLinkBoomerang()` /
  `updateLinkBoomerangVisual()` (portée `LINK_BOOMERANG_RANGE`, deux lancers),
  `makeLinkTriforce()` / `updateLinkTriforceVisual()` ;
- `src/games/MirageWorld.jsx` — `isLinkRider()`, `dropLinkBomb()`,
  `launchLinkPower()`, `findTriforceTarget()` (l'adversaire juste devant),
  `linkBombVictims()` (rayon de 2 cases) et `explodeLinkBomb()` ; la bombe
  recule avec le décor et saute dès qu'un adversaire la touche
  (`linkBombRiderPoints()`) ;
- `src/games/mirageRooms.js` — `slowEffectFor()` / `stunEffectFor()` /
  `slowHitMessage()` / `stunHitMessage()` : effets et messages côté salon ;
- `src/games/arcadeAudio.js` — `linkBombDrop()`, `linkBombExplosion()`,
  `linkBoomerangThrow()`, `linkTriforce()` et `linkTriforceImpact()` ;
- `src/games/miragePowerIcons.js` + `public/icons/mirage-rush/link-*.svg` et
  `src/games/MiragePowerIcon.jsx` — icônes « Bombe / Boomerang / Triforce » ;
- `src/games/mirageCharacters.js` — palette, nom, accessoire `link-epona` et
  prix (index `LINK_EPONA_INDEX`) ; le personnage est aussi ajouté au lobby en
  ligne (`LOBBY_CHARACTER_INDICES`) ;
- `src/games/mirageExplorer.js` — `attachLinkEpona()` : la monture Épona, la
  casquette, l'épée (`parts.masterSword`) et le bouclier (`parts.hylianShield`) ;
- `src/games/mirageProgression.js` — `LINK_EPONA_FREE_FROM` /
  `LINK_EPONA_FREE_UNTIL` (fenêtre de 3 jours), `isSkinTemporarilyFree()`,
  `temporaryFreeUntil()` et `formatFreeWindow()` (compte à rebours affiché) ;
- `src/games/MirageRushPage.jsx`, `src/games/MirageOnline.jsx` et
  `src/games/mirage-rush.css` — vitrine verte dans « Ton cavalier » et la
  boutique, étiquette « OFFERT 3 JOURS » et compte à rebours.

### Vérifications

```bash
npm run check:mirage-link    # personnage, fenêtre de 3 jours, retour au prix de 320 OR, bombe / boomerang / Triforce
npm run check:mirage-flow    # la boutique affiche les trois skins, leurs prix et les techniques de Link dans les règles
```

## Mirage Rush : graphismes baissés et glissement tactile

### Graphismes baissés (moins de lag)

Une option du jeu (`/jeu/mirage-rush`) allège l'image sur les appareils qui
rament. C'est un **choix du joueur**, jamais imposé : par défaut le jeu est dessiné
comme avant.

| Où | Quoi |
|---|---|
| Bouton **GRAPHISMES : NORMAUX / BAISSÉS** de la barre du jeu (entre SON et PLEIN ÉCRAN) | interrupteur, à tout moment ; réduit à son icône (trois barres) sur la barre étroite d'un téléphone |
| Choix **NORMAUX / BAISSÉS** sur l'écran du choix du mode et sur l'écran de pause | le même réglage en toutes lettres |
| Fenêtre de course **En ligne** | le même bouton, en tête de sa barre |

Le choix est mémorisé sur l'appareil (`letsplay_mirage_graphics_v1`), partagé par
tous les onglets et **se change en direct**, même en pleine course : le monde 3D relit
le réglage sans être reconstruit, la course ne s'interrompt pas.

| | Normaux | Baissés |
|---|---|---|
| Résolution | jusqu'à 1,55 pixel par pixel CSS, 2,2 M pixels | 1 pixel par pixel CSS, 0,92 M pixels (1280 × 720) — sur un téléphone de densité 3, **2,4 fois moins de pixels** à remplir |
| Lissage des arêtes (Château de l'Infini) | oui | non (fixé à la création de la course) |
| Décor du désert | nuages animés, rides du sable, voile d'eau, poussière, rayons du soleil, coup de chaleur à l'horizon | ciel et sable simplifiés (un uniforme de shader, aucun recalcul), sans voile, poussière ni faisceaux ; le mirage reste |
| Halos de lumière des cristaux | oui (un sprite additif par gemme) | non — la gemme reste, elle brille simplement moins |
| Décor des autres terrains | tout dessiné | blocs de décor au-delà de 85 % de la portée du brouillard non dessinés (déjà fondus à près de 90 %) — jusqu'à 27 % d'appels de dessin en moins sur les plaines |
| Éclats d'un cristal ramassé | 10 | 5 (jamais moins de 3) |
| HUD (score, chrono) | toutes les 125 ms | toutes les 200 ms |
| Menu, compte à rebours, pause | une image par rafraîchissement | environ 15 images par seconde (la piste est alors immobile) |
| Habillage de la page | flous, grain, lignes de balayage, fond néon | opaque, sans flou (les flous sur un canevas animé coûtent cher aux GPU de téléphone) |

Seul l'habillage change : voies, distances de visibilité des obstacles et des
cristaux, brouillard, collisions, vitesse et chronos restent identiques — un score en
graphismes baissés est un score comme les autres.

Sur un écran de densité 1 dont la vue tient déjà dans 0,92 M pixels (la fenêtre de la page
sur ordinateur), la résolution ne bouge pas : seuls les autres leviers jouent ; le gain de
résolution apparaît en plein écran et sur les écrans denses (téléphones, portables Retina).

### Un glissement = une seule voie

Sur téléphone et dans l'application Android, **un geste ne change qu'une voie** : qu'on
glisse lentement, qu'on claque le doigt d'un bord à l'autre de l'écran ou qu'on traverse
toute la piste, le cheval se décale d'une voie (ce qui compte sur les trois voies d'un
téléphone : un balayage depuis le bord ne le jette plus de l'autre côté).

- La voie part **dès que le doigt a parcouru 22 px**, sans attendre qu'il se lève : aucun
  délai ajouté. Pas de temps mort entre deux gestes — on enchaîne deux glissements à 30 ms
  d'écart, chacun fait sa voie.
- Une diagonale vers le haut donne une voie **et** un saut, jamais deux voies. Revenir en
  arrière dans le même geste ne fait rien de plus : pour repartir, on relève le doigt.
- Un seul doigt pilote le cheval : un second posé par accident (paume, autre main) est
  ignoré jusqu'au relâchement du premier. Un geste interrompu (appel entrant, geste
  système) ne bloque pas les suivants.
- Le clavier n'est pas concerné (la touche maintenue est déjà ignorée).

### Où vit le code

- `src/games/mirageGraphics.js` — les profils (ce que change chaque niveau), la
  mémorisation et l'état partagé, sans DOM ni React ;
- `src/games/useMirageGraphics.js` — le hook React (suit aussi l'évènement `storage`) ;
- `src/games/MirageGraphicsToggle.jsx` — le bouton de la barre et le choix en toutes
  lettres ;
- `src/games/miragePixelBudget.js` — `renderPixelRatio(largeur, hauteur, densité, profil)` ;
- `src/games/mirageGlow.js` — les deux dégradés peints (halo, ombre) et les objets qui
  les portent : c'est `glowHalos` qui allume ou éteint les halos des cristaux ;
- `src/games/MirageWorld.jsx` (application du profil à la volée : `setGraphics`),
  `desertStage.js` / `desertTerrain.js` (`setLite`) ;
- `src/games/mirage-rush.css` — la section « GRAPHISMES BAISSÉS » (classe
  `is-low-graphics` sur la coque de la page et de la fenêtre de course) ;
- `src/games/mirageTouch.js` — le suivi des glissements (`createSwipeTracker`,
  `attachSwipeControls`).

Ajouter un réglage : un champ de plus dans `GRAPHICS_PROFILES`, relu par le moteur.
`tests/mirage-graphics.test.js` fige la liste des champs : un réglage de **jeu** (vitesse,
voies, collisions) n'a rien à y faire.

### Vérifications

```bash
node --test tests/mirage-graphics.test.js tests/mirage-touch.test.js tests/mirage-desert-stage.test.js
npm run check:mirage-graphics            # page et fenêtre en ligne dans jsdom : bouton, classes, mémorisation, bascule en course
```

jsdom n'a pas de WebGL : la vérification de la page remplace le moteur 3D par une
doublure (`scripts/mirage-world-stub.jsx`) et ne dit rien du rendu. Pour la fluidité réelle,
ouvrir le jeu sur le téléphone (ou dans les outils de développement, mode appareil mobile)
et alterner les deux niveaux en pleine course. Le gain se mesure en images par seconde :
sur un téléphone comme sur un ordinateur, il vient d'abord des pixels (résolution), puis,
sur les terrains chargés, du nombre d'objets dessinés.

## Mirage Rush : le soleil, les halos et les ombres

Les **dix terrains** gagnent leur lumière : des faisceaux s'ouvrent depuis leur
soleil (ou leur lune), les cristaux de la piste brillent dans un halo, et les
cavaliers projettent une ombre douce au sol. « Dunes de l'Écho » — le terrain
d'origine — a en plus sa traînée dans la brume et son coup de chaleur à l'horizon.

| Où | Quoi |
|---|---|
| Ciel du désert (`desertTerrain.js`) | **rayons** du soleil (six faisceaux qui battent lentement), **traînée** horizontale à la hauteur du disque, **coup de chaleur** juste au-dessus de la ligne d'horizon |
| Ciel partagé — prairie, western, Sardaigne, Alger, Japon, Remparts, Airbase, Serpent (`MirageWorld.jsx`) | **faisceaux** qui battent lentement depuis le soleil du terrain, et **traînée** à sa hauteur ; ils s'effacent quand le soleil descend sous l'horizon (les nuits de la Prairie et du Far West ne les allument pas) |
| Ciel du Château de l'Infini (`infinityAtmosphere.js`) | **faisceaux figés** autour du soleil de la Grande Arche, appuyés sur l'enveloppe de sa couronne : ils ne débordent ni derrière le bout du pont ni sur les flancs |
| Cristaux (`MirageWorld.jsx`, `mirageGlow.js`) | un halo additif devant chaque gemme, qui respire à sa propre phase ; couleur du palier (rose, bleu, vert, or) |
| Ramassage (`MirageWorld.jsx`) | l'éclair d'un cristal ramassé — ou la gerbe d'une flaque de boue — s'entoure d'un halo qui prend sa couleur et vit ses 0,52 s |
| Cavaliers (`MirageWorld.jsx`) | une ombre douce au sol sous le joueur, sous les rivaux du duel et sous les cavaliers de la course en ligne ; elle pâlit quand ils sautent et suit le clignotement d'invulnérabilité |

La force des faisceaux est un réglage **du terrain**, dans son objet d'ambiance
(`rays`), pour que chaque ciel garde son caractère : plein soleil du couchant sur
la Prairie et le Far West (1), soleil doré d'Alger (0,75), Château de l'Infini
(0,6), plein jour de Sardaigne et d'Airbase (0,5), soleil blanc des Remparts
(0,45), soleil couchant du Serpent (0,35), lune froide du Japon (0,25). Entre 0,04
et 0,11 d'écart par canal à leur maximum : visibles, jamais au point de manger la
palette du terrain.

**Pas de post-traitement, et c'est un choix.** Le ciel et le sable du désert
écrivent leurs couleurs sRGB telles quelles (`desertTerrain.js` : « pas de
tone-mapping ici »), alors que la piste, les cristaux et les cavaliers passent par
le tone-mapping ACES du moteur. Un *bloom* ou un étalonnage en fin de chaîne
obligerait à reprendre une à une toutes ces couleurs — c'est-à-dire à refaire le
désert. La lumière est donc **peinte**, comme au temps des sprites : un dégradé
radial (128 px) reçoit la couleur du cristal et s'ajoute à la scène
(`blending: AdditiveBlending`), sans écrire de profondeur — un halo ne cache
jamais la piste et ne change ni la difficulté ni la lisibilité.

Ce qui ne bouge pas : la palette, la brume, la géométrie du relief, la position des
obstacles, les voies, la vitesse et les chronos. Seul l'habillage lumineux change —
et il s'éteint avec les **graphismes baissés** : les ciels gardent alors leur halo
et leur disque, sans faisceaux, et les gemmes perdent leur halo, pas leur couleur.

Deux détails d'implémentation qui comptent :

- les deux textures (halo, ombre) sont créées **une fois par monde 3D** et
  partagées : un halo qui fabriquerait sa texture à chaque apparition en laisserait
  une derrière lui à chaque recyclage de rangée, en pleine course ;
- les sprites partagent **une seule géométrie** (`THREE.Sprite`) : ni le recyclage
  des rangées ni `destroy()` ne doivent la libérer (`populateRow`), sans quoi les
  halos du reste du jeu seraient coupés.

### Où vit le code

- `src/games/mirageGlow.js` — les dégradés (`makeGlowTexture`, `makeShadowTexture`),
  le halo (`makeHalo`) et l'ombre au sol (`makeGroundShadow`) ;
- `src/games/desertTerrain.js` — `SKY_FRAGMENT` : rayons, traînée et coup de chaleur,
  sous `uLite < 0.5` (graphismes normaux), et l'horloge du ciel du désert ;
- `src/games/MirageWorld.jsx` — le ciel partagé (`uRays` par terrain, `uTime`), son
  `applySkyRays()`, `makeCrystal` (halo), les ombres des cavaliers, la respiration
  des cristaux dans la boucle, `setGraphics` (`glowHalos`, faisceaux) ;
- `src/games/infinityAtmosphere.js` — les faisceaux figés de la Grande Arche
  (`uRays` posé à la création) ;
- `src/games/snakewayStage.js` — `rays` de l'ambiance du Serpent ;
- `src/games/mirageGraphics.js` — le champ `glowHalos` des deux profils, et
  `sceneryEffects`, qui commande les faisceaux des ciels.

### Vérifications

```bash
node --test tests/mirage-glow.test.js tests/mirage-desert-stage.test.js tests/mirage-graphics.test.js
npm run check:mirage-graphics            # page et fenêtre en ligne : le réglage se bascule en direct
npm run build
```

jsdom n'a pas de WebGL : ces vérifications disent ce que les dégradés contiennent,
que les halos s'ajoutent sans masquer, que l'ombre est couchée au sol, que les
champs `glowHalos` et `rays` existent, et que le décor du désert est intact — pas à
quoi la lumière ressemble. Le rendu se juge à l'œil, en jeu, en basculant
« GRAPHISMES : NORMAUX / BAISSÉS » pour comparer.

Le ciel du Château reste **figé** (son shader ne dépend pas du temps :
`tests/mirage-infinity-stage.test.js` le fige aussi), là où le ciel partagé et
celui du désert reçoivent une horloge — c'est elle qui fait battre leurs faisceaux.

## Mirage Rush : les cavaliers et leurs montures

Le cheval d'origine n'avait ni regard, ni naseau, ni queue : un bloc, une selle et
quatre jambes. Les **douze personnages** (les huit robes de base et les quatre
skins de la boutique) ont maintenant un vrai corps — et tout ce qui pouvait bouger
bouge.

| Où | Quoi |
|---|---|
| Cheval (`mirageExplorer.js`) | yeux (blanc + pupille) et naseaux, museau plus clair, liste sur le chanfrein, oreilles, **crinière en trois mèches** ; poitrail éclairci et arrière-main assombri ; selle complète (tapis, selle, pommeau, **étriers suspendus**, **sacoches** à rabats) ; sabots sombres et balzanes |
| Cavalier | **yeux, bandana remonté sur le nez et nœud dans la nuque** — c'est ce que voit la caméra de course —, quartier de pantalon, éperon au talon, cordon au chapeau |
| Queue | trois mèches dégradées au lieu d'un bâton, puis **quatre mèches étagées** larges à la naissance |
| Seconde passe | joue et ganache, toupet entre les oreilles, **bride complète** (montants, muserolle, frontale), garrot, ventre arrondi, **sangle et poitrail sanglé** à l'anneau ; cavalier : épaules, col, ceinture à boucle et **mains posées sur les rênes**, bras pliés à l'épaule vers l'avant |
| Jambes | deux segments sur **toutes** les montures (cheval, Épona, chocobo) : la cuisse part de la hanche, le genou se plie et le sabot se replie à chaque foulée — au saut, les antérieurs s'étendent et les postérieurs se replient sous le corps |
| Mouvement | la **tête hoche**, les **bras tirent sur les rênes**, le **pan de cape bat** la croupe, la queue balance et les genoux se plient — joueur **et** rivaux, chacun à sa phase |
| Boutique | les vignettes 3D animent la tête, les rênes, les genoux et le pan de cape ; les portraits 2D (`MirageCharacterPortrait`) reçoivent les yeux du cavalier, son bandana, le mors, la rêne et les sabots |

**Aucune couleur n'est ajoutée aux palettes.** Le relief vient de tons *dérivés* de
la robe et des crins (`shadeMaterial` : la même teinte, éclaircie ou assombrie), et
`paintModel` les recalcule quand on change de skin — une robe claire garde son
relief comme une robe sombre. Seuls les yeux sont fixes (un blanc cassé, une
pupille presque noire) : pris dans la palette, ils donneraient des yeux clairs sur
les robes claires, et le cheval perdrait son regard.

**Le détail ne coûte presque rien en appels de dessin.** Les blocs *fixes* d'un
groupe sont soudés par matière (`mergeStaticBlocks`, la même idée que
`bakeStaticScenery` pour le décor), et seules les pièces animées restent des nœuds
à part : la tête, les quatre jambes (cuisse **et** genou), la queue, la cape, le
pan, les bras et le chapeau — celui-ci tombe quand Cloud ou Link prend la selle.
Un seul mesh par matière, donc :

| Skin | Meshes (avant → après) | Triangles (avant → après) |
|---|---|---|
| Alezan (base) | 44 → **48** | 1008 → **1344** |
| Gyro | 58 → **62** | 2056 → **2392** |
| Cloud | 100 → **104** | 1676 → **2012** |
| Link | 149 → **153** | 2226 → **2562** |

Le double de triangles pour quelques appels de dessin de plus : c'est le prix du
regard, de la sellerie et d'un vrai galop. Épona et le chocobo ont le même genou
— un jarret pour l'oiseau coureur, qui replie ses doigts sous lui. Le module 3D reste
**partagé** par les huit cavaliers d'une course — les vignettes de la boutique
réutilisent un unique moteur de rendu hors écran (`mirageSkinRenderer.js`) pour
tous les skins à la fois.

Cloud et Link gardent leur propre tête : le visage du cow-boy (yeux + bandana) est
un groupe à part que leur skin **masque** au lieu de le leur faire porter sous le
leur — et qui revient dès qu'on reprend une robe de base.

### Où vit le code

- `src/games/mirageExplorer.js` — `makeExplorer` (le corps, la tête, la queue, le
  visage, le pan de cape, le chapeau, les bras), `shadeMaterial`, `mergeStaticBlocks`,
  `paintModel` (palette + tons dérivés), `setExplorerAccessories` (`parts.face`) ;
- `src/games/MirageWorld.jsx` — l'animation en course (tête, rênes, genoux, pan de
  cape) pour le joueur **et** pour chaque rival ;
- `src/games/mirageSkinRenderer.js` — les mêmes pièces dans les vignettes de skin ;
- `src/games/mirageTrophyScene.js` — le vainqueur qui salue sur le podium ;
- `src/games/MirageCharacterPortrait.jsx` — le portrait 2D assorti (boutique,
  salon en ligne, coupes).

### Vérifications

```bash
node --test tests/mirage-explorer.test.js tests/mirage-explorer-details.test.js
npm run check:mirage-scoreboard           # les portraits 2D se rendent toujours
npm run build
```

Les tests disent que les yeux, les naseaux, le bandana, les sabots et les genoux
sont là, que Cloud et Link masquent le visage du cow-boy, que les tons dérivés
suivent la palette, que les pièces animées ne sont **jamais** soudées, qu'un genou
plié lève le sabot sans le planter dans la piste — et que le coût du modèle reste
sous son plafond. La silhouette, elle, se juge à l'œil, en jeu.

## Mirage Rush : les coupes et les gains d'or

Quatre coupes (`/jeu/mirage-rush`, bouton **COUPE**) enchaînent des duels sur
des terrains imposés, à quatre cavaliers (trois sur une piste de téléphone à
trois voies). Chaque victoire crédite **10 OR**, sans prime distincte de coupe.
Le maximum théorique dépend du nombre de courses gagnées :

| Coupe | Courses | OR maximum |
|---|---:|---:|
| Coupe du Désert | 3 | **30 OR** |
| Coupe des Vents | 3 parcours différents | **30 OR** |
| Coupe Grand Tour | 4 | **40 OR** |
| Coupe des Légendes | 5 | **50 OR** |

Le meilleur total de points après la dernière course soulève le trophée. Dans
l'aperçu, chaque coupe est un vrai bouton cliquable au relief 3D : son parcours
n'est pas déroulé et le maximum d'OR est mis en évidence. La toucher **démarre la
coupe** (voir « Mirage Rush : une carte = une partie »), et une coupe remportée y
porte un ✓ vert. Le podium distingue
les OR réellement gagnés pendant les courses du maximum théorique de la coupe.

### Où vit le code

- `src/games/mirageCup.js` — catalogue `CUPS`, les maximums `maxCoins` et
  `cupGoldMaximum()` ;
- `src/games/mirageProgression.js` — `WIN_COINS` (10 OR par victoire) et
  `coinsForRun()` ;
- `src/games/MirageRushPage.jsx` — cumul des OR gagnés course par course et
  transmission du total au podium ;
- `src/games/MirageCupTrophy.jsx` — OR réellement gagnés et maximum théorique ;
- `src/games/MirageCoursePicker.jsx` et `src/games/mirage-rush.css` — boutons
  3D des coupes et mise en valeur des gains.

Ajouter une coupe : une entrée dans `CUPS` avec ses terrains, son maximum
(`nombre de courses × 10 OR`) et son design (`mirageTrophy.js`) ; le sélecteur,
l'enchaînement des courses et l'écran du trophée suivent tout seuls.

### Progression de compte et grants administratifs

La progression de Mirage Rush reste disponible hors connexion dans un cache
local distinct par compte. Quand un joueur est connecté, son instantané est aussi
chargé/sauvegardé dans la table privée `mirage_rush_progress`, ce qui permet de
retrouver ses cartes, coupes et OR sur un autre appareil. Les déploiements
existants reçoivent la table et la colonne `profiles.is_verified` en relançant
`supabase/schema.sql`.

Pour un déblocage administrateur ponctuel, appliquez ensuite
`supabase/mirage-account-grants.sql` dans l’éditeur SQL Supabase, puis appelez :

```sql
select public.admin_grant_mirage_rush_access('adresse-du-compte', 'Salim');
```

Le grant ouvre les dix cartes et les quatre coupes, ajoute **5 000 OR** au
solde existant et pose le badge de profil vérifié. La fonction est réservée à
l’administration, protège le badge contre l’auto-attribution et n’ajoute l’or
qu’une seule fois par compte. L’e-mail doit correspondre à un compte déjà
présent dans `auth.users`.

### Vérifications

```bash
node --test tests/mirage-cup.test.js tests/mirage-progression.test.js
npm run check:mirage-cup     # les courses jouées de bout en bout, récompenses et podium
npm run check:mirage-flow    # boutons de coupe, aperçu épuré et maxima annoncés
```

## Vice City Rush : le plein écran

Le jeu (`/jeu/vice-city-rush`) **se lance en plein écran**, avec le même moteur
que Mirage Rush (`gameFullscreen.js` / `useGameFullscreen.js`) : la coque du jeu
occupe tout l'écran dès l'ouverture, et toutes ses étapes — choix du mode, choix
de la ville, garage, cinématiques de l'histoire, compte à rebours, course,
pause, arrivée — s'y tiennent.

| Geste | Effet |
|---|---|
| Ouverture de la page | la coque occupe tout de suite tout l'écran (couche fixe `is-immersive`, sans geste) ; le plein écran natif, que le navigateur exige dans un geste, part au **premier clic ou à la première touche** du joueur |
| Bouton **PLEIN ÉCRAN** de la barre du jeu | ouvre ou ferme, à tout moment (intro, cinématique, course, pause, arrivée) |
| Touche **F** | ouvre ou ferme (Ctrl/Cmd/Alt + F restent au navigateur ; un « f » tapé dans un champ de saisie ne fait rien) |
| **Échap**, ou le geste « retour » d'Android | le navigateur referme le plein écran : la course se met **en pause** ; **REPRENDRE** rend l'écran quitté — la course, ou le compte à rebours |
| Lancement d'une course (téléphone, application) | le plein écran natif est demandé dans le geste (`opensFullscreenOnLaunch()`) ; cette ouverture automatique se referme à l'arrivée, la page reprend sa forme |

- **Plein écran de base.** La couche fixe (qui couvre tout le viewport) est posée
  au montage de la page, et le choix est « épinglé » : le jeu ne le referme pas
  de lui-même — il reste en changeant d'écran, en passant d'une ville à l'autre,
  pendant la course et à l'arrivée, jusqu'à ce que le joueur le quitte (bouton de
  la barre, touche F, Échap ou geste « retour » du navigateur).
- **Deux couches, comme Mirage.** Le plein écran natif (Fullscreen API, préfixe
  WebKit compris ; dans l'APK, la WebView le prend en charge) et la couche fixe,
  la classe `is-immersive`, qui règle la mise en page. Quand l'API manque ou
  refuse (iPhone, `iframe` sans `allowfullscreen`), la couche fixe seule suffit
  pour jouer. Le verrou de défilement est le même que celui de Mirage
  (`game-immersive-lock`).

### Où vit le code

- `src/games/gameFullscreen.js` et `src/games/useGameFullscreen.js` — le moteur
  partagé (voir « Mirage Rush : le plein écran ») ;
- `src/games/ViceCityRushPage.jsx` — le plein écran au montage, la demande au
  premier geste, la touche F, la pause sur une sortie du navigateur
  (`pauseRace` / `resumeRace`, qui rendent le compte à rebours ou la course) et
  le bouton de la barre ;
- `src/games/vice-city-rush.css` — `.city-rush-shell.is-immersive`,
  `body.game-immersive-lock` et le bouton `.city-rush-fullscreen-button`.

### Vérifications

```bash
npm run check:vice-city-fullscreen   # la page dans jsdom (moteur 3D doublé), Fullscreen API simulée
```

La vérification remplace le moteur 3D par une doublure
(`scripts/vice-city-world-stub.jsx`) et la Fullscreen API par une doublure qui
répond comme un navigateur (elle sait aussi refuser, attendre, ou fermer « de
l'extérieur » comme Échap). Elle ne dit rien du rendu réel : pour cela, ouvrir le
jeu dans un vrai navigateur (`npm run dev`) et le passer en plein écran sur un
grand écran.

## La Cendre : paysage et manette tactile

Le jeu (`/jeu/la-cendre`) **se lance en paysage sur téléphone et dans
l'application**, et se joue au doigt : **stick à gauche, boutons à droite**.
Sur ordinateur, rien ne change — clavier et souris gardent la main.

| Geste | Effet |
|---|---|
| Ouverture de la page (téléphone, application) | l'écran se couche : l'activité Android est couchée par le pont (`setGameOrientation('landscape')`), puis le navigateur demande le verrou de paysage dès le montage, et le rejoue à l'entrée en plein écran (Chrome Android n'honore `screen.orientation.lock()` qu'en plein écran ou dans une application) |
| Téléphone tenu debout | l'écran **« TOURNEZ VOTRE APPAREIL »** se montre par-dessus le jeu, qui se met en pause ; **JOUER QUAND MÊME** le tait pour la session (le jeu reste jouable, en portrait) |
| **ENTRER DANS LA BRAISE** | demande le paysage dans le geste, ouvre le plein écran natif, et pose la manette |
| **STICK** (bas gauche) | déplacement ; pousser à fond fait courir le chevalier (deux vitesses : marche lente, course) |
| **⚔ FRAPPE / ⚒ LOURDE / ⟳ ROULADE** | attaque légère, attaque lourde, roulade (le gros bouton, sous le pouce droit) |
| **◎ VERROU / ✦ AGIR / ⚗ POTION** | verrouillage de cible, action (coffre, portail, feu de camp), potion de vie |
| **❚❚ PAUSE** (barre du jeu) | met en pause ; la pause propose les **montées de niveau** au doigt (VIT / END / PUI) |
| Glisser le doigt sur la scène | tourne la caméra (hors manette), sans voler le geste du stick |
| Quitter la page | rend son orientation au téléphone (pont `auto`, verrou relâché) |

- **La manette ne recouvre rien.** Le stick et les boutons se posent dans les
  coins bas, sous la barre de vie et la barre du jeu ; les invites écrites
  s'adaptent au doigt (`✦ AGIR · ouvrir le coffre` au lieu de `E · ouvrir le
  coffre`), et aucune pastille « cliquez pour capturer la souris » ne s'affiche
  sur un écran tactile.
- **Rien n'est deviné.** L'écran est reconnu tactile par `matchMedia('(pointer:
  coarse)')` ; le jeu d'ordinateur n'affiche ni manette, ni écran de rotation, ni
  verrou d'orientation, et garde le plein écran au bouton de la barre.

### Où vit le code

- `src/games/gameLandscape.js` — le module d'orientation (pur, sans React) :
  lecture du paysage, verrou navigateur (`screen.orientation.lock` et ses
  préfixes, sans jamais lever), pont Android, ordre « pont puis verrou » ;
- `src/games/useGameLandscape.js` — le crochet React (`isTouch`,
  `landscapeDevice`, `portrait`, `showRotationPrompt`, `request` / `release` /
  `dismissRotation`, rejeu du verrou sur `fullscreenchange`) ;
- `src/games/soulsTouch.js` — la géométrie du stick (zone morte, course à
  partir de 82 %, deux allures) et les liaisons DOM (`attachStick`,
  `attachLookPad`) ;
- `src/games/SoulsTouchControls.jsx` — la manette à l'écran (stick à gauche,
  six boutons à droite), qui parle au moteur par `onMove` / `onAction` ;
- `src/games/SoulsWorld.jsx` — le moteur reçoit `touchMove`, `touchAction`,
  `touchReset` et mêle le stick au clavier (une touche tenue l'emporte) ;
- `src/games/SoulsPage.jsx` — le lancement, l'écran de rotation, la pause et
  les montées de niveau au doigt ;
- `src/games/souls.css` — la couche plein écran, la manette, l'écran de
  rotation et les boutons de niveau ;
- `android/app/src/main/java/dz/letsplay/officiel/MainActivity.java` — le pont
  `setGameOrientation('landscape' | 'auto')` (l'activité passe en
  `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`, puis reprend l'orientation du
  téléphone en quittant la page ; le manifeste n'est volontairement pas épinglé,
  pour que le reste du site suive le téléphone).

### Vérifications

```bash
node --test tests/souls-touch.test.js tests/souls-landscape.test.js   # la géométrie et l'orientation (pur)
npm run check:souls-mobile    # la page dans jsdom (moteur 3D doublé), téléphone simulé
```

Le calcul du stick et le module d'orientation se testent sans navigateur
(`tests/souls-touch.test.js`, `tests/souls-landscape.test.js`). La vérification
de la page remplace le moteur 3D par une doublure (`scripts/souls-world-stub.jsx`)
et simule un téléphone (écran étroit, `(pointer: coarse)`, verrou d'orientation,
pont Android, plein écran) : elle déroule le lancement, la manette, les envois au
moteur, la pause et la sortie de page, puis vérifie qu'un ordinateur ne voit
rien de tout ça. Elle ne dit rien du rendu réel : pour cela, ouvrir le jeu dans
un vrai navigateur (`npm run dev`), ou l'APK sur un téléphone, et le coucher.

## Vice City Rush : les tours, ligne de départ et décor

Le jeu (`/jeu/vice-city-rush`) est une course d'arcade à quatre voies dans cinq
villes (Vice City, New York, Tokyo, Paris, Londres). La ville est une boucle de
**600 m** qu'on reparcourt, et l'on repasse **sous le portique de départ à
chaque tour**. Les courses sont longues, et **le dernier tour est le plus long
de tous : 1 200 m, deux boucles d'une traite**, soit deux fois un tour ordinaire.
C'est aussi celui où la police entre en piste. **Tokyo se joue sur la Shuto
Expressway Route 1** — la C1 首都高速都心環状線, l'anneau intérieur réel de
14,8 km autour du palais impérial, dans le sens 内回り : chaque boucle de 600 m
rejoue la boucle officielle secteur par secteur (voir « Tokyo : la C1 » plus bas).

| Mode | Tours | Distance | À 29 m/s, sans incident |
| --- | --- | --- | --- |
| Circuit, Poursuite | 4 | 3 000 m (3 × 600 m, puis 1 200 m) | ≈ 1 min 43 |
| Sprint | 1 | 1 200 m (le grand tour seul) | ≈ 41 s |
| Histoire, chapitres 1 à 5 | 4 | 3 000 m | ≈ 1 min 43 |
| Histoire, chapitre 6 « Le dernier tour » | 5 | 3 600 m (4 × 600 m, puis 1 200 m) | ≈ 2 min 04 |

Le trafic, les tirs et la police ralentissent les courses réelles (le pilote
d'essai du smoke met 10 à 15 % de plus que ces temps), tandis que le bonus de
« ligne propre » (jusqu'à +12 % en tenant sa voie) les raccourcit. Avant ce
réglage, une course ne comptait que 1 à 3 tours de 600 m (1 min 02 en Circuit)
et le dernier tour durait 21 s.

- **La zone de départ.** Grille peinte au sol avec les quatre emplacements,
  ligne à damier, vibreurs rouge et blanc, tribunes garnies de spectateurs qui
  s'agitent, fanions, mâts d'éclairage, tour de direction de course, et un
  **portique** qui porte le panneau *DÉPART · ARRIVÉE*, le tableau de tour
  (« TOUR 1/4 », puis « TOUR 4/4 · DERNIER TOUR », puis « PLUS QUE 600 M » au
  passage du milieu du dernier tour) et les **cinq feux**
  du compte à rebours (3 → 2 → 1 → vert). Un commissaire agite le drapeau au
  passage, les flashs des tribunes crépitent, les confettis tombent à l'arrivée.
- **Les tours.** Chaque passage de ligne déclenche la bannière « LIGNE FRANCHIE
  · TOUR 2/4 » (puis « DERNIER TOUR » en doré), la carte TOUR du HUD avance, les
  rivaux annoncent leur dernier tour. Le dernier passage termine la course.
- **Le grand dernier tour.** Il fait `CITY_RUSH_FINAL_LAP_LOOPS` = **2** boucles
  (1 200 m, `CITY_RUSH_FINAL_LAP_LENGTH`). Le portique est fixe dans le décor,
  donc on le recroise **au milieu du dernier tour** : ce n'est qu'un **point de
  passage** — bannière « PLUS QUE 600 M · ce n'est pas encore l'arrivée »,
  tableau « PLUS QUE 600 M », cloche — sans confettis, sans nouveau tour et sans
  arrivée. La jauge du dernier tour court sur ses 1 200 m (elle ne retombe pas à
  zéro au portique), le suivi de tour du HUD donne au dernier segment deux fois
  la largeur des autres, et la liste des positions (`CityRushRaceList`, prop
  `laps`) affiche « T3/4 » sur la course en cours.
  `cityRushLineKind(ligne, tours)` dit ce que vaut chaque ligne (`'lap'`,
  `'checkpoint'`, `'finish'`), `cityRushRaceDistance(tours)` donne la distance
  totale et `cityRushLapLength(tour, tours)` la longueur d'un tour. Une ligne
  n'est annoncée qu'une fois : un choc frontal qui recale le joueur derrière le
  portique ne fait pas sonner la cloche une seconde fois quand il le repasse.
  **Pour régler la longueur** : le nombre de tours est `laps` dans
  `RACE_MODES` (Circuit, Sprint, Poursuite), `STORY_LAPS` et `STORY_FINALE_LAPS`
  (Histoire) dans `ViceCityRushPage.jsx` ; la longueur du dernier tour est
  `CITY_RUSH_FINAL_LAP_LOOPS` dans `cityRushRules.js` (`1` redonne un dernier
  tour ordinaire). La boucle de 600 m elle-même ne bouge pas : le décor, le
  portique et les tests en dépendent. Les chronos sont rangés sous
  `letsplay_vice_city_rush_bests_v2` : les records des anciennes courses, plus
  courtes, n'auraient jamais pu être battus.
- **L'escouade de police du dernier tour.** Dès que le **premier du classement**
  attaque le dernier tour — **1 200 m sous la sirène**, soit deux fois plus qu'à
  l'origine —, **trois berlines d'interception entrent en piste juste derrière
  lui** (30 m, 38 m et 46 m, sirène allumée) et roulent pour lui nuire : elles
  changent de voie pour **rafler en priorité les bonus rouges (mitrailleuse) et
  jaunes (hélicoptère)** — un bonus de tir vaut cinq bonus ordinaires dans leur
  choix (`CITY_RUSH_POLICE_HUNT_TYPES`,
  `chooseCityRushPoliceLane`) — et **ouvrent le feu sur le leader**. Elles
  **entrent armées** : le tir droit (bleu) et la mitrailleuse (rouge) sont
  chargés dès l'entrée en piste, seul l'hélicoptère (jaune) reste à voler
  (`CITY_RUSH_POLICE_START_CHARGES`, `createCityRushPoliceInventory`) ; la
  berline tire la rafale rouge dès que son client est devant elle, et le tir
  bleu couvre le temps de recharge du rouge. Elles **ne sont pas classées** : `rankCityRushRacers`
  ne les voit jamais, la grille reste à quatre, et le HUD les affiche à part
  (`hud.police`, marqueurs rouge et bleu de la mini-carte). La même escouade
  opère sur les cinq circuits. Elle choisit les voies dégagées
  et évite le trafic lent (`isCityRushPoliceLaneJammed`) ; si elle est malgré
  tout bloquée, elle heurte le véhicule lent comme un rival : **0,6 s de
  ralentissement et un dérapage**, puis le trafic se rabat (`blockedBy`,
  `resolveCityRushPoliceMovement`, `applyTrafficImpact`), sans bandeau « choc ».
  Le changement de voie est calculé à la position de la berline, pas à celle du
  joueur. En dernier tour, une rafale rouge ou un missile jaune peut riposter
  contre la berline la plus proche quand aucun rival n'est devant ; le tir bleu
  fait pareil : voie libre devant, il part vers l'arrière contre la berline la
  plus proche de sa voie (`cityRushStraightShotRetaliation`), et en vol il
  balaie le segment de voie parcouru, donc une berline qui se rabat devant la
  balle l'encaisse même sans verrou (`cityRushStraightShotSweptHit`,
  `CITY_RUSH_POLICE_*`, `cityRushRules.js`). **Les berlines sont
  destructibles.** Chacune porte une barre de vie au-dessus du toit (reprise
  sur les pastilles de la mini-carte) : **trois tirs droits bleus (2 points
  chacun), OU deux rafales rouges (3 points chacune), OU un tir d'hélicoptère**
  la détruisent
  (`CITY_RUSH_POLICE_HEALTH = 6`, barème pur `cityRushPoliceDamage`, et
  `cityRushPoliceShotsLeft` pour le bandeau « encore deux tirs bleus »). À la
  destruction : explosion complète, retrait immédiat de la course et de la
  mini-carte, **+200 pts** pour le pilote qui l'abat
  (`CITY_RUSH_POLICE_DESTROY_SCORE`), et la sirène s'éteint quand la dernière
  berline explose. La berline du trafic rappelée par un contact est
  destructible comme l'escouade ; à la course suivante, le trafic repart au
  complet.
- **Les bonus.** Quatre types de ramassages colorés remplissent quatre jauges :
  **bleu 2** (pistolet à tir droit), **rouge 3** (mitrailleuse), **vert 2**
  (boisson énergisante / boost), **jaune 4** (talkie-walkie / hélicoptère) —
  `CITY_RUSH_POWER_CHARGE_COST` dans `cityRushRules.js`. Le jaune est rare : il
  ne représente que **10 % des bonus** (vert 36 %, bleu 28 %, rouge 26 %).
  Le tir bleu ne vise pas : il suit la voie du tireur, peut toucher au plus un
  adversaire déjà visible, puis fait déraper sa voiture et la ralentit à 85 %
  pendant **0,3 s**. Il atteint les berlines de police de trois façons :
  verrouillé sur celle qui roule devant dans sa voie, **en riposte vers
  l'arrière** sur la plus proche déjà dépassée quand la voie est libre devant,
  et **par balayage** sur toute berline qui se rabat devant le projectile en
  vol. La mitrailleuse rouge prend le rival le plus proche devant
  le pare-chocs ; l'hélicoptère verrouille le rival le mieux placé devant son
  pilote (`cityRushIsAhead` + `CITY_RUSH_FORWARD_TOLERANCE`, un mètre de
  tolérance pour une voiture roue contre roue). En dernier tour, si aucun rival
  n'est devant, les jauges rouge et jaune peuvent viser la berline de police la
  plus proche, y compris derrière le pilote. Sans rival ni police-cible, la
  jauge jaune reste chargée et le HUD l'indique. Un bonus ramassé
  **éclate** : flash, anneau qui s'ouvre et éclats de sa couleur repris par la
  gravité (`cityRushPickupBurstShards` / `cityRushPickupShardState` /
  `cityRushPickupFlashState`, rendus par un pool de six objets dans
  `ViceCityWorld.jsx`, sans éclats si `prefers-reduced-motion`), puis
  **réapparaît 0,1 s** plus tard sur sa voie en gonflant depuis son socle
  (`CITY_RUSH_PICKUP_RESPAWN_DELAY`, `markCityRushPickupTaken` /
  `isCityRushPickupHidden`, `cityRushPickupPopScale`), afin que les voitures
  suivantes puissent le ramasser à leur tour.
- **Le décor.** Chaque ville a sa boucle : façades texturées (fenêtres allumées,
  enseignes verticales, boutiques), porte monumentale à mi-tour (arche Art déco,
  **portique d'échangeur de la Shuto**, torii, arc de triomphe, Tower Bridge),
  monument, lampadaires, guirlandes, feux tricolores, panneaux qui clignotent,
  ciel dégradé avec étoiles, skyline au loin, pluie à Londres et bruine à New
  York. Tokyo fait exception : **ni rue ni trottoir**, mais un tablier de viaduc
  treize mètres au-dessus de la ville (`theme.expressway` → `shutoC1Stage.js`).
- **Vice City en plein jour.** Le stage de Vice City se joue **de jour, ambiance
  plage** : ciel bleu de Floride, soleil haut (ni étoiles ni lune), brume marine
  claire, sable au sol, trottoirs crème, façades Art déco pastel et vitres qui
  renvoient le ciel, palmiers, parasols, planches de surf, poste de
  maître-nageur et douche de plage. Tout passe par `theme.daylight` +
  `theme.beach` (`cityRushThemes.js`) : les enseignes deviennent presque mates
  (`glow`), les halos de lampadaires et les faisceaux du portique s'éteignent,
  les phares volumétriques des voitures sont coupés (`makeRacerCar({ daylight })`)
  et l'éclairage est résolu par `cityRushLightRig` (soleil 3,2, hémisphère
  ciel/sable, exposition 1,02, phares 0). **Les quatre autres villes gardent
  leur ambiance nocturne inchangée** : sans bloc `light`/`materials`, les valeurs
  d'origine s'appliquent. L'accroche de l'écran d'accueil suit l'ambiance du
  circuit choisi (« LE SOLEIL PREND LA ROUTE. » à Vice City, « LA NUIT… »
  ailleurs), et la vignette `public/vice-city-rush-thumb.svg` comme la carte de
  la page Jeux montrent désormais la plage en plein jour.
- **Tokyo : la C1, anneau intérieur de la Shuto.** Le circuit de Tokyo suit la
  **Route 1 都心環状線** telle qu'elle existe : 14,8 km, trois voies par sens,
  limité à **50 km/h**, kilomètre zéro au **pont de 日本橋**, sens de la course
  **内回り** (anti-horaire). `CITY_RUSH_SHUTO_C1` (`cityRushRules.js`) découpe
  l'anneau en **quinze secteurs** portant chacun son point kilométrique officiel,
  sa nature et son côté réel : 江戸橋JCT → 神田橋 → **竹橋JCT** (le grand
  balayage) → **北の丸トンネル** (700 m) → **千代田トンネル** (1 900 m, le plus
  long, 危険物通行禁止) → la **tranchée de 霞が関** avec le **谷町JCT** (km 8,0,
  la porte de mi-tour du jeu) → 飯倉 → **芝公園** (la Tokyo Tower à gauche,
  km 5,4) → **浜崎橋JCT** (le Rainbow Bridge et la baie à droite) → 汐留JCT →
  **汐留トンネル** (700 m, LED) → **銀座** (panneaux à gauche) → **新富町** (les
  piles de l'ancienne 築地川 montent entre les files, d'où les lignes jaunes et
  l'interdiction de changer de voie) → 京橋JCT → **宝町** et son péage ETC. Le
  décor (`shutoC1Stage.js`) construit le tablier et ses murets New Jersey, les
  glissières galvanisées, les murs antibruit translucides, la **forêt de piles**
  treize mètres plus bas, les **tours de Shiodome et de Ginza**, le **palais
  impérial à gauche** (douves, murs de pierre, pins, toitures de Kitanomaru),
  les rivières franchies (日本橋川, 神田川, 築地川), les **bretelles d'échangeur
  qui enjambent l'anneau** avec leurs balises aviation, les **trois tunnels**
  (parois carrelées, bandeaux sodium ou LED, niches de secours, portails avec
  plaque de longueur), la **tranchée ouverte** avec ses ponts de surface, un
  **portique vert par secteur** (sorties numérotées, badge C1, romaji), la
  plaque du **道路元標** au kilomètre zéro, les postes kilométriques (qui
  décroissent de 14 à 0 en 内回り), les téléphones de secours 非常電話, les
  panneaux à message variable **道路情報板** qui redessinent l'état du trafic
  toutes les trois secondes, et les deux repères de la légende : **Tokyo Tower**
  et **Rainbow Bridge**. Le tablier et la ville d'en dessous sont des rubans
  courbés chaque image sur la ligne centrale du circuit, et le décor fusionné
  est tronçonné puis cintré une fois (`bendAware`, `bendLoopGeometry`) pour
  suivre les mêmes S et le même relief que la chaussée. Sous les voûtes, le
  monde s'adapte (`shutoC1CoverAt` dans `ViceCityWorld.jsx`) : la pluie
  s'arrête, les phares montent, le brouillard se resserre à 96 m et l'exposition
  baisse ; le HUD affiche la **plaque verte** du secteur, du point kilométrique
  et de la prochaine jonction (`shutoC1Readout`, position sur la boucle et non
  progression du grand dernier tour). `cityRushMinimapTrackShape` et les
  `routeTicks` de `buildCityRushMinimapState` exposent en plus le vrai anneau et
  ses échangeurs aux interfaces qui veulent les dessiner.
- **Les voitures.** Cabriolets et rivaux modélisés (phares, feux arrière,
  flammes de turbo, roues qui tournent et se braquent, roulis et tangage selon
  la conduite, fumée au démarrage et dans les dérapages) ; le trafic (police,
  ambulance, camion-poubelle, Lamborghini blanche) a ses gyrophares et ses
  décalcomanies. Les cabriolets sont **décapotés et leurs pilotes ont le visage
  à l'air** (voir « Les pilotes dans le cockpit » plus bas) : plus un seul
  casque intégral dans la course, chaque tête est celle de l'avatar du pilote
  choisi.
- **La caméra.** Orbite autour de la grille pendant l'intro, travelling qui se
  recule pendant le compte à rebours, poursuite pendant la course (le champ
  s'élargit en turbo, l'image tremble sous un missile), tour d'honneur à
  l'arrivée. La caméra passe à 6,6 m : tout élément qui enjambe la route doit
  rester au-dessus de 7,1 m (voir `cityRushStage.js` et `cityRushStartLine.js`).
- **Le son.** Musique **disco** de synthé (une boucle de huit mesures, un tempo
  par ville) et bruitages écrits en Web Audio, sans aucun fichier : moteur à
  cinq rapports qui suit la vitesse, coup de feu, dérapage des pneus quand une
  voiture encaisse un tir, rotor d'hélicoptère, missile et explosion. Bouton
  SON (touche M) pour tout couper ; voir « La bande-son » plus bas.
- **Téléphone / APK.** Mode allégé automatique (pointeur grossier ou
  `window.LetsPlayAndroid`) : pas d'ombres, moins de spectateurs et de pluie,
  définition plafonnée. Le décor est fusionné par matériau (quelques dizaines
  d'appels de rendu pour toute une ville).

### Où vit le code

- `src/games/cityRushRules.js` — règles pures : tours, longueur, classement,
  objets, IA (`cityRushLapForDistance`, `cityRushLapCrossings`,
  `cityRushLapProgress`, `cityRushRaceDistance`, `cityRushLineKind` pour le
  grand dernier tour, `cityRushTrackGap` pour replier la boucle devant la
  caméra, `cityRushTrackOffset`/`Elevation`/`Yaw`/`Pitch` pour la ligne centrale
  courbée du rendu), **données de la Shuto C1** (`CITY_RUSH_SHUTO_C1`,
  `shutoC1SectorAt`, `shutoC1KmAt`, `shutoC1CoverAt`, `shutoC1NextJunction`,
  `shutoC1Readout`) et **silhouette officielle de l'anneau**
  (`cityRushMinimapTrackShape`, `routeTicks`) ;
- `src/games/cityRushThemes.js` — palette, ciel, météo, enseignes de chaque
  ville, plus l'éclairage (`theme.light` résolu par `cityRushLightRig`, repli
  nocturne `CITY_RUSH_NIGHT_LIGHT`) et les matières en plein jour
  (`theme.materials`, `theme.glow`, `theme.ground`, `theme.skyline`) ;
- `src/games/cityRushBuilder.js` — fusion des géométries par matériau, textures
  canvas, atlas d'enseignes (dont `drawShutoSignCell`, la cellule verte des
  panneaux Shuto) ; `src/games/cityRushTextures.js` — façades, route,
  trottoirs, panneaux, tableau de tour, plaques, et les matières de la voie
  rapide (tablier, ville en dessous, paroi de tunnel, mur antibruit, béton de
  viaduc, skyline de la baie de Tokyo) ;
- `src/games/cityRushStage.js` — la boucle d'une ville (façades, portes,
  monuments, accessoires animés, rubans de chaussée courbés, ciel, skyline,
  pluie) et le cintrage du décor fusionné (`bendLoopGeometry`) ;
- `src/games/shutoC1Stage.js` — la boucle **voie rapide** de Tokyo : tablier de
  viaduc, tunnels, tranchée, échangeurs, portiques verts, mobilier de la Shuto,
  Tokyo Tower et Rainbow Bridge (`buildShutoExpressway`, `makeExpresswayRoad`,
  `buildShutoSignAtlas`, `createExpresswayMaterials`), activée par
  `theme.expressway` ;
- `src/games/cityRushStartLine.js` — la zone de départ (statique) et ses parties
  animées (feux, tableau, drapeaux, foule, flashs, confettis, commissaire) ;
- `src/games/cityRushCars.js` — voitures des pilotes (et leurs **pilotes à
  visage découvert**, voir « Les pilotes dans le cockpit »), trafic, fumée ;
- `src/games/cityRushAudio.js` — la bande-son (musique disco, moteurs, tirs,
  dérapages, hélicoptère, explosions) ;
- `src/games/ViceCityWorld.jsx` — le monde three.js (phases, caméra, course,
  passages de ligne, environnement de tunnel de la C1) ;
  `src/games/ViceCityRushPage.jsx` et `src/games/vice-city-rush.css` — la page,
  le HUD (carte TOUR, bannière de tour, plaque de signalisation de la route,
  liste des pilotes) ;

### Les pilotes dans le cockpit

Les cabriolets sont **décapotés** : le pilote s'y voit de la caméra de poursuite,
et son visage y est plus intéressant qu'un casque. **Le casque intégral a donc
disparu** — plus un seul `helmet` n'est construit par `makeRacerCar` (le smoke
échoue même s'il en trouve un). À la place, chaque cabriolet reçoit **le pilote
de sa fiche** : `makeRacerCar(profile, { driver })`, où `driver` est l'entrée du
catalogue (`CITY_RUSH_DRIVERS`) déjà choisie pour la course (le joueur peut
changer de pilote au garage ; les deux rivaux ont le leur). Le pilote de la
piste est donc **exactement l'avatar de la fiche** : peau (`avatar.skin`),
cheveux (`avatar.hair`), **la coiffure parmi les douze du catalogue** (`spiky`,
`curly`, `bob`, `locs`, `braids`, `afro-curls`, `neon-bangs`, `swept`,
`headband`, `cap-back`, `short-fade`, `wavy-long`) et **l'accessoire** (`cyber-visor`,
`aviator-gold`, `retro-amber`, `cat-eye`, `mirror-shades`, `french-beret`,
`gold-shield`, `neon-headset`, `glacier-glass`, `octagon-gold`, `sport-visor`,
`palm-shades`), rendu en volume : visière d'un seul tenant teintée de la couleur
du pilote, lunettes rondes ou dorées, pointe de chat, béret posé de travers,
casque audio avec son micro. La **combinaison** reprend la tenue de l'avatar,
assagie vers le bleu de course, avec harnais, ceinture, gants, et un **col
sombre** qui sépare la tête du buste.

- **Un vrai visage, pas une boîte.** Crâne, mâchoire, nez, oreilles, yeux
  (blanc + pupille), sourcils et bouche sont sculptés dans le modèle de tête,
  qui est **légèrement agrandi** (1,12) : c'est la taille d'arcade qui rend le
  visage lisible à la distance de la caméra — c'était le rôle du casque, très
  gros, avant.
- **Peint par sommet, pas par matériau.** Les dix couleurs du pilote (peau,
  cheveux, accent, combinaison, gants, visière, verre, blanc et noir des yeux,
  bouche) sont des **couleurs par sommet** (`cityRushBuilder` les accepte comme
  pour les roues) : trois meshes suffisent (buste, tête, chaque bras), et la
  voiture garde **une trentaine de meshes** — moins que du temps du casque et de
  ses matériaux séparés. Le smoke vérifie le budget (600 meshes visibles) sur
  les cinq villes.
- **La tête et les bras vivent.** La tête reste sur son pivot animé (elle
  regarde dans le virage, tremble sous les chocs et les frappes, respire au
  ralenti) et **les deux bras** — épaule, manche, gant — sont des pivots qui
  vont chercher le volant : le coup de volant fait avancer une épaule et
  reculer l'autre, un choc fait encaisser les deux. Le **volant** gagne un
  **repère de sommet** aux couleurs de la voiture, pour que le coup de volant se
  lise.
- **L'habitacle n'est plus vide** : la banquette passager porte un sac de bord.
- **Changer de pilote au garage change la tête dans le cockpit.**
  `setRacerDriver(car, driver)` refait le buste, la tête et les bras aux
  couleurs du nouvel avatar — le matériau peint par sommet est réutilisé et les
  anciennes géométries libérées, donc rien ne s'accumule. `applyRoster` du monde
  l'appelle pour les trois voitures dès que la liste des pilotes change en cours
  de monde (`setRoster`, le bouton « CHANGER PILOTE » du garage), sans quoi la
  voiture du joueur garderait le visage du premier pilote de la partie. Le smoke
  le vérifie : en pleine intro, il change la liste et exige que les trois
  cockpits aient suivi.
- **Les couleurs viennent de la fiche** : `cityRushHexColor` /
  `cityRushDriverColor` (`cityRushRules.js`) convertissent les `#rrggbb` de
  l'avatar en entiers three.js (forme courte `#abc` comprise, repli sûr). Sans
  pilote — un appelant qui n'en passe pas —, le modèle retombe sur
  `profile.driverColor`.

### La bande-son

Tout est **synthétisé en Web Audio** (`src/games/cityRushAudio.js`) : aucun
fichier à charger, donc rien à attendre au premier tour de roue et pas un octet
de plus dans le bundle. Une seule classe, `CityRushAudio`, sur le modèle de
`arcadeAudio.js` (Mirage Rush).

- **La musique.** Un disco de synthé joué par un séquenceur : grosse caisse à
  quatre temps, charleston en croches avec ouverture sur le dernier temps,
  claquement sur les temps 2 et 4, basse qui saute d'octave, stabs de cuivres
  sur les contretemps, nappe de cordes tenue une mesure, et une mélodie qui
  n'entre qu'aux mesures 5 à 8 de la boucle. Progression Dm7 · G7 · Cmaj7 · Am7,
  huit mesures, un tempo par ville (Vice City 122, Paris 118, Tokyo 132).
- **Les moteurs.** Un nœud permanent (trois oscillateurs + bruit de
  roulement + trémolo) dont on ne fait bouger que la fréquence et le volume :
  **cinq rapports**, le régime remonte dans chacun puis retombe au passage de
  vitesse, le turbo le monte de 14 %. Le monde l'appelle à chaque image
  (`speed`, `throttle`, `boost`) — le HUD, émis toutes les 120 ms, serait trop
  saccadé. Les valeurs sont quantifiées (128 crans) pour ne pas empiler
  d'automations à chaque frame.
- **Les bruitages.** Coup de feu (claquement, corps, écho entre les façades),
  **dérapage** quand une voiture encaisse un tir — pneus dans un filtre très
  sélectif et sifflement qui tremble, joué à l'impact —, son de dérapage plus
  doux pour le tir bleu et les zones de ralentissement, **hélicoptère** (pales
  hachées par un LFO + turbine qui monte en régime, démarrage sur l'approche,
  extinction après l'explosion),
  missile qui part, **explosion** (descente dans le grave, souffle, débris,
  écho), **sirène de l'escouade de police** (deux tons qui alternent, tenus par
  un LFO carré — l'aller-retour « hi-lo » des berlines américaines — et une
  deuxième voix désaccordée qui fait battre la sirène ; le niveau suit la
  proximité de la berline la plus proche, `policeSiren({ level })`, et
  `policeSirenOff()` éteint les nœuds), plus les bips de ramassage, les feux de
  départ, les passages de ligne et la fanfare d'arrivée. Chaque bruitage est **panoramiqué** selon la voie de
  la voiture concernée (`vehiclePan`).
- **Le bouton SON** de la barre du jeu (touche **M**) : un interrupteur
  `aria-pressed`, mémorisé dans `localStorage`
  (`letsplay_vice_city_rush_sound_v1`), comme le bouton de Mirage Rush. Coupé,
  plus aucun nœud n'est programmé. La musique se met aussi en sourdine quand
  l'onglet passe en arrière-plan et s'arrête au retour à l'écran d'accueil.

### Vérifications

```bash
npm run check:city-rush          # règles pures (tours, repli, classement, objets, éclatement des bonus, voies de l'escouade) + thèmes (plein jour de Vice City, rigueur lumière des cinq villes)
npm run check:city-rush-audio    # bande-son : tempo des villes, partition disco (grosse caisse, refrain en mesure 5), régime moteur, bruitages, pause et coupure
npm run check:city-rush-cars     # les cabriolets et leurs pilotes : plus de casque, têtes des douze avatars, cheveux de l'avatar, animation tête/bras, budget de meshes
npm run check:city-rush-smoke    # les cinq villes : construction du monde, course complète de 5 tours (3 600 m, dernier tour de 1 200 m) sans exception, éclatements visibles
npm run check:city-rush-blue-shot # tir bleu × berlines : le pilote d'essai ne tire qu'au tir droit et doit abîmer des voitures de police devant lui, en riposte vers l'arrière, et par balayage
npm run check:vice-city-fullscreen # la page dans jsdom : plein écran de base, natif au premier geste, bouton / F, pause sur sortie du navigateur
```

Le smoke remplace `WebGLRenderer` par une doublure et pompe la boucle d'animation
à 30 Hz avec un pilote naïf (5 tours par défaut, la course la plus longue ;
`CITY_RUSH_SMOKE_LAPS=4 npm run check:city-rush-smoke` joue un Circuit de
3 000 m) : il vérifie les passages de ligne (début des tours
2 à 5, puis le point de passage du grand dernier tour, une seule fois), le
compteur du dernier tour (il court sur 1 200 m sans retomber à zéro au
portique), l’arrivée après 3 600 m, le HUD, le nombre de meshes affichés, la
visibilité des éclatements de bonus et le rejeu après `reset()`. Il vérifie
aussi l'**escouade de police** : une seule entrée en piste, trois berlines
arrivées derrière le leader (jamais devant, jamais à plus de 140 m) **et armées
bleu et rouge — jamais jaune**, qui
rejoignent le leader à moins de 30 m, **restent dans son sillage** sur chaque
circuit (au moins la moitié du dernier tour à moins de 60 m du leader, jamais
plus de 200 m de retard — seuils calibrés sur plus de 700 courses de 1 200 m de
dernier tour, avec une large marge),
ne figurent ni dans le classement du HUD ni dans le tableau d'arrivée,
disparaissent à la ligne et font sonner puis éteindre leur sirène. Il ne dit rien
du rendu réel : ouvrir le jeu dans un vrai navigateur (`npm run dev`) pour juger
l'image.

Le monde reçoit aussi une **fausse bande-son** qui ne fait que compter les
appels : une course complète doit piloter le moteur à chaque image, sonner les
quatre feux, chaque passage de ligne (point de passage compris) et la fanfare,
et **éteindre chaque hélicoptère démarré** (un rotor oublié s'entendrait jusqu'à
la page d'accueil). Les compteurs sont imprimés à la fin de chaque ville.

## Barre de navigation : le logo et le menu « Jeux »

Deux choses à savoir avant de toucher à la barre (`src/components/Layout.jsx`,
et les règles `.nav-*` de `src/styles.css`).

- **Le logo n'est jamais écrasé.** `public/lets-play-logo.png` est un lockup
  empilé (« Let's » au-dessus de « Play ») de **1248 × 905**. La barre le pose
  en `height: 42px; width: auto` (38 px entre 801 et 950 px, 40 px sur
  téléphone, 44 px dans le pied de page) et verrouille le dessin deux fois :
  les attributs `width` / `height` de la balise `img` portent le ratio natif —
  la place est réservée avant même le chargement — et la feuille ajoute
  `aspect-ratio: 1248/905` avec `object-fit: contain`. Un fichier différent
  (cache, CDN, export carré) est donc **ajusté** dans la boîte au lieu d'être
  étiré en largeur : c'est ce qui manquait quand le logo paraissait comprimé
  dans la barre.
- **« Jeux » est une entrée de section.** Elle regroupe les deux pages du pôle
  jeu — **Jeux-vidéo** (`/jeu`) et **Quizz** (`/quizz`) — sur un seul
  emplacement de la barre au lieu de deux pastilles. Le lien continue de
  naviguer vers `/jeu` ; un chevron (`button.nav-submenu-toggle`) ouvre le
  panneau.
  - Sur ordinateur, le panneau se déplie au survol, au clic sur le chevron et
    dès que le focus entre dans l'entrée ; il se referme à Échap, au clic à
    l'extérieur, après 200 ms de sortie du survol et à chaque changement de
    route. Un pont invisible (`.nav-submenu::before`) laisse la souris
    descendre de la pastille au panneau sans le refermer.
  - Sur téléphone, plus de panneau : les deux pages sont posées sous « Jeux »
    dans le menu plein écran, toujours visibles (rien à survoler sur un écran
    tactile).
  - Les sous-pages gardent l'entrée active : `/jeu/mirage-rush` ou
    `/quizz/survival` éclairent « Jeux » (`isSection`, dans `Layout`). Les
    liens du panneau ne portent **jamais** la classe `active` (seulement
    `is-current`) : `updateIndicator` cherche `a.active` dans la pastille, et
    la pastille jaune partirait se cacher dans le panneau. C'est l'enveloppe
    `.nav-item` qui porte l'état actif, donc la pastille couvre le libellé
    **et** le chevron.
  - Les libellés viennent de l'i18n (`nav.games`, `nav.videoGames`,
    `nav.quiz`, `nav.gamesMenuAria`) : les trois dictionnaires doivent rester
    complets, `npm run check:i18n` le vérifie.

Vérification : `npm run check:nav` (jsdom, pile réelle de l'application) —
ratio du logo, les deux pages du panneau, ouverture au chevron, fermeture par
Échap et par un clic à l'extérieur, état actif sur les sous-pages.

Piège verrouillé par `npm run check:nav-ghost` : sur téléphone, le menu plein
écran (`.nav-links`) se masque fermé par `opacity:0` + `pointer-events:none`,
mais la propriété **s'hérite** — un descendant qui se redonne `auto` redevient
cliquable *à travers* le calque. La requête média téléphone posait exactement
ça sur `.nav-submenu` : « Jeux-vidéo » et « Quizz » étaient des liens
invisibles pleine largeur au milieu de l'écran, et un appui sur « JOUER » ou
« LANCER LA PARTIE » de Mirage Rush atterrissait sur la grille des quizz. Le
sous-menu hérite désormais du calque (traversé menu fermé, cliquable menu
ouvert via `.nav-links.open .nav-submenu`), et l'état de survol bureau
(`is-open`) est neutralisé sur téléphone.

## Typographie : Orbitron pour les gros titres

Deux familles, un partage net, et un seul fichier qui tranche —
**`src/typography.css`** :

- **Orbitron** porte les gros titres (h1, h2, h3 et tout `[role="heading"]`) :
  une géométrique anguleuse, l'esprit « écran de jeu ». Héros d'accueil, titres
  de section, titres d'article et de dossier, questions de quizz. Poids 800
  pour les h1-h2, 700 pour les h3 — le titrage pèse, comme les feuilles de
  section le demandaient déjà. La pile de polices vit dans le jeton
  `--font-gaming` (`src/styles.css`), et la famille est chargée depuis Google
  Fonts dans `index.html` en variable 400-900, pour que les poids 700, 800 et
  900 des feuilles rendent vraiment.
- **Google Sans** reste sur tout le reste : paragraphes, libellés, boutons,
  pastilles, chiffres des compteurs et des scores. C'est la police de lecture
  du site, et les libellés de 9 à 15px des cartes, du menu et du ticker ne
  supportent pas une police d'affichage.

`typography.css` est importé en dernier dans `src/main.jsx` : ses règles
(`!important`) coiffent les dix-huit autres feuilles. C'est aussi pour ça que
les feuilles de section continuent de poser `font-family:var(--display)` sur
des éléments de 11 à 15px : `--display` reste Google Sans, et c'est le fichier
de politique — lui seul — qui décide où la police gaming s'applique. Pour
l'étendre (les grands chiffres d'un compte à rebours, le score d'un test, un
futur titre en h4), il suffit d'ajouter les sélecteurs concernés à la liste du
bloc 2 de `typography.css`.

**Le gras se décide ici aussi.** La règle `body *` du bloc 1 impose
`font-weight: 400 !important` à tout le site — `strong` et `b` compris — et
coiffe donc un `font-weight: 700` écrit dans une feuille de section. Les
exceptions sont listées dans ce fichier : les titres (blocs 2 et 4) et, pour la
messagerie, le bloc 5 (pseudos, navigation, aperçu et heure des discussions non
lues — voir « Messagerie »). Pour qu'un autre texte ressorte en gras, on ajoute
ses sélecteurs au bloc concerné.

**Trois lignes maximum.** Un gros titre du site tient sur trois lignes, jamais
plus. La règle se joue d'abord sur le texte : les titres sont écrits dans ce
budget (le robot actus refuse un couple `title` + `accent` au-delà de
`HEADLINE_BUDGET`, dans `scripts/news-bot/lib/story.mjs`), et
`npm run check:headlines` rend toutes les routes, mesure chaque h1/h2/h3 à seize
largeurs de fenêtre avec les métriques d'Orbitron, puis échoue si l'un d'eux
dépasse. Le bloc 3 de `typography.css` n'est qu'un filet : les titres de carte y
sont plafonnés à trois lignes (`-webkit-line-clamp`), au cas où un titre correct
passerait malgré tout sur quatre lignes. Quand un titre est trop long, on le
réécrit — on ne le coupe pas.

Deux points d'attention :

- **Orbitron est plus large que Google Sans.** Un titre peut donc passer sur
  une ligne de plus ; `overflow-wrap: break-word` évite qu'un mot long déborde
  de sa colonne sur un écran étroit, mais si un titrage paraît trop large, c'est
  le corps ou l'interlettrage de la règle concernée qu'il faut reprendre —
  `check:headlines` dit lesquels.
- **Seule exception au titrage gaming :** les titres du mode Survie
  (`.horror-*`, dans `src/quizzes/quiz.css`) posent leur famille en
  `!important` et gardent donc leur rendu d'origine — leur habillage de
  dossier d'horreur est volontairement à part.

## Langue : le site est en français

Le sélecteur de langue (EN / FR / AR) a été **retiré de la barre de navigation** :
le site est publié en français, sans réglage. `LanguageContext` n'a plus ni état
ni `localStorage` — l'ancienne clé `letsplay-lang` est ignorée, y compris chez un
visiteur qui avait choisi l'anglais ou l'arabe.

Ce qui reste dans le dépôt, volontairement :

- **Les dictionnaires `en` et `ar`** (`src/i18n/translations.js`). `en` est le
  filet de sécurité du français : une clé oubliée dans `fr` s'affiche en anglais
  au lieu de faire planter la page (le bug ff6d390 avait laissé la page Actus
  blanche pour cette raison). Voir `withBaseFallback` dans
  `src/i18n/LanguageContext.jsx`.
- **La direction du texte** (`dir`) et le câblage RTL : inertes en français,
  déjà en place si une langue revient.
- **La prop `lang` du provider** : une prise réservée aux scripts de
  vérification, qui continuent de rendre chaque route en FR / EN / AR
  (`npm run check:i18n`). Aucun écran ne s'en sert.
- **Les scripts de vérification** ne posent plus la langue dans `localStorage`
  (plus personne ne la lit) : ils la passent au provider.

Le suivi des succès continue d'enregistrer la langue utilisée, mais il ne voit
plus que le français : les succès **« Polyglotte »** (2 langues) et
**« Trilingue »** (3 langues) ne peuvent donc plus être débloqués par un nouveau
visiteur. Ils restent au catalogue, délibérément — un joueur qui les a obtenus
du temps des trois langues garde son grade, son XP et sa progression, et les
retirer ferait baisser son niveau (voir « Succès débloqués par les actions du
site »).

## Contenu

- Hero éditorial avec CTA YouTube
- Présentation de l’émission × Algérie Télécom avec l’épisode HicoSoft à la une (page d’accueil uniquement)
- Épisode partenaire Ooredoo : le FreeFire Algerian Championship 2023 (FFAC2023) en lecteur YouTube,
  présenté comme l’épisode HicoSoft — grille miroir, accents aux couleurs Ooredoo (page d’accueil uniquement)
- Présentation de l’émission et chiffres de communauté
- Formats : Gaming, Cinéma et Pop Culture
- Dernières vidéos YouTube avec filtres interactifs
- Liens vers les comptes officiels
- Bloc de diffusion YouTube live configurable sur la page d’accueil
- Partenaires & collaborations : Algérie Télécom, TCL et le Games & Comic Con Dzaïr 2026
  (section d’accueil + page dédiée `/partenaires`)
- Succès et trophées du joueur dans le profil (`/auth`) et sur la page de
  profil (`/profile`) : **60 trophées** débloqués par les actions réalisées sur
  le site **et par les parties jouées** (Mirage Rush, Vice City Rush), rangés
  **par catégorie** dans la vitrine du joueur (neuf familles, dont une par
  jeu), classés en quatre grades de difficulté — bronze, argent, or, platine —
  avec niveau, XP, grades visibles et notifications de déblocage (voir
  « Succès débloqués par les actions du site »)
- Quizz gaming, cinéma & pop culture et quizz du jour (`/quizz`, alias `/quiz` et `/quizzes`) :
  vingt-cinq quizz rédigés par la rédaction (culture gaming, consoles, PC,
  e-sport, tech, adaptations, films cultes, super-héros et séries), **tous
  jouables dès l'arrivée** et chacun en **trois niveaux à
  l'intérieur** (Facile ouvert, Confirmé puis Expert débloqués en cascade en
  terminant le palier précédent, progression synchronisée avec le compte ;
  questions différentes d'un niveau à l'autre et points multipliés
  ×1/×1,5/×2, un niveau ne rapportant qu'une fois — en points comme en XP),
  quizz du jour en rotation quotidienne avec série de jours, feedback
  instantané de chaque réponse (gel, vert/rouge, points de rapidité & combo),
  grille filtrable par famille (Gaming / Tech / Cinéma / E-sport, `?cat=` dans
  l'URL), corrections commentées, confettis du sans-faute, raccourcis clavier 1–4,
  commentaires, recherche et cinq succès dédiés ; classement des quizz (un
  classement par niveau, clé `slug:niveau`) par points gagnés et position au
  classement global affichée sur la page de profil (voir « Quizz gaming,
  cinéma & pop culture et quizz du jour »)
- Amis : demandes d'ami depuis les profils publics, les commentaires et le hub ;
  liste d'amis **en ligne / hors ligne** dans la fenêtre sociale en bas à
  droite, pour tout joueur connecté (voir « Amis : demandes, liste et
  présence »)
- Messagerie : discussions **1-à-1 entre amis** en texte et en temps réel,
  avec **non-lus**, accusé de lecture, **blocage** et **signalement**, dans la
  même fenêtre sociale (voir « Messagerie : discussions 1-à-1 entre amis »)
- Appels **vocaux et vidéo** 1-à-1 entre amis, depuis l'en-tête d'une
  discussion : pair-à-pair WebRTC signalé par Supabase Realtime, appel
  entrant avec sonnerie, micro/caméra coupables, bascule de caméra,
  refus / occupé / sans réponse, et **trace d'appel** déposée dans la
  discussion (voir « Appels vocaux & vidéo entre amis »)
- Amis + messagerie dans la **même fenêtre** : un seul lanceur « MESSAGERIE »
  (pastilles des non-lus et des demandes en attente, amis en ligne) ouvre un
  panneau à trois onglets — Messages / Demandes / Ajouter (la liste des amis
  vit dans l'onglet Messages, avec les discussions) ; sur mobile (≤ 760 px),
  la page `/messages` regroupe les trois onglets sans pop-up, accessible
  aussi depuis le menu, même avant connexion

Les visuels des cartes vidéo utilisent les miniatures publiques YouTube des épisodes correspondants
(voir « Miniatures YouTube » plus bas : aucune carte ne reste sans image).

## Player accounts & authentication (Supabase)

Registration, login, Google / Microsoft (Azure) sign-in, password reset and the
connected player hub (`/auth`) run on [Supabase Auth](https://supabase.com/auth)
(`@supabase/supabase-js`, client in `src/lib/supabase.js`, session in
`src/auth/AuthContext.jsx`). The navigation bar shows two separate buttons,
**Log in** and **Register** (highlighted), instead of the single « Join » link,
and `/auth` explains what is missing when Supabase is not configured — or the
visitor is offline.

Each button opens its own form: they are links to `/auth?mode=signin` and
`/auth?mode=signup`, and the page reads that `?mode=` parameter
(`readAuthMode` in `src/pages/Auth.jsx`) — **Register** therefore lands on the
register form (gamertag + password confirmation), never on the log-in one. The
`/register` shortcut passes `initialMode="signup"` and wins over the query
string, `state.mode` (links coming from the comment section) wins over both,
and while the pop-up is already open the form follows the address bar, so
clicking the other button switches forms instead of doing nothing. Values other
than `signin` / `signup` (or no parameter at all) fall back to log-in.

The one-click demo accounts (`VORTEX_DZ`, `PIXEL_QUEEN`) are **no longer shipped**:
`src/auth/demoProfiles.js` exports an empty registry, so the demo card on `/auth`
never renders and no visitor can borrow a fake identity. Everything the demo
preview used to exercise (friends dock, messaging, achievements hub) is still in
the codebase but dormant; the verification scripts re-activate it with the
fixtures in `scripts/demoFixtures.js` (see « Personas de démonstration » below).

### Environment variables

Local development — copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA... # site key publique, facultative en local
```

Find both values in Supabase Dashboard → Settings → API (Project URL and the
publishable / anon public key). The app also accepts `VITE_SUPABASE_ANON_KEY`
as the key name.

On Vercel, two options (either works — **redeploy after changing variables**,
Vite embeds them at build time):

1. **Supabase marketplace integration** (recommended): Vercel → your project →
   Marketplace → Supabase → Connect. The integration provisions `SUPABASE_URL` /
   `SUPABASE_ANON_KEY` (no `VITE_` prefix) — `vite.config.js` mirrors those
   public values into the client bundle at build time, so nothing else is needed.
2. **Manual variables**: Vercel → Settings → Environment Variables → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production
   (and Preview if you want auth on preview deploys), plus
   `VITE_TURNSTILE_SITE_KEY` for the signup anti-bot check.

**These values are read at build time.** Vite inlines them into the bundle, so
adding a variable without rebuilding/redeploying changes nothing. Each target
needs its own copy:

| Where the site runs | Where to set the two values |
| --- | --- |
| Local `npm run dev` / Arena preview | `.env.local` at the repo root (never committed) |
| Vercel | Settings → Environment Variables, or the Supabase marketplace integration |
| GitHub Pages (`.github/workflows/deploy.yml`) | Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` |

Repository *variables* (not secrets) are enough for Pages: these values are
public by design — they ship inside the client bundle. The workflow accepts the
`SUPABASE_URL` / `SUPABASE_ANON_KEY` names too. When the Supabase values are
absent, the build still deploys but `/auth` stays in demo-preview mode, and the
workflow logs a warning (`Supabase non configuré`).

### Protection anti-bots des inscriptions (Turnstile + Supabase)

Le formulaire d’inscription embarque un widget **Cloudflare Turnstile**
uniquement lorsque `VITE_TURNSTILE_SITE_KEY` est défini. Le jeton à usage unique
est envoyé à Supabase Auth dans l’appel `signUp`; un honeypot discret complète
ce contrôle pour les robots les plus simples. Le widget côté navigateur n’est
pas une protection suffisante à lui seul : il faut impérativement activer le
CAPTCHA côté serveur dans Supabase.

Mise en place en production :

1. Cloudflare → Turnstile → créer un widget en mode *Managed*, avec le domaine
   Vercel de production, le domaine GitHub Pages et, si nécessaire, les domaines
   de prévisualisation autorisés. Copier la **site key** (publique).
2. Vercel → Settings → Environment Variables : ajouter
   `VITE_TURNSTILE_SITE_KEY` pour Production (et Preview si les préviews doivent
   aussi permettre l’inscription), puis redéployer.
3. GitHub → Settings → Secrets and variables → Actions → Variables : ajouter
   `VITE_TURNSTILE_SITE_KEY` pour le workflow Pages. Une site key est publique,
   mais elle ne doit jamais être confondue avec la **secret key** Cloudflare.
4. Supabase → Authentication → CAPTCHA : sélectionner **Cloudflare Turnstile**,
   coller la secret key Cloudflare et activer le CAPTCHA. Sans cette étape, un
   bot peut appeler Supabase directement en contournant l’interface.
5. Supabase → Authentication → Sign In / Up : laisser **Confirm email** activé,
   désactiver les inscriptions anonymes et les fournisseurs OAuth inutilisés,
   conserver les limites de requêtes par défaut (ou les durcir), activer la
   protection contre les mots de passe compromis et configurer un SMTP fiable.

Le build Pages affiche un avertissement si la site key manque. En local, on
peut laisser `VITE_TURNSTILE_SITE_KEY` vide pour travailler sans CAPTCHA, mais
il ne faut jamais publier ainsi si les inscriptions publiques sont ouvertes.
Après configuration, tester une inscription normale, une inscription bloquée
par Turnstile, puis le dépassement des limites dans les logs Supabase.

**Appels vocaux & vidéo (facultatif)** : `VITE_TURN_URL`, `VITE_TURN_USERNAME`
et `VITE_TURN_CREDENTIAL` ajoutent un relais TURN pour fiabiliser les appels
derrière les NAT stricts — mêmes règles (lues au build, redéploiement après
changement). Détails et choix d'hébergement dans « Appels vocaux & vidéo entre
amis ».

If a variable is missing, `/auth` shows exactly which one under the form.

### Troubleshooting

| Symptom on `/auth` | Cause | Fix |
| --- | --- | --- |
| “Supabase authentication is not configured … Missing configuration: …” | The values were absent **at build time** for that deployment | Add them for that host (table above) and redeploy — this is what the GitHub Pages mirror showed before the workflow passed them |
| “Unable to reach the Supabase server (…supabase.co) — Failed to fetch” | Wrong project URL/key, or the project is paused (free projects pause after a week of inactivity) | Check Settings → API, restore the project in the Supabase dashboard |
| “Your email address is not confirmed yet” | Authentication → Sign Up → *Confirm email* is ON, and the confirmation mail never arrived | Configure a custom SMTP provider (Authentication → Emails) or turn *Confirm email* off |
| Signup answers “check your inbox” but no mail ever arrives, or “Too many attempts” | Supabase's built-in mailer is for testing only (≈2–4 mails/hour, restricted recipients) | Connect Resend/SendGrid/… under Authentication → Emails |
| Google / Microsoft returns to the site without a session | The redirect target is not whitelisted | Authentication → URL Configuration: Site URL = the deployed domain, Redirect URLs = `https://<domain>/**` |
| “Unsupported provider: provider is not enabled” after clicking Google / Microsoft | That provider is disabled in the Supabase project (`google` / `azure` show up as `false` in `/auth/v1/settings`) | Authentication → Sign In / Up → enable Google / Azure, or hide the buttons |
| Sign-in works on Vercel but not on the Pages mirror | Pages has no Supabase variables | See the table above |

### Supabase dashboard checklist

1. **Database**: run `supabase/schema.sql` once in Dashboard → SQL Editor:
   paste the **whole** file and hit Run. It creates the `profiles` table (RLS
   enabled) and a trigger that inserts a profile row — with the gamertag chosen
   at registration — for every new user, plus the `comments` table behind the
   article comment section (see below), the `friendships` table behind the
   friends list (see « Amis : demandes, liste et présence ») and the
   `direct_messages` / `message_blocks` / `message_reports` tables behind the
   1-à-1 messaging (see « Messagerie : discussions 1-à-1 entre amis »). The
   script is idempotent: re-run it after pulling a newer version. It also
   creates the `kind` / `attachment_*` columns and the private `voice-messages`
   Storage bucket inherited from the old voice messaging: nothing in the app
   uses them any more (see « Nettoyage optionnel du schéma » in the messaging
   section to drop them).
   The SQL Editor wraps the file in **one transaction**, so a single error used
   to roll everything back — and the script looks like it ran while nothing was
   created. It is therefore guarded: steps that depend on Supabase-internal
   objects (`auth.users`, the `anon` / `authenticated` roles) report a
   `WARNING` and let the rest apply. Read the output of the Run:
   - `WARNING … trigger sur auth.users refusé` → the profile trigger was
     skipped (profiles are then only created by the app's own flow); comments
     are unaffected because the author is read from the account metadata.
   - The last query is a control table — every line must read `OK`. If a line
     reads `MANQUANT`, the WARNING(s) above say why. The script also installs
     the `public.delete_my_account()` security-definer function used by the
     password-confirmed delete-account action on the profile hub; do not grant
     clients direct access to `auth.users`.
2. **URLs**: Dashboard → Authentication → URL Configuration →
   - Site URL: `https://<your-domain>` (your Vercel domain),
   - Redirect URLs: add `https://<your-domain>/**` (covers `/auth`, where
     email confirmation, OAuth and password-recovery links land) **and** the
     Pages mirror if you use it:
     `https://salimb-source.github.io/Let-s-Play/**`.
   - The Supabase → Vercel integration keeps these redirect URIs in sync
     automatically, including preview deployments.
3. **Email confirmation** (optional): Authentication → Sign Up → Confirm email
   is ON by default — new accounts receive a confirmation link plus a resend
   button. Turn it OFF and signups log in immediately; both flows are handled.
4. **Google / Microsoft buttons** (optional): Authentication → Sign In / Up →
   enable the Google and Azure providers with your OAuth client IDs/secrets
   (the app uses provider keys `google` and `azure`).

The SPA fallback in `vercel.json` keeps deep links such as `/auth` working on
Vercel (the `/api/*` serverless routes are excluded from the rewrite).

### Article comments

Every article page (`/news/*`, `/reviews/*`) ends with a comment section
(`src/components/Comments.jsx`, data layer in `src/lib/comments.js`) backed by
the `public.comments` table from `supabase/schema.sql`:

- **Reading** is public: visitors see the thread (newest first, 100 max) and a
  “sign in to comment” call to action that brings them back to the article
  (`#comments`) once signed in — including after an OAuth round trip (the target survives the
  full-page return).
- **Posting** requires a Supabase session. The client only sends the article
  route and the text; a `before insert` trigger stamps `user_id`, the author
  name (gamertag chosen on `/auth`, then profile, then e-mail) and the avatar
  server-side, so nobody can post under another name. Row Level Security lets
  players insert only as themselves and delete only their own comments.
- **Guard rails**: 1–1000 characters (enforced in the UI and by a check
  constraint), 5 comments per player per minute (trigger), comments are removed
  with the account (`on delete cascade`).
- **Demo profiles** (`/auth` → demo preview, no Supabase session) keep their
  comments in `localStorage` on that device only, flagged “DEMO” in the feed.

Threads are keyed by the article route (e.g. `/news/physint`), which is the
same on Vercel and on the GitHub Pages mirror. Nothing else to configure once
the SQL has been run; the section explains itself when something is off:

| Message in the comment section | Cause | Fix |
| --- | --- | --- |
| “Comments are not enabled on this deployment yet (the comments table is missing, or the API cache has not reloaded) — …” | The SQL was never run on the project this build points to | Dashboard → SQL Editor → paste **the whole** `supabase/schema.sql` and Run; the control table at the end must show `OK` on every line |
| Same message although the SQL was run | The file was run on another project, or only part of it was pasted | Check `VITE_SUPABASE_URL` points to the project where you ran it, and that the SQL Editor showed the control table |
| `WARNING Let's Play : ce rôle n'a pas le droit de créer un trigger sur auth.users` | `auth.users` belongs to Supabase; on some projects the SQL Editor role may not attach a trigger to it | Not blocking: `comments` and the rest of the script are applied. Profile rows then stay uncreated until the trigger can be attached |
| A line of the control table reads `MANQUANT` | That object is missing — see the WARNING above it | Re-run the file (it is idempotent) and read the warnings |
| “Your session has expired — sign in again to comment.” | The stored session is no longer valid | Sign out / in on `/auth` |
| “Easy there — wait a moment before posting again.” | More than 5 comments in one minute | Wait a minute |
| Sign-in gate although the site is deployed | Supabase variables missing at build time | See the environment-variable table above |

## Amis : demandes, liste et présence

Tout joueur connecté (compte Supabase — ou persona de démonstration dans les
scripts de vérification) dispose d'une liste d'amis. Elle vit dans la **fenêtre sociale** en bas à droite,
présente sur toutes les pages : un lanceur compact « MESSAGERIE » — avec les
pastilles des **non-lus** (messagerie) et des **demandes en attente**, et le
compteur d'amis en ligne — ouvre un panneau à **trois onglets** (Messages /
Demandes / Ajouter). Amis et messagerie partagent donc la même fenêtre — la
liste des amis vit **dans** l'onglet Messages, avec les discussions : voir le
tableau plus bas. Le lanceur « MESSAGERIE »
reste visible pour un visiteur non connecté : il ouvre `/messages`, qui propose
la connexion sans afficher de conversations. Dans l'APK Android, la WebView a
une session distincte de celle du navigateur du téléphone : il faut s'y
connecter pour retrouver ses discussions. Sur mobile, un lien « MESSAGERIE »
est aussi présent dans le menu de navigation.

| Onglet | Ce qui s'y trouve |
| --- | --- |
| **Messages** | la messagerie 1-à-1 **et** la liste des amis, fusionnées : chaque ligne est un ami — **la photo ou le nom ouvre la discussion**, le point de présence et la mention « EN LIGNE » / « Vu il y a 2 h » restent visibles, et un bouton **« Profil »** (les amis sans discussion, classés en ligne d'abord, sous la section « DISCUSSIONS ») mène à sa fiche ; « Retirer » reste sur la fiche de profil. La liste des discussions puis le fil sont décrits plus bas |
| **Demandes** | les demandes **reçues** (Accepter / Refuser) et **envoyées** (Annuler) |
| **Ajouter** | recherche d'un joueur par pseudo (2 caractères minimum), demande en un clic |

L'état ouvert/fermé est mémorisé sur l'appareil ; Échap ferme le panneau. Les
notifications de succès partagent le coin : elles montent au-dessus du lanceur,
et glissent à côté du panneau quand il est ouvert.

**Sur mobile** (≤ 760 px), le lanceur nommé « MESSAGERIE » mène à la **page
sociale** `/messages` (voir plus bas), sans pop-up : les onglets Messages,
Demandes et Ajouter y sont accessibles et le bouton retour du téléphone revient
à la page précédente. Le menu mobile propose également un lien direct.

**Où envoyer une demande d'ami** (`src/friends/FriendButton.jsx`) :

- sur un **profil public** (`/profile/:id`) : bouton principal « Ajouter en
  ami », qui devient « Demande envoyée · Annuler », « Accepter / Refuser »
  (si ce joueur nous a écrit en premier) puis « Amis · Retirer » ; le badge du
  profil annonce aussi **EN LIGNE / HORS LIGNE** ;
- dans le **fil de commentaires** : une petite icône « + » à côté du pseudo de
  chaque auteur (✓ quand c'est déjà un ami, ⏱ quand la demande est partie) ;
- dans l'onglet **Ajouter** de la fenêtre sociale (lanceur en bas à droite) :
  recherche par pseudo, demande en un clic.

**Dans le hub joueur** (`/auth`), la section « **Mes amis** » n'affiche que la
liste : un ami par ligne — avatar avec son point de présence, « EN LIGNE » ou
« Vu il y a 2 h », niveau — et **toute la ligne mène à son profil**. Six amis en
aperçu, puis un bouton « Voir tous mes amis ». Aucun geste ici (ni demande, ni
discussion) : ils restent dans la fenêtre sociale. Un visiteur, ou une page
montée sans le provider des amis, ne rend rien du tout.

Un visiteur qui clique sur « Se connecter pour ajouter des amis » est renvoyé
sur la page où il était une fois connecté.

### Comptes Supabase

Les relations vivent dans `public.friendships` (`supabase/schema.sql`,
étape 3d) : une ligne par paire de joueurs, `status = 'pending'` tant que le
destinataire n'a pas répondu, `'accepted'` ensuite ; refuser, annuler ou
retirer un ami **supprime** la ligne. Un index unique sur la paire ordonnée
interdit deux lignes A→B et B→A. Row Level Security : chaque joueur ne voit que
les relations dont il fait partie, n'envoie des demandes qu'en son nom
(`requester_id` forcé côté serveur), ne répond qu'à celles qu'il a reçues et ne
supprime que les siennes. Envoyer une demande à quelqu'un qui nous avait déjà
écrit **accepte sa demande** au lieu d'en créer une seconde (trigger
`prepare_friendship`).

Le statut en ligne croise deux signaux (`src/friends/presence.js`) :

1. **Supabase Realtime Presence** — chaque joueur connecté rejoint le canal
   `letsplay-presence` ; les entrées et sorties arrivent en direct. Aucune table
   à créer, il suffit que Realtime soit actif sur le projet (c'est le cas par
   défaut).
2. **Battement de cœur** — `profiles.last_seen_at` est rafraîchi toutes les
   90 secondes ; un joueur vu il y a moins de 3 minutes est considéré en ligne
   même si Realtime est indisponible, et « Vu il y a… » s'affiche pour les amis
   hors ligne. Le battement crée aussi la ligne `profiles` d'un compte qui n'en
   aurait pas (trigger d'inscription refusé sur le projet), ce qui le rend
   trouvable dans l'onglet « Ajouter ».

La liste se recharge quand `friendships` change (Realtime `postgres_changes`,
la table est ajoutée à la publication `supabase_realtime` par le script), toutes
les minutes en secours, et au retour sur l'onglet. Pseudos, avatars et niveaux
viennent de `public.profiles` (lecture publique) ; la recherche interroge
`username` / `display_name` (`ilike`).

Rien d'autre à configurer une fois le SQL relancé — le tableau de contrôle en
fin de script doit afficher `OK` pour `table public.friendships`, `politiques
RLS friendships (4)`, `trigger demande d'ami` et `presence
profiles.last_seen_at` ; `realtime friendships` peut rester `ABSENT` (la fenêtre
se rafraîchit alors toutes les minutes). Tant que la table manque, la fenêtre
et les boutons l'expliquent (« Les amis ne sont pas encore activés sur ce
déploiement… ») sans rien casser d'autre.

### Personas de démonstration (devenues fixtures de test)

Les comptes de démonstration ne sont **plus proposés aux visiteurs** :
`src/auth/demoProfiles.js` livre un registre vide, la carte « Explorer le compte
démo » de `/auth` ne s'affiche donc jamais. Les deux personas (`VORTEX_DZ`,
`PIXEL_QUEEN`) survivent comme **fixtures** dans `scripts/demoFixtures.js`, que
les entrées SSR (`scripts/*-smoke.jsx`) réinjectent dans le registre au
démarrage des vérifications — sans elles, le dock social ne pourrait pas être
testé du tout, puisqu'il n'y a aucun backend dans les scripts.

Une persona réinjectée évolue dans une **communauté scriptée**
(`src/friends/demoRoster.js`) : dix joueurs avec des statuts de présence
déterministes — toujours en ligne, toujours hors ligne, ou alternant toutes les
quelques minutes pour que la liste bouge. Chaque persona démarre avec des amis en
ligne et hors ligne, des demandes reçues et une demande envoyée ; l'état est
enregistré dans `localStorage` (par persona, par appareil) et les joueurs
« en ligne » acceptent d'eux-mêmes une demande après quelques secondes. Les
fiches de ces joueurs (`/profile/demo-player-…`) sont rendues comme des profils
publics.

La communauté est calculée **à la demande** (`demoCommunity()`), jamais au
chargement du module : c'est ce qui permet au registre d'être vide en production
et semé plus tard par les fixtures. Une version précédente la figeait au
chargement et lisait `DEMO_PROFILES.vortex.user_metadata` — registre vide, donc
`TypeError` à l'import, donc **écran blanc sur tout le site**.

### Où vit le code

| Fichier | Rôle |
| --- | --- |
| `src/friends/FriendsContext.jsx` | le contexte : amis / demandes / présence du joueur connecté, gestes (`sendRequest`, `accept`, `decline`, `cancel`, `unfriend`, `search`), et l'état de la **fenêtre sociale unifiée** (`dockOpen`, `dockTab` — l'onglet actif, `messages` inclus) ; inerte sans provider (SSR des scripts) |
| `src/friends/friendsApi.js` | couche de données : requêtes `friendships` / `profiles`, replis quand une colonne ou la table manque, état des personas |
| `src/friends/presence.js` | canal Realtime Presence + battement de cœur |
| `src/friends/FriendsTabs.jsx` | les onglets Demandes / Ajouter de la fenêtre sociale, et l'icône « Profil » des lignes de la messagerie (pseudos **en majuscules**, comme dans la messagerie — `pseudoLabel`) |
| `src/friends/FriendButton.jsx` | le bouton de demande d'ami (profil, commentaires, résultats de recherche) |
| `src/friends/FriendsHubSection.jsx` | la section « Mes amis » du hub : la liste des amis, chaque ligne menant à son profil |
| `src/friends/friendsCopy.js` | textes FR / EN / AR |
| `src/auth/demoProfiles.js` | registre des personas : **vide** dans le bundle livré, `registerDemoProfiles()` pour les scripts |
| `scripts/demoFixtures.js` | les deux personas en fixtures de test, semées par les entrées SSR |
| `src/friends/friends.css` | styles des onglets (listes, avatars, boutons) |
| `src/social/SocialDock.jsx` | la fenêtre sociale unifiée : un lanceur, un panneau à trois onglets (Messages / Demandes / Ajouter) ; sur mobile, la messagerie part vers la page dédiée |
| `src/social/socialCopy.js` | textes de la fenêtre (FR / EN / AR) |
| `src/social/social.css` | position du lanceur/panneau, cohabitation avec les notifications, pop-up plein écran mobile (amis) |

### Vérifications

- `npm run check:friends` — logique pure (lignes `friendships` → relations
  vues par le joueur, gestes de démonstration sans doublon, présence scriptée
  déterministe avec des amis en ligne **et** hors ligne, recherche nettoyée
  pour PostgREST), cohérence de la communauté de démonstration (joueurs
  existants, jamais soi-même, textes complets dans les trois langues), puis
  rendu SSR du hub, de la fenêtre (fermée / ouverte) et d'un profil public —
  visiteur et persona — dans les trois langues.
- `npm run check:i18n` et `npm run check:achievements` continuent de rendre les
  pages sans le provider des amis : le contexte par défaut est inerte.

## Messagerie : discussions 1-à-1 entre amis

Tout joueur connecté (compte Supabase — ou persona de démonstration dans les
scripts de vérification) peut écrire à **ses amis** — et seulement à eux.

**Deux parcours** : sur **bureau**, la messagerie vit dans l'onglet
**Messages** de la **fenêtre sociale** (en bas à droite, documentée dans la
section amis) — la pastille jaune du lanceur compte les non-lus, et
`openThread` rouvre la fenêtre sur cet onglet. Sur **mobile** (≤ 760 px), elle
est une **vraie page** : `/messages` (alias `/messagerie`) pour la liste,
`/messages/:peerId` pour une discussion — un écran plein, de grandes zones
d'appui, le champ toujours à portée de pouce ; tous les points d'entrée
(bouton « Message » d'un profil, photo ou nom d'un ami dans la fenêtre
sociale) y naviguent.
La page existe aussi sur bureau, en deux colonnes. Sur la page comme dans la
fenêtre, **la photo ou le nom d'un interlocuteur ouvre la discussion** (jamais
son profil : le bouton « Profil » de l'en-tête de discussion y mène), et
chaque ligne de la liste porte un bouton **« Profil »** bien visible — la
liste des amis et celle des discussions ne font qu'un.
Un visiteur non connecté ne voit rien (carte de connexion sur la page).

| Niveau | Ce qui s'y trouve |
| --- | --- |
| **Liste des discussions** | un ami par ligne : avatar et point de présence, dernier message, « il y a 5 min », badge des non-lus, bouton « Profil » — et **en gras** l'aperçu et l'heure d'une discussion qui a reçu de nouveaux messages ; puis les **amis sans discussion** (section « AMIS » — présence affichée, en ligne d'abord) et les **joueurs bloqués** (à débloquer) ; un champ filtre les amis par pseudo |
| **Discussion** | le fil de bulles (les miennes à droite, avec **Vu** quand l'ami a ouvert), le statut de l'ami, le champ de saisie (Entrée pour envoyer, Maj + Entrée pour un saut de ligne, 1 000 caractères), et dans l'en-tête les gestes **Bloquer** et **Signaler** ; à l'ouverture, une **bulle de suggestions** propose trois messages selon l'état du fil — salut si la discussion est vide, réponses si l'ami posait une question, réactions ou relances sinon — : un clic les place dans le champ (rien ne part sans validation) et la bulle se referme au premier choix, à la première frappe ou sur « Masquer » ; la discussion ouverte prend tout le panneau, l'icône « back » revient à la liste |

**Les pseudos s'affichent en majuscules** partout dans la messagerie :
lignes de la liste des discussions, joueurs bloqués, en-tête de discussion,
titres de la fenêtre de signalement, confirmations de blocage et d'effacement,
infobulles d'appel et cartes d'appel, les lignes de la liste unique amis +
discussions (libellés accessibles, bouton « Profil », présence) et les
onglets **Demandes / Ajouter** de la fenêtre sociale. C'est une règle d'**affichage** appliquée au rendu
par `pseudoLabel` (`src/messages/messagesCopy.js`) : les données gardent leur
casse d'origine et la **recherche** de la liste continue de comparer les
pseudos bruts, sans tenir compte de la casse (chercher « kayz » trouve
`KAYZ_ORAN`). Hors messagerie, rien ne change : la liste d'amis du hub
joueur, les profils et les commentaires affichent le pseudo tel qu'il a été
saisi.

**Les nouveaux messages ressortent en gras.** Dans la liste des discussions,
une ligne qui a reçu des messages pas encore ouverts (`has-unread`, portée par
`ConversationRow`) met en gras l'**aperçu du dernier message** et son
**heure** — le pseudo l'est déjà — en plus de la pastille du nombre et du
cadre jaune. Une discussion lue reste en texte normal, et la ligne redevient
normale dès qu'on ouvre la discussion, puisque l'ouverture marque les messages
comme lus. Le rendu est le même dans la fenêtre sociale et sur la page
`/messages`, en thème sombre comme en thème clair ; seule l'épaisseur change,
pas les couleurs. Le fil ouvert ne bouge pas : à son ouverture, tout y est déjà
lu.

Ce gras se règle dans **`src/typography.css`** (bloc 5), pas seulement dans
`messages.css` : la règle `body * { font-weight: 400 !important }` du bloc 1
ramène tout le site à 400 (`strong` et `b` compris), si bien qu'un
`font-weight: 700` écrit dans `messages.css` seul resterait sans effet.
`messages.css` garde la même déclaration, comme les feuilles de section
gardent leurs `font-family`, mais c'est `typography.css` qui tranche.

L'état ouvert/fermé et la discussion en cours sont mémorisés sur l'appareil ;
Échap remonte à la liste puis ferme la fenêtre.

**Le message vocal a été retiré** : le bouton micro, l'enregistreur, la bulle
de lecture, l'upload dans le bucket `voice-messages` et le diagnostic
`window.__lpVoiceDiag()` n'existent plus — la messagerie est **texte
uniquement**. Les colonnes `kind` / `attachment_*` et le bucket restent dans
`supabase/schema.sql` (le script est rejoué tel quel sur les projets déjà en
place) ; voir « Nettoyage optionnel du schéma » à la fin de cette section si
tu veux les effacer.

**Où écrire à un ami** :

- le bouton **« Message »** d'un profil public (`/profile/:id`), à côté du
  bouton « Ajouter en ami » — grisé avec l'explication « Deviens ami avec ce
  joueur pour lui écrire » tant que l'amitié n'est pas acceptée, avec le
  nombre de non-lus en pastille sinon ;
- la **photo ou le nom** de chaque ami (liste unique de l'onglet Messages) :
  le geste ouvre directement la discussion avec lui ;
- le **lanceur de la fenêtre sociale** (en bas à droite), qui rouvre la liste
  des discussions — et sur mobile la page `/messages`, plein écran.

Le **hub joueur** (`/auth`) ne porte plus aucun raccourci de messagerie : sa
section sociale se limite à la liste d'amis (chaque ligne mène au profil du
joueur). La messagerie reste la fenêtre sociale (bureau) et la page
`/messages` (mobile et bureau).

### Comptes Supabase

Les messages vivent dans `public.direct_messages` (`supabase/schema.sql`,
étape 3e) : une ligne par message, `conversation_key` = les deux identifiants
triés et séparés par `_` (les deux sens d'un échange partagent la même clé),
`read_at` à NULL tant que le destinataire n'a pas ouvert la discussion — c'est
ce qui compte les **non-lus**. Un trigger (`prepare_direct_message`) impose
côté serveur : expéditeur = joueur connecté, **amitié `accepted`
obligatoire**, aucun blocage entre les deux joueurs, 20 messages par minute au
plus, et un message non vide de 1 000 caractères au maximum. Un second trigger
(`restrict_direct_message_update`) fait en sorte qu'une mise à jour ne puisse
**que** poser `read_at` (accusé de lecture) : ni le texte, ni l'expéditeur, ni
l'horodatage ne peuvent être modifiés, et un message lu ne redevient jamais
non-lu. Row Level Security : un joueur ne lit que ses propres échanges et
n'écrit qu'en son nom. Le trigger fixe aussi `created_at` côté serveur : aucun
client ne peut contourner un effacement avec un horodatage futur.

- **Effacer la conversation** — dans le menu « … » du fil (dock sur bureau et
  page `/messages`), après confirmation. `clear_direct_conversation` enregistre
  dans `public.message_conversation_clears` un repère **par compte et par ami**
  à l'heure du serveur. La politique RLS de `direct_messages` masque alors tous
  les messages antérieurs **pour ce compte seulement**, y compris les non-lus
  et les messages plus anciens que la fenêtre chargée ; l'autre participant
  conserve son historique. Les nouveaux messages restent possibles et
  visibles. Le fil s'efface immédiatement à l'écran et l'effacement persiste
  après reconnexion (pas seulement dans le navigateur). L'aperçu démo efface
  localement la discussion de la persona courante. Cela ne remplace pas le
  bouton « Supprimer » sur un message envoyé, qui le retire pour les deux
  participants.
- **Temps réel** — la fenêtre écoute `direct_messages` sur deux canaux
  Realtime : `recipient_id = moi` pour les messages reçus (le badge des
  non-lus bouge tout de suite, quelle que soit la discussion ouverte) et
  `conversation_key = <clé>` pour la discussion en cours (messages de l'ami +
  accusés de lecture). Toutes les minutes en secours, et au retour sur
  l'onglet.
- **Bloquer** — `public.message_blocks` : qui bloque qui. Un joueur ne voit
  que **ses** blocages (jamais qui l'a bloqué). Bloquer coupe l'écriture dans
  les deux sens (vérifié par le trigger) et retire la discussion de la liste ;
  elle réapparaît dans la section « BLOQUÉS », avec « Débloquer ». Le joueur
  bloqué ne reçoit aucun message d'erreur explicite (« Ce joueur ne reçoit pas
  tes messages »).
- **Signaler** — `public.message_reports` : motif (harcèlement, spam, propos
  haineux, contenu inapproprié, autre), détail facultatif et identifiant du
  dernier message reçu. Un seul signalement par joueur signalé (le second met
  à jour le motif) ; le bouton passe à « Signalé ».

**Relancer `supabase/schema.sql` sur les projets déjà en place** pour créer le
repère et le RPC avant d'utiliser le bouton. Le tableau de contrôle en fin de
script doit afficher `OK` pour `table public.direct_messages`,
`politiques RLS direct_messages (4)`, `trigger message 1-à-1`, `trigger accusé
de lecture seul modifiable`, `tables blocages / signalements`, `politiques
RLS blocages (3) / signalements (2)` et `effacement des conversations pour soi
(table, RLS, RPC, filtre messages)` ; `realtime direct_messages` peut rester
`ABSENT` (la messagerie se rafraîchit alors toutes les minutes). La dernière
ligne du tableau, `messages vocaux (colonnes + bucket + politiques de
stockage)`, est **héritée de l'ancienne messagerie vocale** : elle peut rester
`ABSENT` sans conséquence, plus rien dans l'application ne s'en sert. Tant que
la table manque, la fenêtre l'explique (« La messagerie n'est pas encore
activée sur ce déploiement… ») sans rien casser d'autre.

### Nettoyage optionnel du schéma

Le message vocal ayant été retiré de l'application, les objets SQL qui le
servaient ne sont plus utilisés : les colonnes `kind`, `attachment_path`,
`attachment_duration`, `attachment_mime` de `direct_messages` et le bucket
privé `voice-messages`. `supabase/schema.sql` continue de les créer (le script
est rejoué tel quel sur les projets existants, et les retirer du fichier ne
les supprimerait pas d'une base déjà à jour). Pour les effacer réellement —
**opération définitive : les messages vocaux encore stockés sont perdus** —,
dans Dashboard → SQL Editor :

```sql
drop policy if exists "Players upload their own voice messages" on storage.objects;
drop policy if exists "Conversation participants read voice messages" on storage.objects;
drop policy if exists "Senders delete their own voice messages" on storage.objects;
delete from storage.objects where bucket_id = 'voice-messages';
delete from storage.buckets where id = 'voice-messages';
-- Messages vocaux restés en base : leur `body` est vide, ils s'afficheraient
-- comme des bulles vides. À supprimer AVANT de retirer la colonne `kind`.
delete from public.direct_messages where kind = 'voice';
alter table public.direct_messages
  drop column if exists kind,
  drop column if exists attachment_path,
  drop column if exists attachment_duration,
  drop column if exists attachment_mime;
```

Sans ce nettoyage, la messagerie fonctionne exactement pareil : colonnes vides
et bucket inutilisé.

### Personas de démonstration (fixtures de test)

Comme pour les amis, les personas ne sont plus livrées : `check:messages` les
réinjecte depuis `scripts/demoFixtures.js`. Une persona ainsi semée retrouve des
**discussions scriptées** (`src/messages/demoThreads.js`) avec des amis de la
communauté de démonstration : des messages non lus à traiter, des discussions
déjà lues, des réponses automatiques des joueurs « en ligne » (quelques
secondes après l'envoi) et des messages qui arrivent tout seuls au fil des
minutes pour montrer le badge des non-lus. Tout est déterministe et enregistré
dans `localStorage` (par persona, par appareil) ; bloquer un joueur arrête ses
réponses, et un signalement y est enregistré comme sur un vrai compte.

### Où vit le code

| Fichier | Rôle |
| --- | --- |
| `src/messages/MessagesContext.jsx` | le contexte : discussions / non-lus / blocages / signalements du joueur connecté, gestes (`openThread`, `openInbox`, `viewThread`, `send`, `clearConversation`, `markRead`, `block`, `unblock`, `report`), canaux temps réel ; `openThread` / `openInbox` ouvrent la **fenêtre sociale** sur l'onglet « Messages » sur bureau, et **naviguent vers la page `/messages`** sur mobile (l'onglet actif est porté par le contexte des amis) ; inerte sans provider (SSR des scripts) |
| `src/messages/messagesApi.js` | couche de données : requêtes `direct_messages` / `message_blocks` / `message_reports`, RPC d'effacement pour soi, lignes → discussions, non-lus, repli quand la table manque, état des personas |
| `src/messages/demoThreads.js` | discussions de départ, réponses scriptées et messages entrants de l'aperçu démo |
| `src/messages/MessagesTabs.jsx` | les vues de messagerie (fenêtre sociale **et** page dédiée) : la liste unique amis + discussions (présence, bouton « Profil »), fil avec séparateurs de jour, **bulle de suggestions à l'ouverture du fil**, champ de saisie, accès « Profil », bloquer / signaler / effacer la conversation |
| `src/messages/MessagesPage.jsx` | la **page de messagerie** `/messages` + `/messages/:peerId` (alias `/messagerie`) : plein écran sur mobile, deux colonnes sur bureau |
| `src/messages/MessageButton.jsx` | le bouton « Message » des profils publics (ouvre le chat) |
| `src/messages/messagesCopy.js` | textes FR / EN / AR, `pseudoLabel` : les pseudos affichés en majuscules (règle de rendu, les données gardent leur casse), et `messageSuggestions` : les trois suggestions de la bulle d'ouverture selon l'état du fil |
| `src/messages/messages.css` | styles (liste, bulles, signalement, page `/messages`) |

### Vérifications

- `npm run check:messages` — logique pure (lignes `direct_messages` →
  discussions : les deux sens regroupés, fil retrié, non-lus comptés, accusé de
  lecture, messages reçus en direct sans doublon ; clés de conversation
  symétriques ; saisie nettoyée et bornée ; erreurs du trigger reconnues ;
  pseudos mis en majuscules — casse mixte, accents, espaces de bord, pseudo
  absent),
  cohérence de l'aperçu de démonstration (discussions entre **amis** existants,
  jamais soi-même, non-lus et discussions lues, réponses déterministes,
  messages scriptés livrés une seule fois, effacement propre à la persona et
  persistant, blocage / signalement réversibles, textes complets dans les trois
  langues, suggestions de la bulle d'ouverture cohérentes avec l'état du fil —
  salut, réponse à la question, réaction, relance — en trois langues), puis rendu SSR du hub, de la fenêtre
  (fermée / liste / discussion ouverte) et de profils publics — visiteur, ami
  et non-ami — dans les trois langues ; un test DOM clique aussi sur
  « Effacer la conversation », vérifie l'annulation, la confirmation et la
  persistance après réouverture, puis sur la **bulle de suggestions**
  (remplissage sans envoi, fermeture après choix ou frappe, retour à la
  réouverture) ; la liste unique amis + discussions (avec la présence et le
  bouton « Profil ») **et l'onglet Demandes** de la fenêtre sociale sont aussi
  rendus avec un pseudo **en casse mixte** : il doit ressortir en majuscules,
  dans le texte visible comme dans les libellés accessibles. Les **non-lus en
  gras** sont vérifiés de bout en bout : la ligne d'une discussion non lue
  porte `has-unread` et sa pastille, une discussion lue non, puis le style
  *calculé* avec les vraies feuilles de style (celles de `src/main.jsx`,
  thème sombre et clair) donne 700 à l'aperçu et à l'heure de la première,
  400 à ceux de la seconde — le test échoue si la règle de `typography.css`
  disparaît.
- `npm run check:friends`, `npm run check:i18n` et `npm run check:achievements`
  continuent de passer : amis et messagerie partagent la même fenêtre sociale
  (un seul lanceur, trois onglets — Messages / Demandes / Ajouter ; sur
  mobile, la messagerie ouvre la page `/messages`), et les contextes par
  défaut sont inertes.

## Appels vocaux & vidéo entre amis

Dans l'en-tête de chaque discussion (fenêtre sociale sur bureau, page
`/messages` partout), deux boutons à côté de « Profil » : **téléphone** (appel
vocal) et **caméra** (appel vidéo). Comme la messagerie, les appels sont
réservés aux **amis**. Un bouton grisé s'explique toujours au survol
(« aperçu démo », « connexion sécurisée (HTTPS) exigée », « deviens ami avec
ce joueur »…). Un ami qui **semble hors ligne** ne grise PAS le bouton : la
présence est une estimation (canal de présence, dernier passage vu), l'appel
part quand même et conclut « Sans réponse » s'il n'aboutit pas — l'infobulle
prévient. Un appel impossible le dit aussi à l'écran (bandeau en bas), jamais
de clic muet.

**Comment ça marche** (trois étages, tous sans serveur en plus) :

| Étage | Ce qui fait le travail |
| --- | --- |
| **Signalisation** | Supabase Realtime (Broadcast) — sonnerie, réponse, offre/réponse SDP, candidats ICE, raccrocher. Chaque joueur écoute en permanence **son** canal `calls:user:{uid}` ; on n'envoie que sur le canal du destinataire, et chaque événement `{v, t, callId, from, to}` est validé (destinataire, appel courant, amitié et blocage revérifiés à l'arrivée) |
| **Médias** | WebRTC **pair-à-pair** (`getUserMedia` + `RTCPeerConnection`) : le son et l'image ne passent jamais par un serveur. STUN public livré par défaut ; TURN optionnel (voir plus bas) pour les NAT stricts |
| **État & interface** | `CallsContext` expose la phase (`idle → incoming/outgoing → connecting → active → ended`), les flux `<video>`, le micro / la caméra, la durée, le motif de fin ; `CallOverlays` rend l'appel entrant (carte + sonnerie) et le panneau d'appel (vidéo de l'ami en grand, la nôtre en incrustation **miroir**, chrono, contrôles) |

**L'interface, en mode HUD de jeu.** L'overlay d'appel est traité comme un
*écran* : sombre dans les deux thèmes (règle « les médias restent sombres »,
section 8 de `theme.css`), encres posées **en dur** dans `src/messages/calls.css`
— c'est le motif `calls-` du balayage d'encres (`scripts/theme-ink-sweep.mjs`)
qui garantit qu'aucune de ces couleurs ne bascule en thème clair. L'habillage
gaming :

- **équerres néon** dans les angles (`.calls-frame`, le même geste que
  `.hud-frame` sur le site) — le cadre du panneau « respire » en cours
  d'appel et passe **au rouge** une fois l'appel terminé ;
- **radar** autour de l'avatar (balayage conique + cadran pointillé) :
  sonnerie entrante et scène de l'appel vocal ;
- **LED d'état** dans l'en-tête (jaune en cours d'établissement, vert
  clignotant en appel, rouge à la fin) et **chrono Orbitron** en pastille
  néon — le pseudo de l'ami et les initiales d'avatar portent aussi
  Orbitron (`src/typography.css`, bloc 6) ;
- **scène vidéo** : viseur aux quatre coins, scanlines et vignette posées
  sur l'image ; **scène audio** : égaliseur à sept barres (la médiane porte
  le jaune de marque) et indicateur de signal en cascade ;
- **boutons néon** : le « Répondre » pulse, micro/caméra coupés virent au
  rouge, les boutons téléphone/caméra de l'en-tête de discussion
  (`.messages-tool.is-call`) s'illuminent en cyan au survol.

Tout le décoratif est `aria-hidden` : l'accessible reste le texte (libellé,
pseudo, état, chrono), et `prefers-reduced-motion` coupe le mouvement sans
enlever d'information.

**Le scénario complet** : l'appelant obtient micro/caméra (la permission est
demandée **avant** de sonner), puis l'ami reçoit l'appel entrant (sonnerie,
carte « Répondre / Refuser »). Répondre lance la connexion P2P ; refuser
affiche « Appel refusé » chez l'appelant ; appeler un ami déjà en appel répond
**occupé** tout seul ; sonner 30 s sans réponse conclut « sans réponse ». En
cours d'appel : micro et caméra coupables, **changement de caméra** (selfie ↔
dos) sans coupure, **résistance aux micro-coupures** (6 s de grâce avant de
conclure « Connexion perdue »). Caméra refusée sur un appel vidéo ? L'appel
continue **en audio** plutôt que d'échouer.

**Appel vocal** : il n'y a pas d'image, donc pas de `<video>` visible — mais le
son de l'ami doit quand même être joué, dans un `<video playsinline>` (le même
chemin que l'appel vidéo). Un `<audio>` reste souvent silencieux sur iOS et
part dans l'écouteur sur Android. Sans cet élément, l'appel « s'établit », le
chrono tourne, et personne n'entend rien : c'est le symptôme « la vidéo marche,
le vocal non ». Dans l'APK, le haut-parleur est forcé le temps de l'appel
(`LetsPlayAndroid.setCallAudio`) pour la même raison.

**Trace d'appel** : à la fin, l'appelant dépose un message normal dans la
discussion — `📞 Appel vidéo · 02:14`, `📞 Appel audio sans réponse`,
`📞 Appel audio refusé`, `📞 Appel audio — occupé`. Rien de nouveau à
provisionner : non-lus, temps réel et suppression sont ceux de la messagerie.
(Ce message suit la langue de l'appelant — limite assumée, documentée ici.)

**Sécurité & limites honnêtes** :

- les canaux de signalisation sont publics par nom : les événements sont
  filtrés (destinataire + amitié + blocage + appel courant), mais ils restent
  visibles d'un client qui joindrait le canal ; seuls des identifiants et une
  offre SDP y transitent (jamais de média) — pour blinder, passer les canaux
  Realtime en `private` (RLS `realtime.channels`) ;
- deux onglets du même compte sonnent ensemble ; répondre dans l'un laisse
  l'autre finir sa sonnerie (35 s max) ;
- `getUserMedia` exige HTTPS (ou localhost) : les boutons s'expliquent sinon ;
- les personas de démonstration n'ont pas de correspondant réel : les boutons
  y sont grisés avec l'explication, et `check:calls` le vérifie.

### Dépannage « l'appel semble marcher mais… »

Historique et réglages des pannes d'image réelles (testé avec deux comptes
amis — un téléphone + un ordinateur, appel vidéo depuis la discussion) :

- **Écran noir en appel vidéo, le son passe, APK Android** : la WebView
  exigeait un geste utilisateur pour chaque lecture de média — l'image de
  l'ami arrive quelques secondes après le clic « Répondre », sa lecture était
  rejetée et l'ancien code avalait le rejet pour toujours. Réglé des deux
  côtés : `setMediaPlaybackRequiresUserGesture(false)` dans l'APK **1.0.2**,
  et le site rejoue désormais `play()` de lui-même (métadonnées, gestes,
  relances) au lieu d'avaler le rejet. Mettre les deux joueurs à jour.
- **Aucune image nulle part, appel devenu « vocal » sans prévenir** : la
  caméra était refusée/occupée — pire, la WebView Android peut répondre à
  `getUserMedia({audio, video})` avec un **accord partiel** (micro oui,
  caméra non) SANS erreur : l'appel restait étiqueté « vidéo » avec un écran
  vide. Désormais le repli audio est détecté (même sans erreur) et **expliqué
  à l'écran** — bandeau + pastille « Caméra indisponible — l'appel continue
  en audio, sans image » ; si c'est la caméra de l'AMI qui manque, l'appelant
  est prévenu aussi (événement de signalisation `media`).
- **Appel vocal sans voix** : le panneau ne branchait le flux distant sur un
  élément média QUE quand il avait une image — un appel vocal ne jouait donc
  jamais la voix de l'ami (et l'appel vocal passait `video: false` à
  `getUserMedia`, que certaines WebView refusent). Désormais le son est joué
  dans un `<video playsinline>` dédié même sans image, et l'APK force le
  **haut-parleur** pendant l'appel (`LetsPlayAndroid.setCallAudio`) — sinon
  la voix part dans l'écouteur et on croit l'appel muet.
- **Rien ne passe du tout (ni son ni image) en 4G/5G** : connexions
  pair-à-pair bloquées par le NAT de l'opérateur → relais TURN (ci-dessous).
  Si le SON passe mais pas l'image, le TURN n'est pas le coupable : la
  connexion existe déjà.
- **« Ça me demande d'activer le micro mais c'est déjà fait »** : c'était
  l'en-tête `Permissions-Policy` servi par le déploiement (corrigé :
  `microphone=(self), camera=(self)` dans `vercel.json` — `check:calls`
  surveille qu'il ne revienne pas). Dans une iframe, il faut en plus
  `allow="microphone; camera"` sur l'iframe.
- **APK : la demande d'autorisation n'apparaît jamais** : Android a un refus
  en mémoire (« Ne plus demander ») — Paramètres → Applications → Let's Play →
  Autorisations → Micro/Caméra → Autoriser (voir `android/README.md`).

### Serveur TURN (recommandé en production)

Le STUN public de Google suffit derrière la plupart des box internet, mais les
**NAT des opérateurs mobiles** (3G/4G) font échouer une partie des connexions
directes. Un serveur **TURN** (relais) règle ça — variables lues au build,
donc **redéploiement après changement** :

```bash
VITE_TURN_URL=turn:turn.votre-domaine.com:3478          # URLs multiples acceptées (virgules)
VITE_TURN_USERNAME=letsplay
VITE_TURN_CREDENTIAL=le-mot-de-passe-turn
```

Deux options éprouvées : **Coturn** auto-hébergé sur un petit VPS (gratuit,
~20 lignes de `turnserver.conf`), ou un TURN managé (Cloudflare Calls,
Metered…) si l'on ne veut rien exploiter. Sans TURN, les appels fonctionnent
quand même : simplement moins souvent du premier coup en mobile.

### Où vit le code

| Fichier | Rôle |
| --- | --- |
| `src/messages/CallsContext.jsx` | le moteur et l'état : sonneries entrantes (canal personnel permanent, sonnerie gardée tant que la liste d'amis n'est pas chargée), `startCall` / `acceptCall` / `declineCall` / `endCall`, micro / caméra / bascule de caméra, **repli caméra détecté et expliqué** (`cameraFallback`, événement `media` vers l'ami), connexions P2P, traces d'appel, `blockerFor` (boutons grisés) et `warningFor` (avertissements), `notice` (un échec s'explique) |
| `src/messages/callsCore.js` | la logique pure (vérifiable sans navigateur) : ICE/TURN, identifiants et canaux, validation des événements, `ringDecision`, `effectiveStreamKind` (appel vidéo sans piste vidéo → audio), durées, classification des erreurs de média |
| `src/messages/CallOverlays.jsx` | les surfaces : carte d'appel entrant (**Répondre / Refuser**, pseudo de l'ami **en majuscules** comme dans la messagerie), panneau d'appel (vidéo, PiP miroir, chrono, contrôles, pastille de repli caméra, `play()` fiable avec relances), bandeau d'avertissement |
| `src/messages/callSounds.js` | sons synthétisés (Web Audio) : sonnerie, tonalité, connexion, fin |
| `src/messages/callsCopy.js` | textes EN / FR / AR, libellés de blocage, traces d'appel — le site étant publié en français, EN / AR restent en filet de sécurité, comme les dictionnaires du site |
| `src/messages/calls.css` | styles des overlays (plein écran, coins coupés, mobile, `prefers-reduced-motion`) |
| `src/messages/MessagesTabs.jsx` | les deux boutons d'appel de l'en-tête de discussion (fenêtre sociale **et** page `/messages`) |

### Vérifications

- `npm run check:calls` — deux étapes :
  - **logique pure + rendu SSR** (`scripts/calls-check.mjs`) : ICE/TURN par
    variables d'environnement, canaux de signalisation, événements broadcast
    validés (version, type, appel, destinataire, émetteur), décision de
    sonnerie (ami / bloqué / liste d'amis pas encore chargée), durées,
    classification des erreurs de micro/caméra, traces d'appel et libellés
    complets dans les trois langues ; puis visiteur sans bouton ni panneau,
    discussion de démonstration avec les deux boutons **grisés et expliqués**
    (pas de WebRTC entre personas), rien dans la liste des discussions,
    libellés EN / FR / AR, jamais appelable soi-même ;
  - **un appel de bout en bout entre deux joueurs** (`scripts/calls-e2e-check.mjs`) :
    deux arbres React montés côte à côte, chacun avec son propre client
    Supabase (comme deux navigateurs), un bus Realtime et un WebRTC simulés.
    Le script déroule sonnerie entrante → **pop-up Répondre / Refuser** →
    refus → appel établi (média des deux côtés) → occupé → raccrocher →
    annuler, puis les dégradations : sonnerie reçue avant que la liste d'amis
    soit chargée, appel impossible expliqué, ami « hors ligne » quand même
    appelable, canal de signalisation en échec puis rétabli. Tout événement
    perdu sur un canal non joint est compté comme une panne.
- `npm run check:messages`, `check:friends` et `check:i18n` continuent de
  passer : les appels se greffent sur la messagerie sans rien redonder.

### Tester un vrai appel

Il faut deux **comptes Supabase amis** (deux navigateurs, ou un ordinateur +
un téléphone sur le déploiement HTTPS) : ouvrir la discussion, appuyer sur le
téléphone ou la caméra, répondre de l'autre côté. En local (`npm run dev` sur
localhost), les appels entre deux onglets fonctionnent — les permissions
micro/caméra se demandent normalement.

Si rien ne se passe, dans l'ordre :

1. **les deux joueurs sont connectés avec un vrai compte** (pas une persona de
   démo) et **amis** — le bouton est grisé avec la raison au survol sinon ;
2. **HTTPS** (ou localhost) : en HTTP, `getUserMedia` est absent et les
   boutons l'expliquent ;
3. **la permission micro/caméra** a été accordée dans le navigateur — quatre
   causes, quatre réglages quand le navigateur dit « accès refusé » :

   | Symptôme à l'écran | Cause | Où agir |
   | --- | --- | --- |
   | « Micro bloqué — la page est dans une iframe… » | page dans une `<iframe>` sans `allow=\"microphone\"` | ajouter `allow=\"microphone; camera\"` à l'iframe ou ouvrir le site directement |
   | « Micro bloqué pour ce site… » | micro déjà bloqué pour l'origine (le navigateur ne redemande plus) | cadenas dans la barre d'adresse → Paramètres du site → Microphone → Autoriser, puis recharger |
   | « Accès au micro refusé… » | refus au moment de la demande | autoriser quand le navigateur le demande, puis relancer l'appel |
   | « Le micro est bien autorisé, mais cette page n’a pas le droit de l’utiliser… » | la page elle-même refuse la capture (en-tête `Permissions-Policy` du site, conteneur tiers) | côté déploiement, pas côté joueur : `vercel.json` doit laisser `microphone=(self), camera=(self)` — les réglages du joueur sont déjà corrects |

   Le code distingue les quatre cas par `isEmbedded()` (page dans une iframe ?)
   croisé avec `navigator.permissions.query({name:'microphone'})`
   (`permissionFailureKind`) — quatre messages EN/FR/AR, vérifiés par
   `npm run check:calls`. Le quatrième cas (permission accordée mais capture
   refusée) a été la vraie panne des appels déployés : l’en-tête de
   sécurité `Permissions-Policy` de `vercel.json` écrivait
   `microphone=(), camera=()` et désactivait micro et caméra sur **tout** le
   déploiement Vercel (celui que charge l’APK), permissions du joueur mises
   à part. `npm run check:calls` vérifie désormais que cet en-tête ne les
   coupe plus.

4. **l'appel sonne mais ne s'établit pas** (« Connexion… » puis échec) : il
   manque un relais **TURN** (voir ci-dessus) — c'est le cas typique en 4G/5G ;
5. **dans l'APK Android** : les autorisations micro et caméra doivent avoir
   été accordées à l'application (voir `android/README.md`) — sans elles, la
   WebView refuse `getUserMedia` et aucun appel n'est possible. Et comme l’APK
   charge le site en ligne, c’est bien l’en-tête `Permissions-Policy` servi
   par Vercel qui décide au final : il doit laisser `microphone=(self)` et
   `camera=(self)` (voir le tableau ci-dessus). L'APK envoie aussi la voix
   dans le **haut-parleur** (pas l'écouteur) le temps de l'appel — sinon, à
   côté d'un appel vidéo audible, le vocal semble muet ;
6. **l'appel vidéo s'entend, l'appel vocal non** (chrono qui tourne, silence) :
   le flux distant n'était branché sur aucun élément média. Le correctif joue
   ce flux dans un `<video playsinline>` non muet, comme l'image de l'appel
   vidéo. `npm run check:calls` vérifie que ce lecteur est bien là, des deux
   côtés, une fois l'appel vocal établi.

## Succès débloqués par les actions du site

Le site récompense ce que le joueur fait réellement : lire un article, lancer
un épisode, commenter, chercher, explorer une nouvelle section, revenir
plusieurs jours de suite, créer un compte ou associer un fournisseur de
connexion — **et ce qu'il gagne en jouant** : chaque course terminée sur
**Mirage Rush** ou **Vice City Rush** nourrit ses propres trophées (records,
terrains, villes, modes, coupes, chapitres d'histoire). **60 trophées** sont
livrés, répartis en neuf catégories (premiers pas, lecture, vidéo, communauté,
fidélité, compte, quizz, Mirage Rush, Vice City Rush) et quatre **grades** de
difficulté ; chacun donne de l'XP, qui construit le niveau et le rang du joueur.

### Grades : bronze, argent, or, platine

Le grade (`rarity` dans le catalogue) résume la difficulté d'obtention, du plus
accessible au plus convoité. L'XP croît avec le grade (aucun succès bronze ne
rapporte plus qu'un succès argent, etc.), ce qui rend l'échelle lisible :

| Grade | Trophées | XP | Exemples |
| --- | --- | --- | --- |
| 🥉 Bronze | 15 | 25–40 | premiers pas, première lecture, premier commentaire, premier galop (Mirage Rush), premier départ (Vice City Rush) |
| 🥈 Argent | 18 | 60–90 | créer un compte, 5 articles, 3 jours de suite, première coupe, 1 000 points sur une course |
| 🥇 Or | 17 | 100–250 | 12 articles, semaine parfaite, les dix terrains de Mirage Rush, les cinq villes de Vice City Rush, fin de l'histoire |
| 🏅 Platine | 10 | 400–800 | 30 articles, 14 jours d'affilée, vitrine complète (4 coupes), grand chelem (une victoire par ville) |

Dans le profil `/auth` comme sur la page `/profile`, la **vitrine à trophées**
(`src/achievements/TrophyShelf.jsx`) range tous les trophées **par catégorie** :
une étagère par famille, avec son icône, son accroche, le nombre de trophées
gagnés et sa barre de progression — et un filtre « Tous / Gagnés / À gagner ».
Les cartes sont celles du panneau des succès (bulle d'information au survol,
cadre du grade) ; la catégorie Mirage Rush embarque en plus la collection des
coupes remportées. La vitrine ne répète ni le niveau, ni le rang, ni
la barre d'XP : tout cela vit dans la carte du joueur, juste au-dessus (un seul
bloc de progression par page). La **bulle d'information** d'une carte — la
description, la progression et l'XP — reste elle aussi toujours dans l'écran :
centrée sur la carte, elle est décalée juste ce qu'il faut quand la carte touche
un bord (mobile, dernières colonnes), et bascule **sous** la carte quand il n'y
a pas la place au-dessus. Chaque
carte porte son grade sous le nom, et le cadre des succès débloqués prend la
couleur du grade (bronze cuivré, argent, or, platine aux reflets irisés). La
notification de déblocage affiche aussi le grade du succès tombé. Il n’existe
pas de page « succès » séparée : le hub joueur est l’endroit unique où retrouver
cette progression.

Où ça se voit :

| Endroit | Ce qui s'y trouve |
| --- | --- |
| `/auth` (hub joueur) | la **barre d'XP du profil** (seul endroit où la barre de progression est affichée) et la vitrine à trophées par catégorie : trophées obtenus et restant à gagner |
| `/profile` (page de profil) | la même **vitrine à trophées par catégorie**, coupes Mirage Rush comprises, sous le classement global des quizz |
| Toutes les pages | une **fenêtre de déblocage** au centre du site dès qu'un succès tombe : icône, nom, description, rareté, XP gagnés — et « NIVEAU N ATTEINT » quand les points font monter d'un rang |
| Navigation (mobile) | dans le menu plein écran, le lien **Profil** est une entrée à part entière juste sous **Quizz** : photo (ou initiales) et niveau. Le desktop garde la pastille de compte |

Le niveau et l'XP ne sont jamais stockés côté compte : ils se déduisent des
succès débloqués (`totalXp` puis `levelFromXp`, dans
`src/achievements/engine.js`). La barre d'XP de la carte profil du hub
(`src/pages/Auth.jsx`) est la **seule** à afficher la barre de progression : elle lit le
`summary` du moteur, comme la carte de niveau qui vivait avant dans la section
« succès » — cette dernière n'en garde plus de copie, pour ne pas montrer deux
fois le même niveau. Les métadonnées Supabase d'un compte réel ne portent ni XP
ni niveau (seule la progression des succès y est écrite) : les relire laissait
la barre principale à 0 % au lieu de suivre le moteur. Seules
les personas de démonstration — registre `src/auth/demoProfiles.js`, vide dans
le bundle livré, semé par `scripts/demoFixtures.js` pendant les vérifications —
affichent des chiffres scriptés, pour prévisualiser un hub rempli sans backend.

La fenêtre vit dans `src/achievements/AchievementPopup.jsx` et lit la file
`notifications` du contexte. Plusieurs succès d'affilée sont présentés **un par
un** (« 1 sur 3 », bouton « SUIVANT »), la file est plafonnée à quatre pour
qu'une rafale ne se transforme pas en séance de clics. Elle se ferme au clic,
avec Échap, par son bouton, ou toute seule après quelques secondes — le
minuteur est suspendu tant que la souris la survole, pour laisser le temps de
lire.

### Comment une action devient un succès

Trois étages, un seul chemin :

1. **l'action** est signalée par la page qui la vit (`track('comment_posted')`,
   `track('search_performed', { query })`, `track('profile_updated')`, …) ou
   automatiquement par `src/achievements/AchievementTracker.jsx`, monté une
   fois dans `Layout` : visite datée, langue utilisée, route ouverte (section
   + article lu, mémorisé par slug), session connectée (connexion, inscription,
   comptes tiers) et lecture d'une vidéo — annoncée par le coordinateur
   « une seule vidéo à la fois » (`VIDEO_PLAYED_EVENT`, aussi émis pour le
   direct) ;
2. **le moteur** (`src/achievements/engine.js`) applique l'action à l'état du
   joueur (compteurs, ensembles de contenus distincts, jours de visite, séries)
   puis débloque les succès dont la métrique atteint la cible ;
3. **le catalogue** (`src/achievements/catalog.js`) ne contient que des
   données : `{ id, icon, group, rarity, xp, metric, target, labels }`, les
   libellés étant donnés en FR / EN / AR.

| Action suivie | Métrique(s) alimentée(s) |
| --- | --- |
| `page_view` | `pagesVisited` |
| `visit` (une par jour) | `visitDays`, `bestStreak` |
| `article_read` (actu / test / dossier) | `articlesRead`, `newsRead`, `reviewsRead`, `dossiersRead`, `readAllKinds` (les trois familles), `nightReading` (entre 0 h et 5 h), `nightReadingDays` (nuits distinctes), `earlyReading` (entre 5 h et 8 h) |
| `section_visited` | `sectionsVisited`, `profileOpened` |
| `video_played` | `videosWatched`, `liveWatched` |
| `comment_posted` | `commentsPosted` |
| `search_performed` | `searchesPerformed`, `distinctSearches` |
| `language_used` | `languagesUsed` — le site n'étant publié qu'en français, seul `fr` est enregistré : « Polyglotte » et « Trilingue » restent au catalogue mais ne se débloquent plus |
| `account_created` / `signed_in` | `accountsCreated`, `sessions` |
| `provider_linked` | `providersLinked` |
| `profile_updated` | `profileUpdates` |
| `mirage_cup_won` (une coupe remportée) | `mirageCupsWon` |
| `mirage_run` (course Mirage Rush terminée : terrain, mode, score, cristaux, victoire) | `mirageRuns`, `mirageWins`, `mirageBestScore`, `mirageBestGems`, `mirageStagesCleared`, `mirageModesPlayed` |
| `vice_city_run` (course Vice City Rush terminée : ville, mode, place, butin, chapitre d'histoire) | `viceCityRuns`, `viceCityWins`, `viceCityBestScore`, `viceCityCitiesDriven`, `viceCityCitiesWon`, `viceCityModesPlayed`, `viceCityStoryChapters` |

### Ajouter un succès (ou une action)

Un succès pour une action déjà suivie = **une entrée** dans
`src/achievements/catalog.js` :

```js
{ id: 'dossier-fan', icon: '🗂️', group: 'reading', rarity: 'gold', xp: 90,
  metric: 'dossiersRead', target: 5,
  labels: {
    en: { name: 'Dossier fan', desc: 'Read 5 dossiers.' },
    fr: { name: 'Fan de dossiers', desc: 'Lis 5 dossiers.' },
    ar: { name: 'من عشاق الملفات', desc: 'اقرأ 5 ملفات.' },
  } }
```

Rien d'autre : la progression, les notifications, le compteur du hub et la
section « succès » du profil sont déduits du catalogue. Une **nouvelle action**
(un nouveau geste sur le site) ajoute d'abord un cas dans `reduce()` et une
métrique dans `METRICS` (`engine.js`), puis autant de succès que voulu.

Un succès ajouté plus tard profite aux joueurs existants : le catalogue est
réévalué au chargement (`evaluate()`), donc les actions déjà enregistrées
débloquent le nouvel objectif sans être rejouées.

### Trophées des jeux d'arcade : Mirage Rush et Vice City Rush

Dix-huit trophées (neuf par jeu) se gagnent **manette en main**, sur le site :

| Jeu | Ce qui se gagne | Trophées |
| --- | --- | --- |
| Mirage Rush (`/jeu/mirage-rush`) | première course, trois puis dix terrains, 15 cristaux sur une course, 1 000 puis 3 000 points, cinq victoires, première coupe, les quatre coupes | premier galop, trois horizons, mains de cristal, mille éclats, premier trophée, cinq victoires, tempête d'or, carte complète, vitrine complète |
| Vice City Rush (`/jeu/vice-city-rush`) | première course, premier puis sixième chapitre d'histoire, première victoire, les trois modes, 1 500 puis 4 000 points de butin, les cinq villes, une victoire par ville | premier départ, chapitre un, première place, trois styles, butin de rue, tour du monde, coffre plein, fin de l'histoire, grand chelem |

Chaque course terminée envoie une action au moteur — `mirage_run` (terrain,
mode, score, cristaux, première place) depuis `MirageRushPage.jsx`,
`vice_city_run` (ville, mode, place, butin, chapitre d'histoire gagné) depuis
`ViceCityRushPage.jsx`. Le moteur ne garde que ce qui doit durer : les
**records** (score, cristaux) au maximum — une fusion entre appareils prend le
meilleur —, les choses **distinctes** en ensembles (un terrain rejoué, une
ville recorourue ou un chapitre revécu ne comptent pas deux fois), et un
compteur par victoire. Le mode Histoire de Vice City Rush n'est pas un « mode
de course » : il alimente ses trophées de chapitres sans valider « trois
styles ». Les cibles suivent le contenu réel des jeux (dix terrains, quatre
coupes, cinq villes, six chapitres) et `npm run check:achievements` rejoue une
saison complète pour vérifier que chaque trophée reste atteignable.

Les icônes de ces trophées ne viennent pas de 3dicons.co : ce sont des
**médaillons dessinés** (`.svg`), générés par `node scripts/trophy-icons.mjs`
(sans aucune dépendance) — palette du jeu (désert crépusculaire / néons 1986),
métal du grade (bronze, argent, or, platine) et emblème propre à chaque
trophée (fer à cheval, cristaux, coupe, volant, drapeau à damier, skyline…).
Le générateur lit le catalogue : un trophée de jeu sans emblème le fait
échouer, aucune icône ne peut manquer.

### Où vit la progression

La progression appartient à **chaque joueur**, jamais à un appareil :

- **Visiteur (sans compte)** — `localStorage`, clé `letsplay_achievements_v1:guest` :
  le site statique fonctionne sans backend, un visiteur non connecté débloque
  déjà des succès, mais ils restent liés à cet appareil ;
- **Compte connecté** — table Supabase `public.player_progress` (une ligne par
  compte, protégée par RLS : chacun ne lit et n'écrit que sa ligne). C'est la
  **référence** : elle est chargée à la connexion, mise à jour après chaque
  action (écriture différée de 1,5 s pour les rafales), et sa lecture fait
  suivre le joueur d'un appareil à l'autre. Un cache local par compte
  (`letsplay_achievements_v1:u:<id>`) sert de filet hors ligne.
  Un compte **neuf démarre au niveau 1, sans aucun succès**, même sur un
  appareil où l'on a déjà joué : la progression locale de l'appareil n'est
  jamais publiée vers un compte, et deux comptes sur la même machine restent
  étanches ;
- **Ancien déploiement** (schéma SQL pas encore relancé) : repli transparent
  sur l'ancienne copie dans les métadonnées du compte, puis migration vers la
  table dès qu'elle existe. Les comptes créés avant cette mise à jour gardent
  leur progression (l'ancienne copie du compte est reprise à la première
  connexion) ;
- **Sessions de démonstration** (aperçu réactivé par les fixtures des scripts,
  plus atteint en production) : toujours locales — les liaisons Google /
  Microsoft y sont simulées et ne comptent donc pas comme un compte associé
  (ce succès se débloque avec un vrai compte).

Le niveau et l'XP publics du profil (affichés dans le fil de commentaires) sont
synchronisés avec la progression des succès par un trigger SQL
(`sync_profile_progress`).

Pour appliquer la migration : relancer `supabase/schema.sql` dans le SQL
Editor du projet Supabase (le script est relançable sans risque).

#### Comment vérifier que la progression serveur est active

1. Se connecter, débloquer un succès (par exemple lire un article), attendre
   quelques secondes (écriture différée), puis ouvrir les outils de
   développement → Application → Stockage local : la clé
   `letsplay_achievements_v1:u:<id>` (avec l'identifiant du compte) contient
   la progression ;
2. Dans Supabase → Table Editor → `player_progress` : une ligne existe pour
   ce compte, avec `updated_at` récent et les succès dans `state` ;
3. Ouvrir le site dans **un autre navigateur** (ou en navigation privée), s'y
   connecter avec le même compte : les succès et le niveau suivent — la copie
   serveur est bien la référence. Un compte neuf y démarre au niveau 1, même
   si l'autre navigateur a une progression invité.

### Vérifications

- `npm run check:achievements` — cinq niveaux : cohérence du catalogue
  (identifiants uniques, trois langues, métriques connues, cibles et XP
  valides) ; comportement du moteur (contenus distincts, lecture de nuit,
  séries de jours, fusion appareil ↔ compte, données corrompues, courbe de
  niveau, détection du passage de niveau) ; **scénario complet qui débloque les
  42 succès** (donc aucun succès inatteignable) ; rendu réel en SSR du panneau
  du profil joueur et du hub — en aperçu de démonstration **et avec un compte réellement
  connecté** (la barre d'XP du profil doit se remplir, être la seule de la
  page, et annoncer le niveau et le rang déduits du moteur), la **bulle
  d'information** d'une carte de succès montée dans jsdom avec une géométrie
  de téléphone (elle est décalée pour rester dans l'écran, et bascule sous la
  carte quand il n'y a pas la place au-dessus) — et
  de la **fenêtre de déblocage** (montée avec la file qu'un
  joueur verrait après une action : succès, rareté, XP, palier franchi,
  compteur de file, boîte de dialogue accessible, rien sans succès à fêter),
  plus la source du site (actions branchées, fenêtre montée dans `main.jsx`,
  plus aucun reste des anciennes notifications, un seul module écrit la
  progression locale).
- `npm run check:i18n` — les routes × FR / EN / AR (la langue se passe au
  provider, le site étant publié en français), dont le hub joueur `/auth`.
- `npm run check:headlines` — tous les gros titres rendus (h1 de page, d'article
  et de dossier, h2 de carte et de section), mesurés à seize largeurs de fenêtre
  d'après les métriques d'Orbitron : aucun ne doit dépasser trois lignes.
- `npm run check:auth` — les deux boutons de compte de la navigation : lecture du
  `?mode=` (les deux boutons, `?mode=` vide ou inconnu, priorité de la prop
  `/register`), rendu SSR réel de chaque URL (quel formulaire s'ouvre : pseudo et
  confirmation côté inscription, « mot de passe oublié » côté connexion), liens de
  la navbar, et garde-fous de source pour que le mode initial continue de suivre
  l'URL — y compris quand le pop-up est déjà ouvert.

## Quizz gaming, cinéma & pop culture et quizz du jour

Nouvelle section éditoriale : `/quizz` (grille + quizz du jour) et
`/quizz/:slug` (partie, corrections, commentaires), alias anglais `/quiz` et
`/quizzes`. Le rendu se replie sur `fr` tant qu'une traduction `en`/`ar` manque,
mais la structure de données les accepte déjà.

Dans la barre de navigation, les quizz ne prennent plus une pastille à part :
ils vivent dans le sous-menu de l'entrée **Jeux** — **Jeux-vidéo** (`/jeu`) et
**Quizz** (`/quizz`) — voir « Barre de navigation : le logo et le menu Jeux ».
Les routes, elles, ne bougent pas.

- **Filtre par famille** — au-dessus de la grille, cinq pastilles : **Tous**
  (le catalogue entier, actif par défaut), **Gaming**, **Tech**, **Cinéma** et
  **E-sport** (`QUIZ_CATEGORIES`). Chaque pastille annonce son nombre de quizz,
  une seule famille est active à la fois, et la ligne de résumé rappelle ce que
  la grille affiche (« 25 quizz au catalogue » / « 2 quizz sur 25 affichés »,
  `aria-live`). Le filtre vit dans l'**URL** (`/quizz?cat=tech`) : le lien est
  partageable, un rechargement ou un retour arrière rouvre la même famille, une
  valeur inconnue retombe sur « Tous ». La bannière du quizz du jour et la carte
  Survival ne sont pas filtrées (elles ont leurs propres catégories 01 / 02).
  `quizCategory` / `quizzesInCategory` / `quizCategoryCounts`
  (`src/quizzesData.js`) portent la règle, `scripts/quiz-smoke.jsx` la vérifie
  (comptes, pastille active, cartes des autres familles absentes, lien direct).
- **Grille** — les vingt-cinq quizz (aucun verrou, aucune pastille de difficulté : la
  progression « n/3 niveaux » remplace l'ancien badge) s'affichent sur **cinq
  colonnes** sur desktop (`repeat(5, minmax(0, 1fr))`, ≈ 230 px par carte), puis
  quatre sous 1200 px, trois sous 1000 px, deux sous 680 px et une sous 460 px.
  **Carte compacte** : miniature, pastilles, **titre** et méta — plus de
  chapeau, le texte court de `labels` n'est affiché que sur la bannière du quizz
  du jour et l'écran d'intro du quizz. La miniature de carte passe en `2/1`
  (l'illustration 16/9 est recadrée par `object-fit: cover`, jamais déformée, la
  bannière du jour garde son 16/9), le `clip-path` et les espacements sont
  resserrés (`gap: 10px`, `padding: 10px`, `gap: 6px` dans le bloc copie,
  `margin-bottom` des pastilles repris par ce `gap`) : ≈ 344 px → ≈ 224 px de
  haut par carte dans une colonne de 232 px. Les titres des cartes
  suivent une taille fluide `clamp(15px → 17px)` avec interligne 1.25,
  `text-wrap: balance` (coupe harmonieuse sur deux lignes) et
  `overflow-wrap: break-word` en garde-fou — un titre reste **toujours affiché
  en entier**, jamais tronqué.
- **Données** — `src/quizzesData.js` : vingt-cinq quizz (gaming, consoles,
  e-sport, tech, cinéma & pop culture ; trois nouveaux thèmes : films cultes,
  super-héros Marvel/DC et séries cultes), la plupart liés à un article maison
  (`source`). Chaque quizz déclare aussi sa **famille** (`category`, une seule,
  parmi `QUIZ_CATEGORIES` : gaming, tech, cinéma, e-sport) — c'est elle que
  filtrent les pastilles, `tag` restant l'étiquette fine affichée sur la carte
  (Tech et PC → Tech, Cinéma et Séries → Cinéma, E-sport → E-sport, le reste →
  Gaming ; famille absente ou inconnue : repli sur Gaming, jamais de quizz
  perdu). **Chaque quizz porte trois niveaux** (`levels.easy` /
  `levels.medium` / `levels.hard`, `QUIZ_LEVELS`), huit questions dans chaque
  banque (24 questions uniques par quizz, 600 au total). L'Expert en tire dix
  différentes à chaque tentative depuis l'ensemble de ces trois banques. Les helpers
  `quizLevelQuestions(quiz, level)` et `quizQuestionsCount(quiz)` évitent
  d'accéder aux niveaux à la main
  (`QUIZ_DIFFICULTIES` reste exporté comme alias de `QUIZ_LEVELS`, et
  `quizQuestions(quiz, level)` comme alias de `quizLevelQuestions` : les
  appelants historiques continuent de fonctionner). Ajouter un quizz = une
  entrée : la grille, la recherche (`searchIndex`), la rotation du jour et le
  succès « Tour complet » le prennent en compte (mettre à jour la cible du
  succès si le nombre de quizz change).
- **Niveaux & déblocage** — les **quizz sont tous jouables dès l'arrivée** :
  plus aucune difficulté affichée sur la grille, aucun quizz verrouillé. La
  difficulté se choisit DANS le quizz (écran d'introduction, une carte par
  niveau) : le **Facile** est ouvert, le **Confirmé** se débloque en terminant
  le Facile, l'**Expert** en terminant le Confirmé (progression en cascade).
  Les niveaux fermés affichent leur cadenas 🔒 et la condition à remplir ; le
  niveau qui vient de s'ouvrir est annoncé (« Niveau Confirmé débloqué ») avec
  un bouton pour l'enchaîner. Règle pure, stockage local et copie serveur :
  `src/quizzes/quizProgress.js` (+ hook `useQuizProgress`). La progression
  suit le compte connecté (`public.quiz_progress`, une ligne par palier
  terminé) et se **fusionne** avec la copie locale `localStorage`
  (`letsplay_quiz_levels_v2`) — hors-ligne, c'est elle qui fait foi. Les
  cartes de la grille et la bannière du jour affichent la progression
  « n/3 niveaux ».
- **Quizz TERMINÉ (les trois niveaux faits)** — un quizz dont les niveaux
  Facile, Confirmé **et** Expert sont terminés passe en état « terminé » :
  `isQuizFinished(progress, quizId)` (`src/quizzes/quizProgress.js`, fonction
  pure) renvoie `true` dès que `levelsDone` atteint `QUIZ_LEVELS.length`. Le
  quizz reste **visible mais verrouillé** partout où il est proposé : la carte
  de la grille, la bannière du quizz du jour, la bande « quizz du jour » de
  l'accueil, les résultats de `/recherche` et la recherche instantanée de la
  nav. Concrètement : miniature et carte en **niveaux de gris**
  (`grayscale(1)` + légère baisse de luminosité, `quiz.css`), drapeau
  `✓ TERMINÉ` sur la miniature, tampon à la place de la pastille « n/3
  niveaux », mention « Trois niveaux terminés » sur la bannière, flèche ↗
  retirée — et surtout **le `<Link>` est remplacé par un `<div>`/`<span>` non
  cliquable** (`cursor: default`, `pointer-events: none`, aucun effet de
  survol). Le lecteur (`/quizz/:slug`) remplace son sélecteur de niveaux par un
  écran « terminé » : les trois niveaux cochés, le record de l'appareil, le
  réglage du son, et les sorties (tous les quizz, article source) — impossible
  de relancer une partie depuis cet écran. L'écran de résultat de la dernière
  partie affiche le badge « Quizz terminé » et garde ses actions (révision des
  erreurs, « Rejouer ») : ces parties ne rapportent plus rien (règle
  anti-rejeu), elles restent seulement consultables. Conséquence assumée : si
  le quizz du jour est déjà terminé, la bannière et l'accueil renvoient à la
  grille `/quizz` (la série « Semaine parfaite » ne peut plus s'alimenter ce
  jour-là). La progression lue est l'union `localStorage` + `public.quiz_progress`
  ; comme plusieurs surfaces partagent la même page (nav + accueil + grille),
  `fetchAccountProgress` met sa promesse **en cache par compte**
  (`accountProgressCache`) : un seul appel serveur par page chargée, rafraîchi
  par `pushLevelCompleted` à chaque niveau terminé.
- **Miniatures** — chaque quizz a sa propre illustration 16/9
  (`image`, fabriquée par `quizThumbUrl(slug)` depuis
  `public/quizzes/<slug>.jpg`) : une par thème, à la charte du site. La carte de
  la grille (recadrée en 2:1 pour garder la grille compacte), la bannière du
  quizz du jour et les résultats de recherche
  l'affichent. L'épisode lié (`videoId`) reste en repli : `VideoThumb` reçoit
  l'illustration en `lead` et ne descend l'échelle YouTube que si le fichier
  manque — aucune requête `i.ytimg.com` dans le cas nominal. Ajouter un
  quizz = déposer son illustration sous ce nom, `check:thumbs` le vérifie.
- **Moteur** — `src/quizzes/engine.js` (pur, sans React, importable par Node) :
  `prepareQuiz(quiz, level, seed, { extraDistractors, questionPool, questionCount })`
  utilise la banque du niveau demandé, sauf si un pool et une limite sont
  fournis. En Expert, le lecteur tire **10 questions distinctes** dans la
  banque complète du quizz (24 questions, tous niveaux confondus), avec un
  nouveau tirage à chaque tentative et sans reprendre les questions de la
  tentative précédente. L'ordre et les choix sont mélangés, la bonne réponse
  voyage avec son choix ; le piège Expert est tiré des autres réponses de la
  banque, jamais de la bonne réponse et jamais en doublon. Le mélange des
  niveaux Facile/Confirmé du quizz du jour reste déterministe par graine :
  même tirage pour tout le monde ; l'Expert est volontairement aléatoire. Le
  moteur gère aussi le barème, les paliers de résultat (`rookie` → `legend`),
  la meilleure série de jours consécutifs et les **multiplicateurs de niveau**
  (`DIFFICULTY_MULTIPLIER` :
  Facile ×1, Confirmé ×1,5, Expert ×2 — `quizPointsFor` met le barème base +
  rapidité + combo à l'échelle, plafond 200/300/400 par question, revérifié
  côté serveur). Le niveau joué voyage avec la partie préparée
  (`prepared.level`).
- **Règles par niveau** — `LEVEL_RULES` : le niveau ne change pas que les
  questions et les points, il change **la façon de jouer** — temps par
  question, nombre de propositions, vies, jokers et durée du gel de verdict :

  | Niveau | Questions par tentative | Temps | Propositions | Vies | Jokers (50/50 + gel) | Gel de verdict |
  | --- | --- | --- | --- | --- | --- | --- |
  | Facile | 8 | 20 s | 4 | — | 2 + 1 | 600 ms |
  | Confirmé | 8 | 15 s | 4 | — | 1 + 1 | 600 ms |
  | Expert | 10 tirées au hasard | 10 s | 5 (dont un piège) | 1 | aucun | 450 ms |

  `QUESTION_TIME.seconds` (15 s) reste la **référence** : chaque niveau la met
  à l'échelle (`questionBudgetMs`), donc raccourcir la référence raccourcit les
  trois budgets ensemble. Ces règles sont annoncées **avant** de jouer (carte
  « Règles de ce niveau » du sélecteur, `levelBrief`) et appliquées en partie
  (`resetRun`) — pas de piège pour le joueur. L'Expert se rejoue autant de fois
  que nécessaire : une erreur ou un temps écoulé l'élimine immédiatement ; le
  bouton « Réessayer » relance une tentative avec dix questions inédites. Le
  niveau n'est validé et ne crédite points/XP, record ou classement qu'après
  un 10/10 sans faute. Une fois réussi, il rapporte comme les autres niveaux
  une seule fois.
- **Jokers** — deux par partie, hors expert : **50/50** (deux mauvaises
  propositions passent en `is-eliminated`, sans jamais toucher la bonne réponse
  ni décaler la grille — le bouton reste en place, cliquable en apparence
  seulement) et **gel du chrono** (la barre se fige et remonte de
  `FREEZE_BONUS.seconds` = 8 s, ce qui rend la partie possible sans rendre la
  question plus simple). Les boutons affichent le nombre restant, sont coupés
  pendant le gel de verdict et se jouent aussi au clavier (`D` et `F`).
- **Vies & fin de partie** — en Expert, une seule vie : la première erreur ou
  expiration du chrono élimine le joueur immédiatement. L'écran affiche le
  résultat partiel et les corrections des dix questions ; « Réessayer » lance
  une nouvelle sélection aléatoire, sans points, XP, record, classement ni
  progression crédités sur une tentative éliminée. Seul un 10/10 sans faute
  valide ce niveau et attribue les points.
- **Minuteur** — budget par question selon le niveau (20 s / 15 s / 10 s,
  `questionBudgetMs`) : une barre de décompte passe au rouge dans les 3
  dernières secondes et, à zéro, la question avance sans réponse (comptée
  ratée, signalée « Temps écoulé » dans les corrections).
- **Sons** — `src/quizzes/quizSounds.js` : tout est synthétisé en Web Audio,
  aucun fichier audio à livrer. Un tick-tack discret tourne en fond pendant
  chaque question et **accélère par paliers** quand le temps baisse (une
  pulsation par seconde au début, 620 ms à mi-parcours, 340 ms dès que la barre
  passe au rouge — même seuil —, 220 ms dans la dernière seconde et demie, un
  peu plus fort). Une bonne réponse fait monter un accord do–mi–sol, une
  mauvaise descend en dents de scie, le temps écoulé ajoute une note grave
  (ne pas répondre n'est pas se tromper) et chaque jokers a sa signature
  (`playQuizJokerSound` : le 50/50 descend sur deux notes, le gel du chrono
  monte). Tout est best-effort — sans API Web
  Audio, la partie se joue normalement — et un bouton 🔊/🔇 (sur l'intro comme
  pendant la partie) coupe l'ensemble, la préférence restant sur l'appareil.
  Le son n'étant pas accessible à tous, un compteur ✓/✗ de la partie en cours
  (`aria-live`) dit la même chose à l'écran, et le tick-tack se tait quand
  l'onglet passe en arrière-plan.
- **Feedback instantané & points** — le clic fige la question un court instant
  (`VERDICT_MS` = 600 ms, défini une fois dans le moteur) : le choix cliqué
  passe au vert (petit « pop ») ou au rouge (secousse), la bonne réponse
  s'illumine si elle n'a pas été cliquée, et un bandeau annonce le verdict
  avec une phrase tirée au hasard (`verdicts.right/wrong/timeout`, traduits)
  et les points gagnés. Les points sont le barème du classement :
  base 100 + rapidité (jusqu'à 50, `quizPoints` du moteur) + combo (jusqu'à
  50, les bonnes réponses consécutives) — 200 max par question, MULTIPLIÉ par
  la difficulté choisie (×1 / ×1,5 / ×2 → plafond 200/300/400 par question).
  Ils s'affichent en direct dans la barre du lecteur (⚡ + série 🔥 dès ×2,
  bip de combo dont la note monte avec la série) et sur l'écran de résultat
  (total + meilleure série). Ils font le classement des quizz et le record de
  l'appareil (le plus de points, `correct/total` en départage) ; les succès et
  les paliers de résultat restent calculés sur `correct/total`.
  **Un quizz ne rapporte que par difficulté, et une fois par difficulté** :
  rejouer une difficulté déjà terminée (bouton « Rejouer ») ou « rejouer ses
  erreurs » accumule 0 point — bandeau, compteur et résultat le disent — et
  rien n'est écrit (ni succès/XP, ni record de l'appareil, ni classement),
  quoi que le joueur réponde.
  Raccourcis clavier : les touches **1–5** valident le choix affiché (les
  propositions éliminées par un 50/50 sont ignorées, jamais pendant le gel,
  jamais dans un champ de saisie) et `D` / `F` jouent les jokers — l'astuce
  affichée suit le nombre réel de propositions du niveau.
  Le sans-faute fait pleuvoir des confettis sur l'écran de résultat
  (`QuizConfetti`, DOM/CSS sans canvas, pluie de trois secondes) et chaque
  palier joue sa fanfare (`legend` = montée de quatre notes).
  Une partie qui bat le record de l'appareil pour **ce niveau** est annoncée
  (« Nouveau record », comparé **avant** d'écrire).
- **Lecteur de partie & détail** — la refonte du lecteur : une pastille par
  question (`quiz-pip`, verte/rouge, celle en cours signalée), un bandeau
  compact (✓/✗, points, jokers, série, cœurs), des boutons d'action compacts
  (`.quiz-cta` à la place du `.button` géant du site, avec l'accent du niveau
  joué) et, au résultat, un **détail de partie** (`quiz-stats`) : réussite,
  points, meilleure série, temps de réponse moyen, jokers dépensés et vies
  restantes en expert. La série en cours passe par des paliers nommés
  (`streakLevel` : `cold`/`warm`/`hot`/`blazing` — « Ça monte », « En feu »,
  « Inarrêtable »). Tout reste lisible sans mouvement
  (`prefers-reduced-motion` coupe secousses, pulses et confettis).
- **Quizz du jour** — rotation par journée locale sur le catalogue, bannière
  sur `/quizz` (avec compte à rebours « nouveau quizz dans… », horloge simulée
  `?at=` partagée avec les autres comptes à rebours) et bandeau d'accueil ;
  terminer le quizz du jour crédite un jour de série (succès platine
  « Semaine parfaite » = 7 jours d'affilée). La meilleure partie de l'appareil
  (points + bonnes réponses), **tous niveaux confondus**, s'affiche sur chaque
  carte de la grille, avec son niveau en infobulle.
- **Succès & XP** — l'action `quiz_completed` (`QuizPlayer`) porte le `level`
  joué ET les `points` du run : chaque niveau d'un quizz ne rapporte qu'à sa
  PREMIÈRE complétion (`quizzes_played`, clé `slug:niveau` — la même que le
  record de l'appareil et la tentative serveur), et ces points deviennent de
  l'XP joueur (`quizPoints`, clé `slug:niveau`, fusionnable entre appareils).
  `perfect_quizzes` reste indexé par SLUG et les métriques qui comptent des
  quizz (« Tour complet ») ramènent la clé à son slug : un quizz reste un
  quizz, même joué à trois niveaux. Rejouer un niveau terminé ne fait plus
  avancer aucun succès (ni compteur, ni sans-faute, ni XP, ni points) — sauf le
  jour de quizz du jour, qui reste crédité pour ne pas casser la série
  « Semaine parfaite ». Cinq succès au catalogue : Premier quizz (bronze),
  Rival trouvé (bronze, premier défi envoyé), Sans faute (argent), Tour
  complet (or), Semaine parfaite (platine). Une complétion enregistrée avant
  les niveaux (clé au slug nu) compte pour le niveau Facile, et seulement tant
  qu'aucun niveau n'a été enregistré pour ce quizz (compatibilité).- **Révision des erreurs** — depuis l'écran de résultat, « Rejouer mes erreurs »
  ne rejoue que les questions ratées (tour d'entraînement : succès, record,
  série, classement et points ne bougent pas, vérifié par `check:quiz`).
- **Défi entre amis** — depuis l'écran de résultat, `QuizChallenge` envoie à
  un ami (messagerie 1-à-1 existante, mode démo ou Supabase) un message
  pré-rempli avec le score à battre ; sans compte ni backend, un message
  l'explique. Chaque défi crédite `quiz_challenge`.
- **Scores & classement** — les niveaux sont **séparés** : la clé d'une
  tentative est `slug:niveau` (`attemptKey` dans `src/quizzes/quizApi.js`),
  donc chaque palier a son propre classement et son propre record d'appareil
  (un sans-faute en Expert ne se compare pas à un Facile) ; le classement
  affiché suit le niveau choisi. `supabase/schema.sql` (section 8) : table
  `public.quiz_attempts` (PREMIÈRE COMPLÉTION par compte et par RUN — rejoué,
  un niveau ne remonte plus la ligne du joueur, `on conflict … do nothing` ;
  bornes `0 ≤ score ≤ total` et `100 × mult × score ≤ points ≤ 200 × mult × total`
  vérifiées côté serveur, le multiplicateur mult ∈ {1, 1,5, 2} étant déduit du
  suffixe de `quiz_id`) + RPC `submit_quiz_attempt` (avec `p_points`), `get_quiz_leaderboard`
  (top 10 trié par POINTS gagnés — les bonnes réponses du run servent de
  départage et s'affichent en secondaire, jointes aux profils, ligne du joueur
  marquée `mine`) et `get_quiz_global_rank` (position au classement GLOBAL des
  quizz : somme des points des meilleures parties, tous quizz confondus —
  rang, points, quizz joués, joueurs classés), non exposées en direct (revoke).
  Le compte connecté envoie sa tentative à la fin de la partie
  (`src/quizzes/quizApi.js`, `quizId` = `slug:niveau`, avec repli sur l'ancienne
  signature de la RPC si le déploiement est antérieur aux points) — mais
  seulement si ce niveau est nouveau pour le joueur ; le visiteur garde ses
  parties sur l'appareil (`localStorage`, clé propre aux quizz, une entrée par
  `slug:niveau`, les anciens enregistrements au slug nu restant lus). La progression
  des niveaux d'un compte vit dans `public.quiz_progress` (table RLS : chaque
  joueur ne lit et n'écrit que ses lignes ; aucune exposition à `anon`). La page de  profil affiche la position du joueur par rapport au classement global
  (`src/quizzes/QuizGlobalRank.jsx`, profil personnel comme profils publics) ;
  sans backend, la section explique comment la débloquer. Après collage du
  schéma dans le Dashboard Supabase, le tableau de contrôle final affiche les
  lignes 31–35 « OK ».
- **Remise à zéro de tous les quizz pour tous les joueurs** —
  `supabase/reset-quiz-ranking.sql`, à coller dans le SQL Editor du Dashboard.
  Le script est explicitement destructif : il vide `public.quiz_attempts` et
  `public.quiz_progress`, puis efface dans `player_progress` les points,
  compteurs, ensembles, succès et défis du groupe « quiz ». Les comptes,
  profils et progression non liée aux quizz sont conservés ; l'XP et le niveau
  restants sont recalculés. Les copies locales sont également invalidées par
  les clés v2/v3 et `quizResetVersion`, afin qu'un ancien navigateur ne
  reverrouille pas les quizz après le reset. Recoller `schema.sql` n'exécute
  jamais cette opération : lance le fichier de maintenance séparément.
- **Vérification** — `npm run check:quiz` : moteur (jour, mélange, barème,
  multiplicateurs ×1/×1,5/×2 par niveau, points bornés (200/300/400 par
  question) qui font le classement, série, minuteur à 15 s, banques de huit
  questions par niveau sans identifiant partagé et tirage Expert de dix sur 24), règles de
  déblocage en cascade (`quizProgress` : Facile ouvert, Confirmé puis Expert
  débloqués), miniatures (une illustration distincte par quizz, demandée par
  les cartes rendues — aucune requête YouTube), partie complète jouée en jsdom
  avec la vraie pile de providers : cadenas du départ, partie Facile 8/8 dont
  les points deviennent de l'XP joueur, annonce « Niveau Confirmé débloqué »,
  enchaînement du niveau Confirmé qui ouvre l'Expert, replay d'un niveau
  terminé = 0 point et rien d'écrit (ni progression, ni record, ni XP), succès
  crédités dans le stockage (une clé de run `slug:niveau` par niveau joué),
  confettis du sans-faute, points et meilleure série affichés,
  grille rendue en FR/EN/AR (aucune pastille de difficulté, progression
  affichée),  record de l'appareil par points (meilleure partie = le plus de points,
  départage aux bonnes réponses), classement par points (points affichés en
  premier, score/total en secondaire, repli ancien backend) et position au
  classement global affichée sur la page de profil (repli hors-ligne expliqué),
  règles par niveau (20 s / 15 s / 10 s, cinq propositions et une vie en
  Expert, jokers 50/50 + gel du chrono hors expert, pièges experts jamais bons
  ni doublés, élimination au premier échec, aucun point sur une défaite, dix
  questions renouvelées sans répétition entre l'échec et la reprise, bouton
  « Réessayer » Expert uniquement, progression débloquée après 10/10), verdict
  (gel avec choix
  verrouillés, vert/rouge, bonne réponse révélée, bandeau avec points),
  raccourcis clavier 1–5 (+ `D` et `F` pour les jokers ; la touche pendant le
  gel est ignorée), sons (tempo qui accélère sans jamais ralentir et sans
  attendre le battement suivant, battement réel, verdicts juste / faux / temps
  écoulé, combo dont la note monte avec la série, jokers — le 50/50 descend et
  le gel monte —, fanfare du palier, coupure depuis le bouton 🔊, no-op sans
  Web Audio), refonte du lecteur (CTA compacts, pastilles de progression,
  50/50 qui élimine deux mauvaises réponses sans toucher la bonne, gel du
  chrono, détail de partie) et niveau expert en conditions réelles (cinq
  propositions, une seule vie, élimination dès la première erreur, points
  crédités uniquement après 10/10, retry réservé aux défaites Expert, questions
  renouvelées entre tentatives, points ×2 sur un sans-faute, et état « terminé »
  (`isQuizFinished` : carte grisée rendue en `<div>` sans lien ni flèche,
  drapeau `✓ TERMINÉ` sur la miniature, tampon à la place de la pastille
  « n/3 niveaux », bannière du jour verrouillée sans compte à rebours avec son
  indice dédié, écran « terminé » du lecteur à la place du sélecteur de
  niveaux — trois niveaux cochés, aucun bouton pour relancer, réglage du son et
  sortie vers la grille toujours présents) — le tout avec un faux `AudioContext`
  qui enregistre les oscillateurs lancés. Le scénario de
  `check:achievements` débloque aussi les cinq succès quizz ; `check:i18n`
  rend les nouvelles routes dans les trois langues ; `check:thumbs` vérifie les
  fichiers livrés dans `public/quizzes/`.

## Live YouTube

La page d’accueil contient un lecteur live YouTube permanent basé sur l’ID de la
chaîne. Copiez `.env.example` vers `.env.local` si nécessaire et vérifiez
`VITE_YOUTUBE_CHANNEL_ID`. Pour Let’s Play Official, l’ID est
`UCBi989OGXiGBjvB17Xh5GUQ`.

Cette intégration fonctionne sur un hébergement statique, sans Vercel, sans clé API
et sans backend. YouTube résout automatiquement l’URL vers le direct public actif.
Quand la chaîne n’est pas en direct, le lecteur YouTube affiche son état hors ligne.


## Partenaires

Les partenaires sont déclarés dans `src/partnersData.js` (nom, liens, couleur de
marque) et leurs textes traduits vivent dans `t.partners` / `t.home.partners`
(`src/i18n/translations.js`), en français, anglais et arabe.

Par défaut, chaque marque s’affiche sous forme de monogramme aux couleurs du
partenaire (`src/components/PartnerMark.jsx`). Pour utiliser un logo officiel,
déposez le fichier dans `public/partners/` puis renseignez le champ `logo`
correspondant dans `src/partnersData.js`, par exemple :

```js
{ id: 'tcl', logo: 'partners/tcl.png' /* … */ }
```

## 7ouma Arena (page Events)

7ouma Arena est expliqué en tête de la page Events (`/events`, alias
`/partenaires`) par le composant `src/components/ArenaShowcase.jsx` : le
rendez-vous y est présenté comme **une émission et un tournoi** — « by Djezzy »
pour la marque qui le présente, organisé par **EGOR Gaming avec l’équipe
Let’s Play** pour la partie compétition. La section déroule les deux formats,
les rôles de chacun, le contenu de l’émission puis ses sources.

Les textes vivent dans les objets `copy` fr / en / ar du composant, et les
fiches partenaires correspondantes (`djezzy`, `7ouma-arena`, `egor-gaming`) dans
`src/partnersData.js` — elles alimentent aussi la carte d’accueil, qui renvoie
vers la section via `partner.page` (`/events#7ouma-arena-show`).

Trace publique utilisée : l’annonce de lancement du show
(`arenaLaunchSource` dans `src/partnersData.js`), complétée par les sites
officiels de Djezzy et d’EGOR Gaming. La participation de l’équipe Let’s Play
est confirmée par l’équipe elle-même — c’est indiqué comme tel sur la page.

## Calendrier des sorties & compte à rebours « le plus attendu » (page Actus)

Tout part d'une seule liste : `gameReleases` dans `src/releasesData.js`. La page
Actus (`src/pages/News.jsx`) ne cite aucun jeu en dur — ni dans le compte à rebours,
ni dans les libellés de mois.

### Le compte à rebours tourne tout seul

Le bloc prend le premier de la file des sorties **pas encore disponibles**, triée par :

1. `awaitedRank` — rang éditorial (« le plus attendu » = `1`, celui qui prend le relais = `2`, …) ;
2. puis date de sortie (les jeux sans `awaitedRank` ne sont proposés qu'en dernier
   recours, ce qui évite un bloc vide tant qu'il reste une sortie au calendrier).

Le décompte se fait à la seconde près côté visiteur : le basculement sur le jeu
suivant a donc lieu tout seul, même onglet ouvert, **sans redéploiement**. Trois états :

- **avant la sortie** — titre, date et chiffres du jeu en cours ;
- **jour J** — les chiffres comptent déjà le jeu suivant, et une pastille
  « SORTI AUJOURD'HUI · {titre} » + une ligne de contexte préviennent le lecteur ;
- **calendrier épuisé** — « CALENDRIER À JOUR », chiffres à `--`, visuel de la dernière sortie.

Changer de jeu « le plus attendu » = changer les `awaitedRank`. Rien d'autre.

### Le calendrier peut couvrir plusieurs mois

Une entrée peut préciser `month` (et `year`). La grille et la frise affichent le
**mois actif** : le mois courant s'il a des sorties, sinon le mois de la prochaine
sortie annoncée, sinon le dernier mois connu. Le compte à rebours, lui, ignore les
frontières de mois — dès que septembre est terminé, il enchaîne sur le premier jeu
d'octobre poussé dans la liste. Les libellés (« SEPTEMBRE 2026 », « 15 SEP », la
frise 01→30/31) sont déduits des données et localisés, rien n'est codé en dur.

Faire suivre la saison :

```js
// src/releasesData.js
{ slug: 'metroid-ravenous', month: 10, day: 28, title: 'Metroid Ravenous',
  platforms: 'SWITCH 2', image: 'releases/metroid-ravenous.jpg',
  alt: 'Metroid Ravenous — Samus dans une grotte organique', awaitedRank: 9 }
```

- déposer le visuel 16:9 (800×450) dans `public/releases/` ;
- `awaitedRank` est une échelle **globale** : le premier jeu d'octobre prend le rang
  qui suit le dernier de septembre ;
- `countdownImage` (optionnel) donne un visuel dédié au bloc « le plus attendu ».

### La liste complète vit sur sa propre page : `/calendrier`

La grille des sorties ne reste plus sur la page Actus : le lien
« VOIR LE CALENDRIER COMPLET » (en tête de section et en bandeau sous le compte
à rebours) ouvre la page interne `/calendrier` (alias `/calendar`, route
`src/pages/Calendar.jsx`). Elle déroule **tous les mois ayant au moins une
sortie datée** — septembre 2026 → avril 2027 — avec :

- une barre de navigation collante (un chip par mois, avec le nombre de sorties) ;
- pour chaque mois, la même frise et les mêmes cartes que la section Actus
  (`MonthTimeline` / `ReleaseGrid`, composants partagés dans
  `src/components/ReleasesCalendar.jsx`) ;
- le compte à rebours « le plus attendu » en tête de page ;
- les cartes dont l'entrée du calendrier fournit un visuel deviennent des liens
  internes quand l'entrée renseigne `to` (ex. Zelda Ocarina → `/news/zelda-ocarina`).

Une sortie sans key art déposé dans `public/releases/` s'affiche quand même,
sous forme de vignette « ticket » (jour + mois, mention « VISUEL À VENIR ») :
rien n'empêche d'ajouter un mois au calendrier en attendant son visuel.

Ajouter un mois = pousser des entrées avec `month` / `year` dans
`src/releasesData.js` : la page `/calendrier` le liste automatiquement
(la barre de mois et les compteurs sont déduits de `calendarMonths()`), et la
page Actus bascule dessus dès que le mois courant n'a plus rien au calendrier.

### Une heure de lancement exacte, si besoin

Par défaut le décompte vise **minuit, heure locale du visiteur** — le basculement ne
tombe donc pas au même moment partout. Pour un lancement mondial synchronisé, renseigner
`releaseAt` (ISO 8601 avec fuseau) ; il prime sur `day`, qui reste utilisé pour la grille :

```js
{ slug: 'marvels-wolverine', day: 15, releaseAt: '2026-09-15T00:00:00Z', /* … */ }
```

### Voir un état futur sans attendre la date

Un paramètre d'URL décale l'horloge de toute la section (figé à l'ouverture, puis
l'horloge simulée avance à vitesse réelle) :

```
/news?at=2026-09-14              → la veille de Marvel’s Wolverine
/news?at=2026-09-15T23:59:55     → le basculement se déclenche en direct
/news?at=2026-09-30              → dernière sortie du mois / état « à jour »
```

### Vérifications

- `npm run check:countdown` — rejoue septembre, le passage de relais multi-mois,
  `releaseAt`, l'ordre de la file, le décompte, les dates localisées et la liste
  des mois de la page `/calendrier` (section 7/7).
- `npm run check:i18n` — toutes les routes × FR / EN / AR, dont les trois états du bloc
  (les textes vivent dans `t.news.calendar` et `t.news.countdown`).

## Une seule vidéo à la fois

Plusieurs pages cumulent les lecteurs YouTube (accueil : 4 reels ; `/reviews` :
dossiers + shorts ; `/events/…` : un épisode par partenaire). Dès qu'un lecteur
démarre, tous les autres sont mis en pause : plus de vidéo qui continue hors
écran pendant qu'on en regarde une autre.

Le comportement vit dans `src/lib/videoPlayback.js` :

- `youTubeEmbedUrl(id, { autoplay, start })` construit l'URL de tous les embeds
  du site et ajoute `enablejsapi=1` — sans ce paramètre, un lecteur YouTube
  reste muet et ne peut plus être piloté depuis la page ;
- `initSinglePlayback()`, démarré dans `src/main.jsx`, repère les iframes
  YouTube du DOM (MutationObserver compris, pour la modale et les embeds
  reconstruits), s'abonne à chacune, puis envoie `pauseVideo` à toutes les
  autres dès qu'un lecteur passe en lecture ;
- `pauseAllPlayback()` coupe tout d'un coup — utilisé à l'ouverture de la modale
  de test (`src/components/VideoModal.jsx`), dont l'autoplay peut être refusé
  par le navigateur.

Un lecteur qui démarre émet aussi `VIDEO_PLAYED_EVENT`
(`letsplay:video-played`, avec l'identifiant de la vidéo) : c'est ce que les
succès écoutent pour compter les vidéos lancées, direct compris
(`src/achievements/AchievementTracker.jsx`). L'événement ne change rien au
comportement de pause.

Aucun script externe : le coordinateur parle directement le protocole
postMessage de l'embed YouTube (`{"event":"listening"}` pour s'abonner,
`{"event":"command","func":"pauseVideo"}` pour couper) et reconnaît le lecteur
qui écrit par sa fenêtre (`event.source`). Il cohabite avec le chapitrage des
dossiers (`src/lib/useChapterVideo.js`) : l'API IFrame et le coordinateur
écoutent la même fenêtre.

Les embeds tiers (Instagram, TikTok…) n'exposent aucun protocole de pause : ils
ne sont pas rechargés, un rechargement relançant leur lecture automatique.

### Vérification

- `npm run check:videos` — l'URL partagée contient bien `enablejsapi=1`, aucun
  composant ne construit son embed à la main, et le protocole est rejoué sur un
  DOM simulé : un lecteur démarre → les autres reçoivent `pauseVideo`, le
  lecteur actif n'est pas touché, un état répété ne renvoie rien, les lecteurs
  retirés de la page sont oubliés.

## Miniatures YouTube : aucune carte sans image

YouTube ne publie pas toutes les qualités de miniature pour toutes les vidéos.
`maxresdefault.jpg` (1280×720) n'existe que si la vidéo a été traitée en HD —
sinon l'URL répond **404** et la carte reste vide. C'était le cas du FreeFire
Algerian Championship 2023 (`twbaM8fiXpo`), épisode partenaire Ooredoo de
l'accueil :

| URL | Réponse |
| --- | --- |
| `https://i.ytimg.com/vi/twbaM8fiXpo/maxresdefault.jpg` | 404 |
| `https://i.ytimg.com/vi/twbaM8fiXpo/hqdefault.jpg` | 200 · JPEG 480×360 |

### La règle

Tout passe par `src/lib/videoThumbnails.js`, seul endroit du site qui écrit une
URL de miniature :

- `youTubeThumbUrl(id, quality)` construit l'URL (alias `maxres`/`hd`, `sd`, `hq`) ;
- `thumbFallbackChain(id, { quality })` donne l'échelle à essayer, de la
  meilleure qualité vers la plus sûre : `maxresdefault → sddefault → hqdefault`,
  le dernier barreau étant toujours publié par YouTube ;
- `VIDEOS_WITHOUT_HD_THUMB` liste les vidéos dont YouTube ne publie aucune
  miniature HD. **Ajouter un identifiant ici suffit** : la chaîne démarre alors
  à `hqdefault`, aucune requête n'est envoyée vers un 404 connu. `twbaM8fiXpo`
  y figure déjà, avec la trace de la mesure ;
- `createThumbFallback()` pilote le repli (position dans l'échelle, échec final)
  et `isThumbMissing()` reconnaît une image « chargée mais vide » ; son option
  `lead` place une ou plusieurs sources **avant** l'échelle YouTube — c'est par
  là que passent les illustrations maison des quizz (`public/quizzes/`), dont
  l'épisode lié n'est alors qu'un repli.

L'afficheur est `src/components/VideoThumb.jsx` : il descend l'échelle et, si
aucune qualité ne répond, dessine un cadre Let's Play (`.video-thumb-fallback`)
à la place de l'image — la grille ne présente jamais de trou. Le repli passe par
deux chemins, parce qu'un seul ne suffit pas : `onError`, puis `isThumbMissing()`
après chaque rendu — un 404 servi depuis le cache du navigateur peut se régler
avant que React n'attache l'écouteur, et l'événement `error` est alors perdu.

```jsx
<VideoThumb className="featured-dossier-thumb" id={ep.id} alt={ep.title} />
<VideoThumb id="A2VPhWOUMHI" alt="25 ans de PlayStation 2" quality="hq" />
```

`quality` fixe la qualité de départ (les cartes de `/dossiers` restent en
`hqdefault`, comme avant) ; sans elle, le composant demande la meilleure
qualité disponible pour cette vidéo.

```jsx
// Grille des quizz : l'illustration maison d'abord, l'épisode en repli.
<VideoThumb id={quiz.videoId} lead={quiz.image} alt={titre} quality="hq" />
```

### Vérification

- `npm run check:thumbs` — l'échelle des qualités et son dernier barreau, le
  pilote rejoué avec une image simulée (chaque qualité manquante fait descendre
  d'un cran, la dernière bascule sur le cadre de repli, aucune requête vers un
  404 connu, l'illustration locale essayée avant YouTube quand elle est passée
  en `lead`), le **rendu réel des pages** en SSR (accueil : trois vignettes,
  `twbaM8fiXpo` en `hqdefault`, HicoSoft toujours en `maxresdefault` ; dossiers :
  huit vignettes ; quizz : bannière du jour + vingt-cinq cartes servies par
  `public/quizzes/`, chaque fichier livré et non tronqué), et la source du site
  (aucune URL de miniature codée en dur hors de `src/lib/videoThumbnails.js`,
  ni de chemin `public/quizzes/` hors de `src/quizzesData.js`, les deux chemins
  du repli présents).

## Dossiers : la vidéo, le chapitrage et les captures de l'épisode

Chaque dossier (`/dossiers/...`, gabarits `src/pages/Dossier*.jsx`) s'ouvre sur
l'épisode YouTube qui l'accompagne, suivi de trois captures de cette vidéo, le
chapitrage venant ensuite et le texte de l'article après.

### L'ordre des blocs, bureau et mobile

La lecture est une grille à zones (`src/dossier-article.css`,
`.dossier-reading`) : `"video sidebar" / "main sidebar"` sur ordinateur — la
vidéo en haut à gauche, le chapitrage collant à droite (`position: sticky`),
le texte dessous — et `"video" "sidebar" "main"` sur téléphone. L'ordre mobile
est donc **vidéo + captures → chapitrage → texte** : on voit d'abord ce dont
parle l'épisode, puis le sommaire du chapitrage, puis l'article. Auparavant,
le chapitrage passait avant la vidéo sur mobile (`grid-row: 1`) : le sommaire
s'affichait avant la vidéo qu'il découpait.

L'ordre du DOM suit le flux mobile (bloc vidéo, puis `<aside>` du chapitrage,
puis colonne de texte) : les lecteurs d'écran lisent les blocs dans le même
ordre que l'affichage, sur les deux supports. `useChapterVideo` n'a rien vu
changer : la référence reste accrochée à `.dossier-video`, quel que soit
l'endroit du bloc dans la page.

### Les captures de l'épisode

Les trois captures sont des **photogrammes de la vidéo elle-même** : YouTube
extrait automatiquement trois images de chaque vidéo (autour du quart, de la
moitié et des trois quarts de sa durée), publiées à côté des miniatures sous
les noms `hq1.jpg`, `hq2.jpg` et `hq3.jpg`. Elles existent pour toute vidéo
visible, comme `hqdefault`, et sont servies par le même hôte `i.ytimg.com` —
aucun fichier à déposer dans le dépôt, et aucune image inventée.

- `youTubeFrameUrl(id, frame)` (`src/lib/videoThumbnails.js`) construit l'URL ;
  la fabrique reste la seule du site à écrire une URL `i.ytimg.com` (règle
  `check:thumbs`). Le cadre 16/9 de la galerie (`object-fit: cover`) recadre
  la marge 4:3 que YouTube ajoute autour de ces photogrammes ;
- les galeries vivent dans `src/articleGalleries.js` (clés `dossier-souls`,
  `dossier-awards`, `dossier-comiccon`, `dossier-generations`, `dossier-goya`,
  `dossier-playstation-1`, `dossier-playstation-2`, `dossier-xbox-360`) et sont
  rendues par le composant partagé `ArticleGallery`, comme les actus. Légendes
  et textes alternatifs reprennent le thème du passage où chaque photogramme
  est capturé — sans promettre une seconde précise — et le crédit renvoie à
  l'épisode sur la chaîne Let's Play Official.

```jsx
const gallery = getArticleGallery('dossier-souls');
// …dans le bloc vidéo du dossier, sous la note :
{gallery ? <ArticleGallery {...gallery} /> : null}
```

### Les captures s'ouvrent en grand (visionneuse)

La grille recadre les visuels en 16/9 (`object-fit: cover`) : c'est bon pour la
mise en page, mauvais pour lire un tableau d'éditions ou détailler un artwork.
**Chaque capture est donc cliquable** et ouvre une visionneuse — dans les actus,
les dossiers et les tests à la fois, puisque tout passe par le même composant
`src/components/ArticleGallery.jsx`. Rien à déclarer dans
`src/articleGalleries.js` : le comportement vient avec la galerie.

- **Ouvrir** : clic ou touche Entrée sur une capture. Chaque vignette est un
  vrai `<button>` (`aria-haspopup="dialog"`) qui annonce le visuel et sa
  position — « Agrandir le visuel 2 sur 3 : … » — et une pastille loupe
  apparaît au survol (toujours visible au doigt, faute de survol).
- **Regarder** : le visuel est affiché entier (`object-fit: contain`), sans
  recadrage, sur une scène noire, avec sa légende et un compteur `02 / 03`.
  Une entrée peut porter un `full` — une version plus grande servie uniquement
  dans la visionneuse, la grille gardant `src`.
- **Parcourir** : flèches à l'écran, flèches du clavier, Début / Fin, et
  balayage horizontal au doigt (48 px). La navigation boucle.
- **Fermer** : bouton ✕, touche Échap ou clic sur le fond — jamais sur le
  cadre. Le défilement de la page est verrouillé pendant l'ouverture puis
  rendu, et **le focus revient à la vignette cliquée** : au clavier, on ne se
  retrouve pas renvoyé en haut de page.
- **Cohabitation** : la visionneuse est un portail sur `<body>` (z-index 1400,
  au-dessus de la navigation, de la barre de lecture, de la fenêtre sociale et
  des succès, sous les appels) et met les lecteurs vidéo de la page en pause à
  l'ouverture, comme le lecteur modal des tests — règle « une seule vidéo à la
  fois ». Côté thème, le voile et la scène restent sombres dans les deux
  thèmes (section 8 de `theme.css`) tandis que l'en-tête et le pied sont des
  surfaces : en thème clair, ils passent à l'encre sombre et le jaune de marque
  à `--yellow-ink`.

### Vérification

- `npm run check:gallery` monte la galerie dans jsdom et **clique réellement** :
  ouverture par la deuxième vignette, portail sur `<body>`, `full` servi à la
  place de `src`, navigation clavier et boutons avec bouclage, fermeture par
  Échap / ✕ / fond (mais pas par le cadre), défilement et focus rendus, cas
  d'une capture seule (aucune flèche) et d'une galerie vide, absence de
  visionneuse dans le rendu serveur, et enfin un passage sur le catalogue —
  aucun visuel sans texte alternatif ni sans source.
- `npm run check:thumbs` couvre aussi ces captures : la fabrique est la seule
  source d'URL `i.ytimg.com` du site, et le rendu SSR des pages reste contrôlé.
- `npm run check:phone-layout` / `check:phone-css` : la bascule d'ordre passe
  par les mêmes media queries « petit écran » que le reste du site (largeur
  ≤ 800 px et pointeur grossier), sans dépendre de la largeur de fenêtre.
- `npm run check:light-news` : le thème clair des pages Actus, galeries
  comprises.

## Actus cinéma du jour

Le hub Actus (`/news`) ouvre sur trois zones — gaming, cinéma & séries et
tech ; la page
`/news/cinema` (`src/pages/CinemaNews.jsx`) rassemble les actus cinéma &
séries de la rédaction, au même gabarit éditorial que le jeu vidéo — titre
en deux temps, chapô, deux sections titrées, citation et encadré
« À RETENIR », source d’origine citée et liée. Fournée du 28.09.2026 :

- `/news/cinema/box-office-us-endgame-encore-26-millions` — le bilan
  consolidé du week-end américain : Endgame – Encore premier à 26 M$,
  Resident Evil au-delà des 100 M$ (Deadline) ;
- `/news/cinema/the-last-of-us-saison-3-john-goodman-laura-bailey` — John
  Goodman, Ian Alexander et Laura Bailey (la voix d’Abby dans le jeu)
  rejoignent la saison 3 de The Last of Us (Variety) ;
- `/news/cinema/godzilla-minus-zero-premiere-nyff` — première mondiale au
  New York Film Festival de la suite de Godzilla Minus One, premier film de
  la saga classé R, dates de sortie confirmées (Variety, Toho).

Le même jour, trois actus gaming ont été rédigées à la main au gabarit du
robot (`/news/minecraft-the-sift-nouvelle-dimension`,
`/news/the-witcher-3-remastered-sortie-29-septembre`,
`/news/xbox-nadella-restructuration`) : entrées dans `CurrentNews.jsx`,
cartes en tête de `GamingNews.jsx`, routes explicites dans `src/main.jsx`,
recherche, SEO et sitemap.

Le 29.09.2026, une quatrième actu gaming suit le même chemin —
`/news/minecraft-world-hotel-chessington-2027` (le premier hôtel officiel
Minecraft, annoncé au Minecraft Live, en tête de `GamingNews.jsx` et de la
une de l'accueil dans `Home.jsx`). Particularité : ses visuels ne sont pas
hotlinkés depuis la source mais **hébergés dans le dépôt**
(`public/screenshots/minecraft-world-hotel/01-05.jpg`, concept arts officiels
publiés par Merlin Entertainments, crédités en pied de galerie). C'est
l'exception plutôt que la règle : les autres actus hotlinkent les visuels
officiels et ne gardent en local que la carte éditoriale SVG.

Fournée précédente (27.09.2026) :

- `/news/cinema/box-office-us-endgame-resident-evil` — la ressortie
  d’Avengers: Endgame face au reboot Resident Evil au box-office américain
  (Deadline, chiffres provisoires) ;
- `/news/cinema/werwulf-trailer-eggers` — la deuxième bande-annonce du
  Werwulf de Robert Eggers, sortie un jour de pleine lune (Focus Features) ;
- `/news/cinema/fred-astaire-biopic-tom-holland` — le casting du biopic
  Fred Astaire : Tom Holland, Margaret Qualley et Sabrina Carpenter (Sony).

Concrètement, une actu cinéma suit le chemin des actus cinéma existantes :
entrée dans `src/pages/CurrentNews.jsx` avec une clé préfixée `cinema/`
(servie par la route générique `/news/cinema/:slug` — rien à déclarer dans
`src/main.jsx`), carte en tête de la liste de `CinemaNews.jsx` (les plus
récentes ouvrent la grille, la première est « À la une »), entrée dans
`src/search/searchIndex.js`, méta `SEO.jsx` (section « Actualités cinéma »)
et URL dans `public/sitemap.xml`. Le visuel principal est, quand il existe,
une image officielle hotlinkée (`thumbnail` : miniature YouTube d’une
bande-annonce officielle, visuel presse d’un distributeur…) ; une carte
éditoriale SVG 1280×720 générée par `scripts/news-bot/lib/cover.mjs`
(`image` / `fallbackImage`, dans `public/`) prend le relais si l’image
distante ne répond plus — aucune image de droit n’est embarquée. Les crédits
des visuels sont consignés dans `public/cinema-image-credits.txt`.

### Bandes-annonces et teasers intégrés

Chaque actu cinéma montre la vidéo officielle du distributeur — bande-annonce,
teaser ou extrait — dans le corps de l’article, juste après le chapô. Les vidéos
sont listées dans `src/articleTrailers.js`, une entrée par clé d’article (la même
clé que les cartes du hub, préfixée `cinema/`), rendue par
`src/components/ArticleTrailer.jsx` dans `CurrentNews.jsx` : la même mécanique
que les galeries de captures (`src/articleGalleries.js`), avec ses styles dans
`src/news-article.css`.

Le bloc affiche un lecteur 16/9 (l’embed passe par `youTubeEmbedUrl()`, donc par
le coordinateur « une seule vidéo à la fois »), la nature de la vidéo
(`BANDE-ANNONCE`, `TEASER`, `EXTRAIT`), son titre, sa chaîne, un lien « Voir sur
YouTube » et la mention de crédit — puis, quand l’article a plusieurs vidéos, un
sélecteur de miniatures (`VideoThumb`, donc l’échelle de repli habituelle). Les
cartes du hub `/news/cinema` portent sur leur vignette une pastille `▶` reprenant
le libellé de la première vidéo (`src/cinema-news.css`).

La règle éditoriale est stricte : **seules les vidéos publiées par la chaîne
officielle** du studio ou du diffuseur sont intégrées (Marvel Entertainment, Sony
Pictures Entertainment, Warner Bros., Netflix, Netflix Anime, HBO Max, Focus
Features, GODZILLA OFFICIAL by TOHO). Les montages de fans, les comptes régionaux
et les « trailers » générés par IA — très nombreux autour de Blade, de Dune ou de
Resident Evil — sont écartés. Chaque identifiant est vérifié sur YouTube avant
d’être écrit (oEmbed : `https://www.youtube.com/oembed?url=…&format=json` renvoie
le titre exact et la chaîne), et la date du contrôle est consignée dans
`verified`.

Deux cas particuliers, pour que rien ne reste implicite :

- une vidéo d’**illustration** — la bande-annonce de la saison 2 pour une saison
  3 encore en tournage, la mise à jour d’une annonce périmée — porte un `note`
  affiché sous le lecteur, qui dit au lecteur ce qu’il regarde ;
- une actu **sans vidéo officielle** (le biopic Fred Astaire, sans titre ni date ;
  le Blade de Mahershala Ali ; la série animée Diablo) porte `pending` : la
  mention « Aucune bande-annonce : … » s’affiche à la place du lecteur et la carte
  du hub ne porte aucune pastille. Un bloc oublié laisserait croire que la vidéo
  n’existe pas ; `check:trailers` refuse qu’une actu cinéma n’ait ni l’un ni
  l’autre.

### Vérification

- `npm run check:trailers` — les données (identifiant YouTube à onze caractères,
  nature connue, chaîne officielle déclarée **et admise**, titre renseigné,
  contrôle daté, crédit présent, aucune entrée muette, aucune vidéo en double
  dans un article), la couverture (chaque clé `cinema/` de `CurrentNews.jsx` et
  chaque carte du hub `CinemaNews.jsx` a une entrée, aucune entrée ne pointe vers
  un article inexistant, pastille conforme à la première vidéo), le **rendu réel**
  en SSR via `scripts/trailer-smoke.jsx` (un seul lecteur par article, l’embed
  sorti de `youTubeEmbedUrl()`, le sélecteur et ses miniatures, le lien YouTube,
  la note et la mention d’absence telles qu’écrites, les pastilles rendues sur les
  cartes du hub) et la source (aucun embed ni aucune miniature codé en dur hors
  des fabriques du site).
- `npm run check:videos` et `npm run check:thumbs` continuent de s’appliquer : les
  lecteurs du bloc passent par la fabrique d’embed, les miniatures du sélecteur
  par `VideoThumb`.

## Actus tech du jour

Troisième zone du hub Actus (`/news`) : la page `/news/tech`
(`src/pages/TechNews.jsx`) rassemble les actus tech de la semaine, au même
gabarit éditorial que le gaming et le cinéma. Fournée du 21-28.09.2026 :

- `/news/tech/starship-flight-14-premier-vol-orbital` — le vol 14 de Starship
  vise la première mise en orbite et le déploiement de 26 satellites
  Starlink V3 (SpaceX, FAA, CNBC, Numerama) ;
- `/news/tech/copilot-home-code-autopilot` — Microsoft réorganise Copilot
  autour de Home, Code et Autopilot, dont un agent cloud persistant
  (Microsoft, Frandroid) ;
- `/news/tech/apple-taptic-engine-verdict-5-7-milliards` — un jury fédéral de
  San Diego condamne Apple à plus de 5,7 milliards de dollars sur le Taptic
  Engine (Reuters, CNBC) ;
- `/news/tech/agent-openai-portail-australien` — un agent OpenAI franchit les
  protections d’un portail de statistiques australien en juin, l’Australie
  n’est prévenue que le 10 septembre (CNBC, The Guardian) ;
- `/news/tech/meta-connect-2026-lunettes-muse-charm` — Meta Connect 2026 :
  lunettes VR à 1 299 $, Muse Charm et agent Muse (Meta, CNBC).

Concrètement, une actu tech suit exactement le chemin des actus cinéma :
entrée dans `src/pages/CurrentNews.jsx` avec une clé préfixée `tech/` (servie
par la route générique `/news/tech/:slug`, déclarée une fois dans
`src/main.jsx` à côté de celle du cinéma), carte en tête de la liste de
`TechNews.jsx` (les plus récentes ouvrent la grille, la première est
« À la une »), entrée dans `src/search/searchIndex.js`, méta `SEO.jsx`
(section « Actualités tech ») et URL dans `public/sitemap.xml`. Les visuels
sont des cartes éditoriales SVG 1280×720 produites par le générateur du robot
(`scripts/news-bot/lib/cover.mjs`, dans `public/`) : aucune photo de droit
n’est embarquée, et le crédit affiché en pied d’article le rappelle.
Le hub, lui, ajoute une troisième carte (`03 / TECH`) dans `News.jsx`, avec
sa couleur d’univers (violet #a855f7, #6d28d9 en thème clair) déclinée dans
`src/news-carousel.css` et `src/theme.css` — la grille passe à trois colonnes
sur desktop, deux sous 1100 px, une sous 780 px.

## Robot actus du jour

La page Actus s’alimente toute seule : un robot (`scripts/news-bot/`) tourne
chaque matin via GitHub Actions (`.github/workflows/news-bot.yml`), va chercher
les news gaming sur les flux RSS des médias (FR + internationaux), sélectionne
les trois plus fortes de la fenêtre des 36 h — promos, guides, tests et patch
notes écartés, deux articles maximum par média — et les met en forme façon
Let’s Play : titre en deux temps, chapô, deux sections titrées, citation
d’analyse et encadré « À RETENIR », avec la source d’origine toujours citée
et liée.

- **Rédaction hybride** : si une clé d’IA est configurée (secrets
  `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY` ou `GEMINI_API_KEY`
  — une seule suffit, `NEWS_LLM_PROVIDER`/`NEWS_LLM_MODEL` pour affiner),
  l’article est écrit par le modèle avec le guide de style du site, à partir
  du texte de la source. Sans clé, le robot publie avec le gabarit extractif
  et reste alors sur les sources francophones (il ne traduit pas). En cas de
  panne du modèle, repli automatique sur le gabarit : aucun run n’est perdu.
- **Zéro répétition** : chaque phrase de la source sert au plus une fois. Le
  gabarit extractif distribue un pot de phrases dédupliquées entre chapô,
  accroche, corps, citation et encadré « À RETENIR » ; la validation refuse
  tout article dont deux champs rendus partagent un même passage
  (`detectRepetitions`, également contrôlé par `npm run check:newsbot` sur
  les articles déjà publiés). Sur une source trop courte, l’article est plus
  court plutôt que répétitif : les blocs sans matière ne sont pas rendus.
- **Publication automatique** : le robot committe sur `main`
  (`src/news/auto/*.json` + `src/news/autoIndex.js` + visuels SVG générés dans
  `public/news-auto/`), puis appelle explicitement le workflow réutilisable
  de déploiement Pages avec le SHA publié après rebase. Un push effectué avec
  `GITHUB_TOKEN` ne déclenche **pas** un autre workflow `on: push` : cet appel
  direct est donc indispensable, sans nécessiter de jeton personnel. Le
  déploiement est réservé à la branche par défaut ; un run manuel sur une
  branche de test publie ses fichiers sur cette branche, jamais sur le site
  public. Si aucun fichier suivi n’a changé, aucun commit ni déploiement.
- **Miniature officielle obligatoire** : avant publication, le robot extrait
  `image` du JSON-LD ou `og:image`/`twitter:image` de l’article source, vérifie
  qu’il s’agit d’une URL HTTP(S), télécharge le fichier image et contrôle son
  type MIME et sa taille minimale. Si la source ne fournit pas de miniature
  officielle exploitable, l’article est abandonné ; aucune carte éditoriale ne
  peut contourner cette règle. La miniature locale est utilisée par les cartes
  et la couverture de l’article, tandis que le visuel SVG Let’s Play reste
  conservé comme repli éditorial historique.
- **Intégration site** : `src/lib/autoNews.js` dérive la liste des actus
  (ouvertes par les plus récentes), les routes `/news/<slug>` (route générique
  dans `src/main.jsx` — les slugs manuels restent prioritaires, un slug
  inconnu affiche la page 404) et l’index de recherche interne. Les articles
  générés sont archivés après 21 jours (`archiveDays`) pour garder le bundle
  léger. Les visuels sont des cartes éditoriales SVG aux couleurs Let’s Play :
  aucune image de droit n’est embarquée automatiquement.
- **Honnêteté éditoriale** : chaque article généré porte la mention
  « ACTU DU JOUR », crédite sa source (lien « Lire l’article source ») et le
  mode gabarit indique noir sur blanc que l’article a été préparé
  automatiquement ; le mode IA crédite « rédigé avec l’assistance d’un modèle
  de langage ».

Run manuel : onglet Actions → « Robot actus du jour » → Run workflow (choisir
le nombre d’articles, cocher « forcer » pour élargir la fenêtre).
**Après un correctif du workflow, créer un nouveau run sur `main` une fois le
correctif fusionné.** Le bouton « Re-run jobs » d’un ancien échec conserve
l’ancien commit et l’ancienne définition du workflow : il peut donc répéter
l’erreur même si elle est corrigée sur `main`.

Diagnostic : dans le nouveau run, vérifier successivement la génération,
« Commit & push des articles », puis « Publier les actus sur GitHub Pages ».
Le rapport de génération apparaît dans le résumé du run. Le cron est prévu
à **04:30 UTC** (05:30/06:30 à Paris), mais GitHub peut retarder son exécution.

En local :

```bash
npm run news:fetch        # run réel (réseau requis)
node scripts/news-bot/fetch-news.mjs --fixtures   # démo hors-ligne (3 articles de test)
npm run check:newsbot     # rejoue la chaîne hors-ligne et valide les fichiers committs
```

Ajouter ou retirer un média, ajuster les mots-clés « chauds » (studios,
licences, salons) et les filtres anti-bruit : tout vit dans
`scripts/news-bot/config.mjs`. L’état anti-doublons est conservé dans
`news-bot/state.json` (GUID des news déjà vues, slugs déjà publiés).

## Sources éditoriales

- [Instagram @letsplay.officiel](https://www.instagram.com/letsplay.officiel/)
- [YouTube Let’s Play Official](https://www.youtube.com/@letsplay.officiel)
- [Games & Comic Con Dzaïr](https://www.gccdz.com/)
- [Algérie Télécom](https://www.algerietelecom.dz/) · [IdOOM Market](https://idoom-market.com.dz/fr)
- [TCL](https://www.tcl.com/)

### Réactions des articles actus

La section « Vous en pensez quoi ? » utilise désormais Supabase, et non les
compteurs du navigateur. **Relancer `supabase/schema.sql` dans le SQL Editor du
projet utilisé par le site avant de déployer le frontend.** Cette migration
ajoute `article_reactions` et les RPC `get_article_reactions` /
`set_article_reaction`.

Tous les visiteurs voient le total partagé et la répartition en pourcentages
(par choix, pas une note numérique). Un compte connecté peut voter, changer
son choix ou cliquer à nouveau pour le retirer. La clé primaire impose un seul
vote par compte et par article, y compris sur plusieurs appareils. Les RPC
n'exposent pas les identités des votants et l'identité d'écriture est issue de
`auth.uid()`. Les comptes démo ne votent pas. La tendance est relue toutes les
30 secondes, au retour sur la fenêtre et après chaque vote.

Les anciens compteurs locaux ne sont pas importés : ils ne constituent pas des
votes vérifiables. En cas de panne ou de migration manquante, une erreur est
affichée, sans simuler un enregistrement local.ts et l'identité d'écriture est issue de
`auth.uid()`. Les comptes démo ne votent pas. La tendance est relue toutes les
30 secondes, au retour sur la fenêtre et après chaque vote.

Les anciens compteurs locaux ne sont pas importés : ils ne constituent pas des
votes vérifiables. En cas de panne ou de migration manquante, une erreur est
affichée, sans simuler un enregistrement local.