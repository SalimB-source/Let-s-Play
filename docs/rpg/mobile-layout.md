# Affichage mobile du Sablier de Bab El

La couche `src/games/rpg-mobile.css` est chargée après la feuille historique du duel. Elle remplace les positions absolues par des pistes de grille jusqu’à 1 100 px, sans changer les règles de jeu.

- **Portrait et tablettes** : navigation, identité adverse et compteurs, terrains adverses, deux champs distincts, terrains du joueur, identité du joueur et compteurs, commandes, main.
- **Téléphones en paysage** (hauteur ≤ 550 px) : champs à gauche, terrains dans une colonne dédiée, commandes défilables à droite, main en bas. Les compteurs de paquet et de cimetière figurent dans les identités.
- **Écrans courts** : cartes et espacements plus compacts. Si le contenu ne tient pas, la table défile verticalement plutôt que de superposer les commandes et la main.
- **Cartes** : défilement horizontal conservé, aperçu détaillé au toucher et déplacement vertical pour jouer. Les flèches de blocage sont recalculées après défilement.
- Les marges système et encoches restent gérées par `.rpg-battle`.

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

Le contrôle navigateur couvre 320×568, 375×667, 390×844, 844×390, 768×1024 et 1024×768 : pas de débordement horizontal de la table, pas de recouvrement entre champs/commandes/main, cartes non coupées verticalement et bouton de fin du tour d’au moins 44 px. Il joue aussi un terrain avec de vrais événements tactiles Chromium après changements d’orientation, puis ouvre un aperçu.

Variables facultatives : `RPG_URL` pour une autre URL locale et `CHROMIUM_EXECUTABLE_PATH` pour un Chromium déjà installé.

Ces tests de navigateur ne remplacent pas une validation sur appareil Android/iOS réel, notamment pour les encoches, la barre système et le comportement de la WebView.
