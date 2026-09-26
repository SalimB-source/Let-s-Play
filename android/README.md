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
- URL embarquée : <https://let-s-play-nu.vercel.app> (constante `SITE_HOST`
  dans `app/src/main/java/dz/letsplay/officiel/MainActivity.java`)
- Android minimum : 6.0 (API 23) · cible : API 35

## Comportement de l'app

- Tirer-rafraîchir rechargement la page ; bouton retour = navigation arrière.
- Les liens externes (YouTube, Instagram…) s'ouvrent dans l'app dédiée ou le
  navigateur ; le site reste dans la WebView.
- Les vidéos intégrées (YouTube) passent en plein écran natif.
- Le thème clair/sombre du site fonctionne tel quel (`localStorage` activé).

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
