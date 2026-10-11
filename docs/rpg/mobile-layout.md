# Duel mobile : paysage et actions directes

## Présentation

`src/games/rpg-mobile.css` contient la présentation tactile, activée par `.rpg-battle--touch` (application Android, pointeur tactile ou fenêtre ≤ 1 100 px).

Le plateau conserve les illustrations originales de Bab El, avec une organisation inspirée des jeux de cartes numériques en paysage :

- deux champs au centre, sans panneaux opaques ;
- terrains identiques regroupés par type dans chaque camp, avec uniquement le compteur total sur la carte (disponibilités dans le libellé accessible) ;
- identités et compteurs flottants ;
- main en bas, défilable horizontalement ;
- commandes « Attaquer avec tous », confirmation/annulation de l’attaque, annulation de la dernière action et fin du tour regroupées côte à côte sur le plateau, selon la phase ;
- progression des phases immédiatement au-dessus des commandes, avec la phase actuelle mise en évidence.

Le clic sur une carte en main la joue immédiatement, sur ordinateur comme sur mobile : la pose réutilise les validations et les animations du glisser-déposer, y compris le paiement automatique et le choix ultérieur d’une cible. Une carte refusée reste en main et le refus est expliqué (mana, limite de terrain, phase). **Les magies demandent une confirmation** avant le lancement ; Annuler laisse le sort en main. Les créatures et terrains déjà posés agissent aussi directement au clic : attaque ou retrait de la sélection, blocage, choix de cible ou production de mana selon l’état de la partie. La confirmation de l’attaque se fait uniquement sur le plateau, à côté de la fin du tour, où reste aussi l’annulation de la dernière action. Les statistiques d’une créature en jeu reflètent ses valeurs actuelles.

Au survol d’une carte (ordinateur), l’aperçu instantané reste le seul moyen de consulter les détails : effets, statistiques, compteurs de terrains, sans texte explicatif bleu.

Les piles de terrains sont uniquement une présentation : chaque terrain reste une instance distincte dans le moteur. Une production manuelle engage le prochain terrain disponible de la pile ; le paiement automatique, le choix de couleur de Pétra, le dégagement et l’annulation conservent leur fonctionnement. Les types de terrains différents se placent côte à côte sur une seule rangée horizontale, dans les deux camps. Au moins deux piles sont visibles sur les formats paysage testés ; les suivantes sont accessibles par défilement horizontal, sans retour à la ligne. Les rangées sont décalées vers l’intérieur du bois et alignées en bas du champ de chaque camp, hors des bordures et ornements du décor. Les piles restent droites et leurs compteurs demeurent dans leur cadre. Une carte terrain jouée rejoint sa pile existante lors de l’animation.

Les attaquants sont couchés à 90° dès leur déclaration et restent couchés après l’attaque. Cette rotation dépend de l’état de la créature et reste prioritaire sur les animations ; annuler la déclaration redresse la carte.

Le glisser-déposer reste disponible. Les flèches de blocage suivent le défilement. L’aperçu instantané n’a ni fond principal ni cadre ; seul l’encadré des infos garde son fond sombre, et le plateau n’a plus de grands fonds opaques. L’aperçu d’une magie lancée (centré, 1,8 s, aucune carte n’étant survolée) est ce même aperçu : ni liseré, ni halo, ni ombre, ni animation à lui. Seul son `z-index` (`.is-spell-preview`) le distingue, pour rester devant l’annonce « MAGIE JOUÉE ».

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
- Tests React/jsdom : clic-jeu direct, confirmation des magies, mana insuffisant, limite de terrain, annulation, sélection d’attaque, annulation, confirmation, interdiction d’attaquer deux fois et terrain engagé.
- Tests Chromium : repli portrait, plateaux 568×320, 667×375, 844×390 et 1024×768 sans recouvrement des zones ; actions directes au toucher ; jeu d’un terrain par glisser-déposer après rotations ; retour au menu.

Variables facultatives : `RPG_URL`, `CHROMIUM_EXECUTABLE_PATH` et `RPG_SCREENSHOT` (capture du plateau).

La compilation web et les tests de navigateur ne valident pas l’APK natif. Vérifier aussi sur Android/iOS réels, en particulier les encoches, barres système, verrouillages d’orientation et retours vers le menu.

Les cartes posées n’impriment plus leur type sur l’illustration ; celui-ci reste disponible dans l’aperçu au survol et le libellé accessible. Les cartes en main ne sont pas modifiées.
