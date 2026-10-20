# PC — l'installeur du Sablier de Bab El

Version **installable sur PC** du jeu de cartes de la maison, le pendant exact
du dossier `android/` (l'APK). Une coque **Electron** ouvre le jeu dans une
fenêtre dédiée, avec un installeur Windows classique (`setup.exe`), une version
portable sans installation, et — le point central — un rendu 3D qui passe par la
**carte graphique** du PC.

- Nom affiché : **Le Sablier de Bab El**
- Identifiant : `dz.letsplay.sablier`
- Version : voir `package.json` (le champ `version` de ce dossier)
- Cible : Windows 10/11 x64 (Linux et macOS possibles en local, non produits par la CI)
- Sortie : `desktop/release/` (`le-sablier-de-bab-el-<version>-setup.exe`,
  `le-sablier-de-bab-el-<version>-portable.exe`)
- Poids réel mesuré en CI : **~215 Mo par installeur** (dont ~117 Mo de jeu :
  cartes, plateaux, musiques ; le reste est le runtime Electron compressé).
  L'archive `app.asar` ne contient que la coque (~100 Ko) : l'empaquetage se
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
│ serveur local (desktop/local-server.js)│        │ Internet (seulement si une connexion existe)│
│ sert desktop/dist-web, le paquet élagué│  relais │ site en ligne pour les fichiers non       │
│ (jeu, cartes, plateaux, musiques)      │◄───────│ embarqués · Supabase pour le compte, les  │
│ écoute UNIQUEMENT sur 127.0.0.1        │        │ duels à distance, le souk, la synchro     │
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
2. **Le paquet web est élagué.** `public/` pèse 208 Mo ; le Sablier n'en a
   besoin que d'environ 115 Mo (cartes, plateaux, musiques de plateau, décor du
   mode histoire, sons de combat, icônes de succès). La liste vit dans
   `desktop/bundle-assets.json`. Tout le reste (actus, captures, vidéos) n'est
   pas embarqué : le serveur local le **relaie depuis le site en ligne** quand
   une connexion existe, et son absence ne se voit jamais hors ligne — aucune de
   ces images n'apparaît dans le duel.
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
npm run desktop:web        # 1) build Vite mode desktop + élagage → desktop/dist-web
npm run desktop:setup      # 2) Electron + electron-builder dans desktop/node_modules
npm run desktop:run        # 3) lancer l'app sans l'installer (développement)
npm run desktop:dist       # 4) produire setup.exe + portable.exe dans desktop/release
```

`desktop:dist` doit tourner **sur Windows** pour produire un `.exe`
(electron-builder ne sait pas construire un installeur Windows depuis Linux).
La CI du dépôt le fait pour vous (voir plus bas).

Sans installer : `npm run desktop:serve` sert le paquet élagué sur
`http://127.0.0.1:4173` et ouvre le jeu dans n'importe quel navigateur — utile
pour vérifier un build avant de construire l'installeur.

Régénérer l'icône (sablier d'or, sans dépendance externe) : `npm run desktop:icon`.

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

## Ce que la CI produit

`.github/workflows/desktop-windows.yml` :

1. `verifs` (ubuntu) : `npm run check:desktop` — 20 vérifications sans Electron
   (commutateurs GPU, serveur local, anti-évasion, isolation de la fenêtre,
   empaquetage) ;
2. `installeur` (windows-latest) : paquet élagué, `electron-builder`, artefacts
   de run, puis — sur `main` seulement — GitHub Release sur le tag `desktop`
   (lien de téléchargement permanent, remplacé à chaque build).

L'exécutable **n'est pas committé** sur la branche (≈ 180 Mo par build) : le
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
  donc une origine différente — elle ne partage pas le `localStorage` de la
  première.
- Hors ligne, tout ce qui vient de Supabase (compte, duels à distance, souk
  partagé) est indisponible ; le duel contre l'IA, l'atelier de decks, la
  collection et le mode histoire fonctionnent, la progression étant d'abord
  locale (`rpgSablierRemote.js` synchronise au retour de la connexion).
