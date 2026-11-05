# PC — les installeurs des jeux

Version **installable sur PC** des jeux de la maison, le pendant exact du
dossier `android/` (les APK). Une coque **Electron** ouvre le jeu dans une
fenêtre dédiée, avec un installeur Windows classique (`setup.exe`), une version
portable sans installation, et — le point central — un rendu 3D qui passe par la
**carte graphique** du PC.

**Une coque, deux applications.** Le code est commun ; ce qui change est le jeu
qu'elle sert, décrit une fois pour toutes dans `desktop/jeux.js` :

| Jeu | Fenêtre | Identifiant | Route ouverte | Release | Installeur |
|---|---|---|---|---|---|
| Sablier | Le Sablier de Bab El | `dz.letsplay.sablier` | `/jeu/sablier-de-bab-el` | `desktop` | `le-sablier-de-bab-el-<version>-setup.exe` |
| Vice City | Vice City Rush | `dz.letsplay.vicecity` | `/jeu/vice-city-rush` | `desktop-vice-city` | `vice-city-rush-<version>-setup.exe` |

Chacune **reste dans son jeu** : les liens qui sortiraient vers le site (hub,
autres jeux, accueil) sont neutralisés, et une seule route est autorisée. Le
reste de ce document vaut pour les deux ; « le jeu » désigne celui du build.

- Version : voir `package.json` (le champ `version` de ce dossier)
- Cible : Windows 10/11 x64 (Linux et macOS possibles en local, non produits par la CI)
- Sortie : `desktop/release/` (`<jeu>-<version>-setup.exe`, `<jeu>-<version>-portable.exe`)

Pour construire **un** jeu : `npm run desktop:coque -- --jeu=vice-city`
(ou `LETSPLAY_JEU=vice-city`), puis `npm run desktop:dist`. Sans indication,
c'est le Sablier. Chaque jeu a **sa** Release : un flux de mise à jour commun
servirait l'installeur de l'autre, avec le mauvais identifiant d'application.
- **Mise à jour proposée au lancement, et téléchargée DANS le jeu** :
  `electron-updater` interroge la Release GitHub `desktop` **2 secondes après
  l'ouverture** — le joueur est encore au menu, c'est le moment d'installer —,
  puis toutes les six heures, et depuis **Aide → Rechercher une mise à jour…**.
  Le résultat ne s'affiche plus dans un dialogue de l'OS : le processus
  principal diffuse son état au jeu (`desktop:maj`), qui le montre dans un
  **panneau du Sablier** (`src/games/RpgMiseAJour.jsx`) — pastille discrète en
  bas à gauche, panneau modal avec la version et la date, **barre de
  progression** pendant le téléchargement, puis **Redémarrer et installer**.
  Une carte « Mise à jour du jeu » vit aussi dans les **Paramètres**. Le
  téléchargement attend l'accord du joueur (`autoDownload = false`) ; une
  vérification qui échoue (démarrage hors ligne) est réessayée une fois, une
  minute plus tard. Une fois l'installeur téléchargé, il s'installe au
  redémarrage — ou à la fermeture du jeu si le joueur attend. Les dialogues
  natifs ne servent plus que de filet (page « hors ligne », vieille version du
  site sans le panneau). La version portable reste à mettre à jour en
  téléchargeant son nouvel `.exe`. Voir « La mise à jour dans le jeu » plus bas.
- **Le site fait foi.** L'installeur ne contient pas le jeu : la fenêtre ouvre
  `let-s-play-nu.vercel.app`, donc **chaque correctif est là au lancement
  suivant**, et l'exécutable pèse **~105 Mo** au lieu de 235 (le runtime Electron,
  rien d'autre). C'est ce qui permet à l'installeur de ne plus se reconstruire
  quand une carte change, et à la coque de se mettre à jour sans se disputer la
  version avec le site.
