# Android — l'APK Let's Play

Coque Android (WebView) du site **Let's Play**. L'application affiche le site
en ligne : **chaque mise à jour du site est immédiatement visible dans l'app**,
sans reconstruire l'APK. On ne recompile que pour changer l'icône, le nom, la
version ou une fonctionnalité native. **Il faut publier les changements sur
l'URL Vercel ci-dessous** : le déploiement GitHub Pages seul n'affecte pas l'APK.
La WebView possède une session distincte du navigateur du téléphone : pour
accéder à la messagerie, il faut se connecter dans l'application.

- Nom affiché : **Let's Play**
- Identifiant : `dz.letsplay.officiel`
- Version actuelle : **1.0.2** (versionCode 3 — voir `app/build.gradle`)
- URL embarquée : <https://let-s-play-nu.vercel.app> (constante `SITE_HOST`
  dans `app/src/main/java/dz/letsplay/officiel/MainActivity.java`)
- Android minimum : 6.0 (API 23) · cible : API 35

## Comportement de l'app

- Tirer-rafraîchir rechargement la page ; bouton retour = navigation arrière.
- Les liens externes (YouTube, Instagram…) s'ouvrent dans l'app dédiée ou le
  navigateur ; le site reste dans la WebView.
- Les vidéos intégrées (YouTube) passent en plein écran natif.
- Le thème clair/sombre du site fonctionne tel quel (`localStorage` activé).
- **Appels vocaux / vidéo** : la WebView demande le micro et la caméra à
  l'application, qui relaie la demande Android au joueur puis accorde ce qui a
  été autorisé (`onPermissionRequest` + `onRequestPermissionsResult` dans
  `MainActivity`). Les autorisations `RECORD_AUDIO`, `CAMERA` et
  `MODIFY_AUDIO_SETTINGS` sont déclarées dans le manifeste ; un téléphone sans
  caméra reste installable (`uses-feature` non requis) et les appels y restent
  vocaux. **Refuser ces permissions rend tout appel impossible dans l'app** :
  le site affichera « accès au micro/à la caméra refusé ».
- **Haut-parleur** : un appel vocal Android part sinon dans l'écouteur, alors
  que l'appel vidéo sort du haut-parleur — on croit le vocal muet. Dès que le
  micro est accordé (et quand le site appelle `LetsPlayAndroid.setCallAudio`),
  l'app bascule en haut-parleur et rend le routage d'avant à la fin de l'appel.
- La lecture des médias **ne dépend pas d'un geste** (
  `setMediaPlaybackRequiresUserGesture(false)`) : le son et l'image d'un appel
  arrivent plusieurs secondes après le clic « Répondre » — avec le réglage par
  défaut de la WebView, la lecture était refusée et l'écran restait noir
  pendant que le son passait (corrigé en 1.0.2).

## Dépannage

### « Aucune autorisation à accepter » (la demande Android n'apparaît jamais)

Le site réclame le micro/la caméra, le pop-up Android ne s'affiche pas, et
l'appel finit en « accès refusé » ? C'est qu'Android a déjà un refus **en
mémoire** : depuis Android 11, un refus deux fois (« Ne plus demander ») fait
que `requestPermissions` répond immédiatement « refusé » **sans plus rien
afficher** — la WebView reçoit donc un refus sans que le joueur puisse
accepter quoi que ce soit. Réglage :

> **Paramètres Android → Applications → Let's Play → Autorisations →
> Microphone et Caméra → Autoriser**, puis rouvrir l'appel.

(Désinstaller/réinstaller ne remet PAS les autorisations à zéro : elles
suivent l'application tant qu'elle n'est pas désinstallée. Passer par les
réglages système est le seul chemin.)

### L'appel vidéo reste sans image (écran noir, le son passe)

1. **Mettre à jour l'APK (1.0.2 ou plus)** : avant 1.0.2, la WebView exigeait
   un geste pour chaque lecture de média — l'image de l'ami, qui arrive après
   le clic « Répondre », ne démarrait jamais. Le site rejoue aussi la lecture
   tout seul (gestes, métadonnées, pistes qui se débloquent), mais l'APK à
   jour reste la meilleure réponse.
