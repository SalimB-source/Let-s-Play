# Pixel Runner — Structure

- `src/games/PixelRunner.jsx` — composant de page, boucle Canvas 2D, physique légère, collisions, score et entrées clavier/tactile.
- `src/games/pixel-runner.css` — habillage Let’s Play, HUD, overlay de démarrage et responsive.
- `public/pixel-runner-bg.jpg` — arrière-plan néon généré pour l’ambiance du jeu.
- `src/main.jsx` — route `/games/pixel-runner`.
- `src/components/Layout.jsx` — entrée Jeux dans la navigation et le footer.

Le MVP reste volontairement autonome : pas de backend, le meilleur score est stocké dans `localStorage` sous `lets-play-pixel-runner-best`.