- **Le jeu tient sa fenêtre : on n'en sort pas vers le site.** Un lien
  « Tous les jeux » ou le logo de l'auto-école ramèneraient au hub du site dans
  un navigateur ; dans une fenêtre qui s'appelle « Le Sablier de Bab El », c'est
  une sortie de route. Deux verrous, plutôt qu'un : `desktop/routes.js`
  (`estRouteDuJeu`) **refuse toute navigation** hors du jeu — hub, accueil,
  autres jeux, origine étrangère, retour arrière, URL tapée après `Ctrl+L` ;
  seuls le jeu, la page « hors ligne » et le serveur local du pack passent.
  Et côté site, `DrivingSchoolHub` masque le logo-lien et « Tous les jeux »
  quand `window.letsPlayDesktop` existe (l'APK, elle, garde le sien : c'est un
  choix distinct, Android n'a pas les mêmes conventions de retour).
- **Pas de croix « retour aux jeux ».** Dans un navigateur, la barre du Sablier
  porte une croix qui ramène à la liste des jeux du site. Dans la coque PC elle
  n'a plus de sens — elle sortait du jeu vers une page web — donc elle est
  masquée (`desktopMode`, `RpgDuelPage.jsx`). On quitte par la fenêtre ; le
  bouton plein écran, lui, reste.
- **Hors connexion, deux filets.** La page d'attente propose « Réessayer » (et
  réessaie seule toutes les 15 s) ; si le **pack hors ligne** (option, ~100 Mo,
  voir plus bas) est installé, elle propose aussi « Jouer la version hors
  ligne », et le menu `Jeu → Jouer la version hors ligne` fait la bascule à tout
  moment.
- L'archive `app.asar` ne contient que la coque (~100 Ko) : l'empaquetage se
  fait depuis un projet isolé `desktop/pack/` assemblé par
  `scripts/desktop-bundle.mjs`, sans aucun `node_modules` — sans cela
  electron-builder gonfle l'asar de centaines de Mo (729 Mo vus en CI).

## Depuis le site : l'écran d'entrée

Sur `/jeu/sablier-de-bab-el`, le site montre d'abord un **écran d'entrée**
(`src/games/RpgEntryChoice.jsx`) avec deux portes :

1. **« Télécharger pour Windows »** — lien direct vers l'asset au nom fixe
   `le-sablier-de-bab-el-setup.exe` de la Release `desktop` (le workflow publie
   une copie au nom fixe à chaque build : le lien du site ne casse jamais au
   changement de version). La version et le poids de l'installeur s'affichent
   sous le bouton, lus sur l'API publique des releases ;
2. **« Jouer dans le navigateur »** — monte le duel, qui reste un chunk
   paresseux : rien des ~740 Ko de `RpgDuelPage` n'est téléchargé avant ce clic.

L'écran s'efface de lui-même quand il n'a rien à proposer : dans la coque PC
(`window.letsPlayDesktop`), dans l'APK (`window.LetsPlayAndroid`), sur téléphone
(`pointer: coarse` / ≤ 820 px), ou si le joueur a coché « retenir ce choix »
(`localStorage` : `letsplay_sablier_entree_v1`). Vérifié par
`npm run check:rpg-entry-choice`.

## La mise à jour dans le jeu

« Intégrer le téléchargement des mises à jour du Sablier dans le jeu lui-même. »

Le téléchargement et l'installation de l'installeur Windows se pilotent
**depuis l'interface du Sablier**, plus depuis des dialogues natifs de l'OS.
Le processus principal reste seul à parler à `electron-updater` ; le jeu ne
fait que lire son état et lui envoyer des ordres, par un pont IPC étroit.

**Le protocole.** `desktop/main.js` tient un état de mise à jour
(`phase`, `version`, `progression`, `erreur`) et le diffuse au rendu sur le
canal `desktop:maj` à chaque événement de l'updater. Les phases :

| Phase | Ce que le joueur voit |
|---|---|
| `repos` | rien pour l'instant |
| `verification` | « Recherche d'une mise à jour… » |
| `disponible` | la version en ligne + bouton **Télécharger** |
| `telechargement` | la barre de progression (%, taille, débit) |
| `prete` | **Redémarrer et installer** (ou à la fermeture) |
| `a-jour` | « Le Sablier est à jour » |
| `erreur` | le message + **Réessayer** |

Le jeu réclame la main en appelant `desktop:maj-etat` ; dès lors, la coque
n'ouvre plus ses dialogues natifs (`majUiActive`). Les dialogues natifs ne
restent qu'un **filet** : page « hors ligne », ou vieille version du site qui
n'a pas encore le panneau. Le téléchargement attend l'accord du joueur
(`autoDownload = false`) : la coque vérifie et signale, le jeu décide.