2. **Vérifier la permission Caméra** (voir ci-dessus) : si la caméra est
   refusée au niveau Android, l'appel continue en audio — le site l'affiche
   désormais noir sur blanc (« Caméra indisponible — l'appel continue en
   audio, sans image ») au lieu de laisser un écran vide.
3. **Caméra occupée** : une autre application qui garde la caméra (visio,
   appareil photo en arrière-plan) empêche la capture — fermer l'autre app.
4. Les deux joueurs doivent être sur le **site à jour** (l'APK affiche le site
   en ligne : tirer-rafraîchir suffit côté site) ; pour tester, deux comptes
   amis, un téléphone + un ordinateur, appel vidéo depuis la discussion.

### L'appel vocal reste silencieux (le chrono tourne, rien ne s'entend)

1. **Le son sort de l'écouteur, pas du haut-parleur** : c'est le routage
   Android par défaut d'un appel vocal — l'app bascule en haut-parleur dès
   que le site signale l'appel (`LetsPlayAndroid.setCallAudio`, APK 1.0.2) ;
   vérifier le volume d'appel (boutons volume pendant l'appel).
2. **Site pas à jour** : l'ancienne version ne branchait le flux distant sur
   aucun élément média en appel vocal — tirer-rafraîchir dans l'app.

### Rien ne passe du tout (ni son ni image) en 4G/5G

Sans relais TURN, les connexions pair-à-pair échouent derrière certains NAT
d'opérateur — et là, ni son ni image. Côté serveur : configurer
`VITE_TURN_URL` (voir le README principal, section « Serveur TURN »).

## Construire l'APK

Automatiquement : chaque push touchant `android/**` déclenche le workflow
**« APK Android »** (`.github/workflows/android-apk.yml`), qui publie
l'artefact `lets-play-apk` (onglet Actions du repo). Lancement manuel :
Actions → APK Android → *Run workflow*.

En local (JDK 17+, SDK Android 35, Gradle 8.10+) :

```bash
gradle -p android assembleRelease
# → android/app/build/outputs/apk/release/lets-play-release.apk
```

## Signature

La clé de release est un PKCS12 committé dans `android/keystore/`
(`letsplay-release.p12`, alias `letsplay`, mot de passe dans
`keystore/signing.properties`). **Conserver une copie de ces fichiers hors du
repo** : sans cette clé, impossible de publier une mise à jour installable par
dessus l'existante.

⚠️ Le dépôt étant public, toute personne lisant le repo peut récupérer la clé.
Pour une distribution directe le risque est faible (un attaquant ne peut pas
pousser de mise à jour sur les téléphones), mais la bonne pratique reste de
basculer sur des secrets GitHub : `Settings → Secrets and variables → Actions`,
créer `ANDROID_KEYSTORE_B64` (keystore encodé en base64) et
`ANDROID_KEYSTORE_PASSWORD` — le workflow et `app/build.gradle` les prennent
automatiquement en compte, et on peut alors supprimer `android/keystore/`.

Pour le Play Store un jour : générer un `.aab` (`bundleRelease`), la clé
ci-dessus sert de clé d'upload.

## Monter en version

Dans `android/app/build.gradle` : augmenter `versionCode` (entier, +1 à chaque
publication) et `versionName` (ex. « 1.1.0 »), puis relancer le workflow.

## Générer les icônes

Les PNG de `app/src/main/res/mipmap-*` sont dérivés de
`public/Logo Let's Play.png` :

```bash
npm install sharp   # une seule fois
node android/icongen.mjs "public/Logo Let's Play.png" android/app/src/main/res
```

## Récupérer l'APK compilée

Deux canaux, mis à jour à chaque build :

1. **Release GitHub** — page <https://github.com/SalimB-source/Let-s-Play/releases/tag/apk>
   (fichier `lets-play-v*.apk`, lien permanent à partager) ;
2. **La branche** — `android/dist/lets-play-latest.apk`, committée par le robot.
