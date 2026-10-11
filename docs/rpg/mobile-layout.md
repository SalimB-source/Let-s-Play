# Duel mobile : paysage et actions dans l’aperçu

## Présentation

`src/games/rpg-mobile.css` contient la présentation tactile, activée par `.rpg-battle--touch` (application Android, pointeur tactile ou fenêtre ≤ 1 100 px).

Le plateau conserve les illustrations originales de Bab El, avec une organisation inspirée des jeux de cartes numériques en paysage :

- deux champs au centre, sans panneaux opaques ;
- terrains identiques regroupés par type dans chaque camp, avec uniquement le compteur total sur la carte (disponibilités dans l’aperçu et le libellé accessible) ;
- identités et compteurs flottants ;
- main en bas, défilable horizontalement ;
- commandes « Attaquer avec tous », confirmation/annulation de l’attaque, annulation de la dernière action et fin du tour regroupées côte à côte sur le plateau, selon la phase ;
- progression des phases immédiatement au-dessus des commandes, avec la phase actuelle mise en évidence ;
- détails et actions contextuelles dans l’aperçu d’une carte.

Le clic sur une carte en main ouvre l’aperçu, sur ordinateur comme sur mobile. **Jouer la carte** réutilise la validation et les animations du glisser-déposer, y compris le paiement automatique et le choix ultérieur d’une cible. Sur mobile, les créatures et terrains du champ ouvrent aussi leur aperçu : attaque, retrait de la sélection, annulation, blocage, choix de cible ou production de mana selon l’état de la partie. Sélectionner un attaquant ferme l’aperçu ; la confirmation de l’attaque se fait uniquement sur le plateau, à côté de la fin du tour. L’annulation de la dernière action reste sur le plateau, à côté de la fin du tour, et non dans l’aperçu. Les actions indisponibles sont désactivées. Les statistiques d’une créature en jeu reflètent ses valeurs actuelles.

L’aperçu ne contient plus le texte explicatif bleu : seuls les effets, statistiques, compteurs de terrains et actions restent affichés.

Les piles de terrains sont uniquement une présentation : chaque terrain reste une instance distincte dans le moteur. Une production manuelle engage le prochain terrain disponible de la pile ; le paiement automatique, le choix de couleur de Pétra, le dégagement et l’annulation conservent leur fonctionnement. Les piles restent droites et leurs compteurs demeurent dans leur cadre. Une carte terrain jouée rejoint sa pile existante lors de l’animation.

Les attaquants sont couchés à 90° dès leur déclaration et restent couchés après l’attaque. Cette rotation dépend de l’état de la créature et reste prioritaire sur les animations ; annuler la déclaration redresse la carte.

Le glisser-déposer reste disponible. Les flèches de blocage suivent le défilement. Le grand aperçu conserve un fond lisible, mais son voile extérieur est léger et le plateau n’a plus de grands fonds opaques.

## Orientation

`rpgLandscape.js` demande le plein écran depuis le geste de lancement, puis `screen.orientation.lock('landscape')` quand le navigateur l’autorise. Si l’appareil reste en portrait, un écran de rotation empêche d’interagir avec le duel derrière lui. Aucun artifice CSS ne tourne les coordonnées du plateau.

Safari, certaines WebViews et les aperçus embarqués peuvent refuser les API de plein écran/rotation. Dans ce cas, l’utilisateur tourne physiquement son appareil. Le bouton « Activer le paysage » permet de réessayer ; « Retour au menu » reste accessible.

Dans l’APK, `LetsPlayAndroid.setDuelLandscape` demande `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`, uniquement sur l’URL de confiance du duel. L’orientation précédente est restaurée au retour au menu ou en quittant le jeu. Le manifeste gère déjà les changements d’orientation sans recréer l’activité. **Cette nouvelle méthode native nécessite de reconstruire et installer l’APK** ; une ancienne APK utilise le repli navigateur.

## Vérifications

```sh
npm ci
npx playwright install chromium
npm run dev
# Dans un autre terminal :
npm run check:rpg-mobile
npm run check:rpg
npm run check:rpg-ui
npm run build
```

- Tests purs : moteur, audio, gestes, piles de terrains (paiement, production individuelle, dégagement, restauration) et cycle de vie de l’orientation, y compris les refus et promesses tardives.
- Tests React/jsdom : prévisualisation, jeu, mana insuffisant, limite de terrain, annulation, sélection d’attaque, annulation, confirmation, interdiction d’attaquer deux fois et terrain engagé.
- Tests Chromium : repli portrait, plateaux 568×320, 667×375, 844×390 et 1024×768 sans recouvrement des zones ; aperçu et actions au toucher ; jeu d’un terrain par glisser-déposer après rotations ; retour au menu.

Variables facultatives : `RPG_URL`, `CHROMIUM_EXECUTABLE_PATH` et `RPG_SCREENSHOT` (capture de l’aperçu).

La compilation web et les tests de navigateur ne valident pas l’APK natif. Vérifier aussi sur Android/iOS réels, en particulier les encoches, barres système, verrouillages d’orientation et retours vers le menu.