**Le pont.** `preload.cjs` expose `window.letsPlayDesktop.maj` :
`etat()`, `verifier()`, `telecharger()`, `installer()`, `surEtat(cb)` et
`surOuverture(cb)` (le menu **Aide → Rechercher une mise à jour…** ouvre le
panneau dans le jeu). `contextIsolation` reste actif, aucun Node dans le rendu.

**Côté jeu.** `src/updates/maj-desktop.js` est un store testable qui lit le
pont, normalise l'état et relaie les ordres ; hors coque PC (navigateur, APK),
le pont n'existe pas et le store reste inerte. `src/games/RpgMiseAJour.jsx`
montre trois surfaces, toutes sur le même store :

- **la pastille** (bas gauche) dès qu'une mise à jour est disponible, en
  téléchargement ou prête — elle ne couvre rien, et porte une mini-barre de
  progression pendant le téléchargement ;
- **le panneau modal** — version, date, barre de progression, boutons
  « Télécharger », « Redémarrer et installer », « Plus tard ». Il s'ouvre seul
  sur une nouvelle version (une fois par version), « Plus tard » / Échap le
  range en pastille ;
- **la carte des Paramètres** (`RpgMiseAJourCarte`) — la même chose posée dans
  la grille des réglages, pour garder la main sans pastille.

Le panneau est monté à la racine de la table (`RpgEntryChoice.jsx`), à côté du
duel : il parle pendant une partie comme au menu. Esthétique du Sablier (or,
panneaux sombres, glyphe sablier), pas celle du site.

**Ne pas confondre les deux mises à jour.** Celle-ci concerne l'**installeur
Windows de la coque** (`electron-updater`, Release `desktop`). Le **site en
ligne**, lui, se met à jour tout seul au lancement suivant (la fenêtre le
charge) ; le panneau du site (`MiseAJourDisponible.jsx`) ne fait que proposer
un rechargement quand un onglet ouvert voit passer un nouveau build.

Vérification : `npm run check:maj-desktop` (store, pont, câblage IPC, panneau
monté pour de vrai dans jsdom) et `npm run check:desktop` (updater, isolation).

## Comment ça tourne

```
┌─────────────────────────────── fenêtre Electron (Chromium) ───────────────────────────────┐
│  http://127.0.0.1:4173/jeu/sablier-de-bab-el                                              │
│      │                                                                                    │
│      │  WebGL (Three.js : rpgTableScene.js, rpgStoryTowerScene.js)                       │
│      ▼                                                                                   │
│  ANGLE ──► Direct3D 11 ──► pilote NVIDIA / AMD / Intel ──► la carte graphique             │
└───────────────────────────────────────────────────────────────────────────────────────────┘
        ▲
        │ requêtes HTTP
┌───────┴──────────────────────────────┐        ┌──────────────────────────────────────────┐
│ serveur local (desktop/local-server.js)│        │ le site en ligne (mode par défaut)        │
│ ne sert QUE le pack hors ligne, s'il   │  relais │ fichiers absents du pack · Supabase pour  │
│ est installé (resources/app)           │◄───────│ le compte, les duels à distance, le souk  │
│ écoute UNIQUEMENT sur 127.0.0.1        │        │                                           │
└───────────────────────────────────────┘        └──────────────────────────────────────────┘
```

Trois décisions portent tout l'édifice :

1. **Un serveur local, pas `file://`.** L'app utilise `BrowserRouter`
   (`src/main.jsx`) : en `file://`, recharger la page du duel casse le routage et
   `localStorage` (vos decks, votre progression) perd son origine stable. Un
   mini-serveur HTTP sur `127.0.0.1` règle les deux, et `127.0.0.1` est une
   origine « sûre » pour Chromium : WebAudio, stockage et micro/caméra y
   fonctionnent. Le port est **fixe (4173)** pour que l'origine — donc vos decks
   enregistrés — survive aux relances ; s'il est pris, un port libre est choisi
   et la session repart de zéro (jamais de mélange entre deux installations).
2. **Le pack hors ligne est élagué — et optionnel.** `public/` pèse 208 Mo ; le
   Sablier n'en a besoin que d'environ 100 Mo (cartes, plateaux, musiques de
   plateau, décor du mode histoire, sons de combat, icônes de succès). La liste
   vit dans `desktop/bundle-assets.json`. Tout le reste (actus, captures, vidéos)
   n'est pas embarqué : le serveur local le **relaie depuis le site en ligne**
   quand une connexion existe, et son absence ne se voit jamais hors ligne —
   aucune de ces images n'apparaît dans le duel. Ce pack n'est **pas** dans
   l'installeur : il se télécharge à part (voir « Pack hors ligne »).
3. **Le GPU est forcé, pas espéré.** Voir la section suivante.

## La carte graphique

Le duel dessine sa table en **WebGL** (Three.js 0.180, WebGL2). Sous Chromium,
WebGL n'est jamais parlé au pilote directement : **ANGLE** le traduit vers
l'API native — Direct3D 11 sous Windows. C'est cette traduction qui décide si le
jeu tourne sur le GPU ou retombe sur un rendu logiciel (SwiftShader) exécuté par
le CPU. Trois situations font basculer un jeu WebGL dans le logiciel, et la
coque traite les trois (`desktop/gpu.js`, posés **avant** `app.whenReady()` —
après, ils n'ont plus aucun effet) :

| Situation | Commutateur posé |
|---|---|
| Pilote sur la liste noire de Chromium (vieux pilotes, machines virtuelles) | `--ignore-gpu-blocklist` |
| Rasterisation et transferts laissés au CPU | `--enable-gpu-rasterization`, `--enable-zero-copy`, `--enable-native-gpu-memory-buffers` |
| Choix du backend sous Windows | `--use-angle=d3d11` |
| Pas de GPU du tout (le jeu reste jouable, lentement, au lieu d'une table vide) | `--enable-unsafe-swiftshader` |

### WebGPU : l'essai de la conduite libre

Depuis que la conduite libre porte un bouton **RENDU** (standard, cinéma, essai
WebGPU), la coque a deux rôles :

1. **autoriser l'API.** `desktop/gpu.js` pose `--enable-unsafe-webgpu`, qui lève
   la liste noire WebGPU de Chromium — la même logique que
   `--ignore-gpu-blocklist` pour le WebGL. Sans lui, un pilote un peu ancien
   rend `requestAdapter()` → `null` et le jeu annonce « STANDARD · REPLI » à
   tort. Aucun backend n'est forcé : Chromium choisit seul D3D12 ou Vulkan ;
   `--use-angle` ne concerne que le WebGL (deux couches distinctes) ;
2. **constater l'état.** Le diagnostic (menu **Carte graphique → État de la
   carte graphique…**) porte une section **WebGPU** qui distingue trois
   situations, et c'est ce qu'il faut lire avant de conclure :

   | État affiché | Ce que ça veut dire |
   | --- | --- |
   | `prêt` | un adaptateur a répondu — l'essai « WEBGPU · ESSAI » s'ouvrira |
   | `absent` | ce Chromium ne connaît pas `navigator.gpu` (trop ancien) |
   | `API présente, aucune carte accordée` | l'API existe mais le pilote refuse : liste noire, VM, pilote trop vieux |

   Le rapport copié (`Copier le rapport`) inclut la ligne `webgpu:`.

**Une exception assumée, côté site** : `cityRushLiteDevice()` refusait l'essai
sur tout appareil `pointer: coarse` — or Electron sur un portable tactile
répond `coarse`, et l'APK comme l'exe sont des WebView. L'essai aurait donc été
bloqué sur les deux machines les mieux équipées. Le module de rendu exempte
désormais la coque PC (`window.letsPlayDesktop`, le drapeau que lit déjà le
Sablier) : le halo CINÉMA y est monté lui aussi. L'APK, elle, reste en qualité
allégée.

**Vérifier quel GPU travaille** : menu **Carte graphique → État de la carte
graphique…**. La fenêtre affiche le renderer réellement utilisé (ex. « ANGLE
(NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 …) »), l'état des fonctions
`webgl` / `webgl2` / `compositing`, une sonde WebGL ouverte dans la fenêtre
elle-même, et un bouton « Copier le rapport » pour un signalement de bug. Le
menu propose aussi le rapport brut `chrome://gpu`.

**Dépannage** :

- Le renderer indique `SwiftShader`, `llvmpipe` ou `Microsoft Basic Render
  Driver` → le CPU dessine. Mettez à jour le pilote graphique ; sur un portable
  à deux GPU (Intel/AMD intégré + NVIDIA/AMD dédié), réglez **Windows → Système
  → Écran → Graphiques → « Processeur graphique haute performance »** pour
  l'application. Les commutateurs ne peuvent pas forcer Windows à choisir le GPU
  dédié : c'est le réglage système qui tranche.
- Comparer : `LETSPLAY_SOFTWARE_GL=1` force volontairement le rendu logiciel. Si
  le jeu devient nettement plus lent avec, c'est la preuve que le GPU
  travaillait sans.
- Imposer un backend (pilote Linux capricieux, test) : `LETSPLAY_ANGLE=gl` (ou
  `vulkan`, `d3d9`, `swiftshader`).
- Commutateurs libres : `LETSPLAY_EXTRA_GPU_SWITCHES="nom=valeur,nom2"`.

## Construire chez soi

Depuis la racine du dépôt (Node 22) :

```bash
npm ci                     # dépendances du site (vite, react, three…)
npm run desktop:coque      # 1) projet d'empaquetage, SANS le site → installeur « en ligne »
npm run desktop:setup      # 2) Electron + electron-builder dans desktop/node_modules
npm run desktop:run        # 3) lancer l'app sans l'installer (développement)
npm run desktop:dist       # 4) produire setup.exe + portable.exe dans desktop/release
```

Pour construire en plus le **pack hors ligne** (le site élagué), remplacez
l'étape 1 par `npm run desktop:web` : il produit `desktop/dist-web`, que
l'empaquetage embarque alors dans `resources/app`.

`desktop:dist` doit tourner **sur Windows** pour produire un `.exe`
(electron-builder ne sait pas construire un installeur Windows depuis Linux).
La CI du dépôt le fait pour vous (voir plus bas).

Sans installer : `npm run desktop:serve` sert `desktop/dist-web` sur
`http://127.0.0.1:4173` et ouvre le jeu dans n'importe quel navigateur — utile
pour vérifier un pack hors ligne avant de le publier. En développement, la
coque démarre sur le site ; `LETSPLAY_PAQUET=desktop/dist-web` force le pack.

Régénérer les icônes, sans dépendance externe : `npm run desktop:icon`. Le
script écrit **une icône par jeu** (`desktop/app-icons/` pour le sablier,
`desktop/app-icons-vice-city/` pour Vice City — voir le champ `icones` de
`desktop/jeux.js`), en trois formats : `icon.png` (512 px), `icon-1024.png`
(visuels) et `icon.ico` (16 → 256 px, format Windows).

Les dessins eux-mêmes vivent dans `desktop/icones.mjs`, module **sans effet de
bord** : c'est ce qui permet à `npm run android:icons` de relire les mêmes PNG
et d'écrire les `mipmap-*` des APK. Une icône par jeu, deux plateformes.

### Variables d'environnement

| Variable | Effet |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | embarquées au build : compte, duels en ligne, souk, synchro des decks. **Absentes, le jeu reste jouable hors ligne** mais la connexion du compte est indisponible. |
| `LETSPLAY_DESKTOP_MODE=online` | ignore le paquet embarqué et charge le site en ligne (comme l'APK). |
| `LETSPLAY_REMOTE_ORIGIN=https://…` | change le site de relais et le mode en ligne. |
| `LETSPLAY_PORT=4173` | port du serveur local. |
| `LETSPLAY_DEVTOOLS=1` | ouvre les outils de développement au lancement. |
| `LETSPLAY_ANGLE`, `LETSPLAY_SOFTWARE_GL`, `LETSPLAY_EXTRA_GPU_SWITCHES` | diagnostic GPU (voir plus haut). |

### Compte Supabase depuis l'app PC

La redirection de confirmation d'e-mail et de récupération de mot de passe pointe
vers `http://127.0.0.1:4173/auth`. Ajoutez `http://127.0.0.1:4173/**` dans
**Supabase → Authentication → Redirect URLs**, sinon ces deux flux refusent la
redirection locale (la connexion par mot de passe, elle, fonctionne sans cela).

Les réglages restent accessibles depuis l'onglet **Paramètres** du menu
principal, même avant de lancer un duel. On y retrouve les options 3D et audio ;
quand un compte est connecté, la même page propose aussi **Se déconnecter**.
Cela ferme la session et ramène à l'écran de connexion sans supprimer la
progression du compte.

### La progression appartient au compte, pas au PC

Le jeu enregistre la progression du joueur dans Supabase — une ligne privée par
compte (`rpg_sablier_progress`, `player_progress`, `quiz_progress`,
`mirage_rush_progress`, `vice_city_rush_progress`) — exactement comme le site :
la version PC n'a pas de sauvegarde « à elle ». Le dossier de données
d'Electron ne contient qu'un **cache de travail par compte**
(`letsplay_sablier_*:user:<id>`, voir `src/lib/progressionScope.js`), qui sert
à jouer hors ligne et n'est jamais lu par un autre compte.

Ce que cela change pour l'exploitation :

- deux joueurs qui se connectent tour à tour sur le même PC (ou deux
  installations côte à côte) ne partagent **aucune** progression ;
- une partie jouée hors ligne (ou sur « Mode hors ligne » de l'écran de
  connexion) est reprise une seule fois par le compte à la première connexion,
  puis poussée dans sa ligne Supabase ;
- la progression suit le joueur entre le PC, le navigateur et l'APK : elle
  n'est pas attachée à l'origine `127.0.0.1`, donc elle survit à un changement
  de port, à une réinstallation ou à un autre ordinateur.

Sans `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` au build, l'écran de
connexion l'annonce (« authentification non configurée ») et le jeu reste
jouable hors ligne : dans ce cas seulement, la progression ne quitte pas le PC
(voir `desktop-manifest.json`, qui indique si le paquet embarque les clés).

Si la progression ne se synchronise pas alors que la connexion fonctionne,
vérifier les droits d'API : `supabase/progression-par-joueur.sql` (Supabase →
SQL Editor) garantit la RLS **et** le `grant` du rôle `authenticated` sur
`rpg_sablier_progress` et les autres tables de progression. Le bandeau de
synchronisation du Souk et du menu (`synchronise` / `attente` / `horsligne`)
dit ce que le jeu a réussi à faire.

## Pack hors ligne (option)

L'installeur publié ne contient pas le jeu. Qui veut jouer sans Internet
installe le **pack hors ligne** — le site construit et élagué (~100 Mo) :

1. télécharger `sablier-pack-hors-ligne.zip` sur la page de la Release
   ([releases/tag/desktop](https://github.com/SalimB-source/Let-s-Play/releases/tag/desktop)) ;
2. menu **Aide → Pack hors ligne… → Choisir un fichier .zip…** : la coque
   décompresse l'archive (PowerShell `Expand-Archive`) et la pose dans
   `resources/app`, exactement là où `dossierPaquetWeb()` la cherche. Le même
   menu permet de la retirer.

Une fois installé, le jeu démarre **toujours** sur le site — donc avec les
correctifs du jour — et le pack sert de secours : bascule automatique proposée
par la page d'attente quand le réseau manque, ou manuelle par
`Jeu → Jouer la version hors ligne`. Une mise à jour de la coque n'y touche
jamais : elle ne remplace que `app.asar`.

Le pack n'est jamais construit par un simple build de `main` : il faut lancer le
workflow à la main en cochant `pack_hors_ligne`. Il est alors publié sous un nom
**fixe** (`sablier-pack-hors-ligne.zip`), à côté de l'installeur.

## Ce que la CI produit

`.github/workflows/desktop-windows.yml` :

1. `verifs` (ubuntu) : `npm run check:desktop` — 33 vérifications sans Electron
   (commutateurs GPU, serveur local, anti-évasion, isolation de la fenêtre,
   empaquetage, **fermeture complète des modules de `electron-updater`** lue
   dans le verrou, mode de démarrage, relance de mise à jour) ;
2. `installeur` (windows-latest, **une fois par jeu** — matrice `sablier`,
   `vice-city`, sélectionnée par `LETSPLAY_JEU`) : version dérivée, **coque
   seule**, `electron-builder`, artefacts de run, puis — sur `main` seulement —
   GitHub Release sur le tag du jeu (`desktop` ou `desktop-vice-city`, lien de
   téléchargement permanent, remplacé à chaque build). Chaque Release contient
   son `latest.yml` et ses `.blockmap`, donc son propre flux de mise à jour ;
3. `pack-hors-ligne` (windows-latest, **sur demande**) : construit le site
   élagué et le publie en `.zip` sur la même Release.

### Quand un build part, et sous quel numéro

Le site n'est plus dans l'exécutable : un correctif du jeu arrive donc sans
reconstruire quoi que ce soit. Le workflow ne part plus que sur la **coque** —
`desktop/**`, `scripts/desktop-*.mjs`, `package.json`/`package-lock.json`, le
workflow lui-même — ou sur lancement manuel. Une PR ne construit que si elle
touche la coque.

Corollaire à connaître : **une modification de `src/` ou `public/` ne change pas
la version de la coque.** C'est voulu (le site est chargé en ligne), mais cela
veut dire que le numéro de version ne sert plus qu'à livrer des changements de
*coque*. Le pack hors ligne, lui, se republie à la demande
(`workflow_dispatch` → cocher `pack_hors_ligne`).

La **version** est calculée avant l'empaquetage : majeure et mineure viennent de
`desktop/package.json` (1.0), et le correctif est

```
max(correctif du fichier, nombre de commits du dépôt, numéro de run)
```

Donc chaque build publié porte un numéro **strictement plus grand** que le
précédent : `electron-updater` le voit et le propose au lancement. Plus besoin
de bumper à la main à chaque correctif — et une montée volontaire en `1.1.0`
garde la priorité. Le clone de l'étape `installeur` est complet
(`fetch-depth: 0`), sans quoi le compte des commits vaudrait 1.

Coût : ~10 min de runner Windows et ~215 Mo par build publié. La Release du tag
`desktop` est supprimée puis recréée à chaque fois, donc le stockage ne
s'accumule pas — seul le téléchargement est renouvelé.

L'update automatique concerne l'installateur Windows NSIS ; le portable se met à
jour par remplacement manuel (et par la bascule « jouer en version en ligne »
proposée au lancement).

L'exécutable **n'est pas committé** sur la branche (≈ 105 Mo par build) : le
téléchargement passe par la Release, contrairement à l'APK Android qui, lui, est
assez petit pour vivre dans `android/dist/`.

## Sécurité de la coque

- Le serveur local n'écoute **que sur `127.0.0.1`** : rien n'est exposé au
  réseau du joueur, et chaque chemin est résolu dans le paquet (aucune lecture
  hors de celui-ci — vérifié par `check:desktop`).
- Fenêtre : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
  Le rendu ne voit de Node que `window.letsPlayDesktop` (`preload.cjs`).
- Aucun pont `LetsPlayAndroid` : sinon le jeu se mettrait en mise en page
  téléphone et verrouillerait le paysage (`RpgDuelPage.jsx`, `rpgLandscape.js`).
  Sur PC, la détection `pointer: coarse` / largeur donne la table « bureau ».
- Permissions : micro, caméra, plein écran accordés sur demande (l'OS confirme) ;
  géolocalisation et notifications refusées net.
- Les liens externes (YouTube, Instagram…) s'ouvrent dans le navigateur du PC ;
  la fenêtre du jeu ne navigue que vers le serveur local ou le site de relais —
  même règle que l'APK.

## Limites connues

- macOS : il faut une icône `.icns` et un runner macOS ; la CI ne produit que
  Windows. Le code de la coque est multiplateforme.
- Deux installations lancées en même temps : la seconde prend un port libre et
  donc une origine différente — le cache de travail n'est pas partagé. La
  progression, elle, suit le compte : elle se retrouve à la connexion
  (`rpg_sablier_progress`).
- Hors ligne, tout ce qui vient de Supabase (compte, duels à distance, souk
  partagé) est indisponible ; le duel contre l'IA, l'atelier de decks, la
  collection et le mode histoire fonctionnent, la progression s'écrivant dans
  le cache du compte puis rejoignant Supabase au retour de la connexion
  (`rpgSablierRemote.js`).
