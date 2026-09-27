# Game Plan: Pixel Runner

## Main Build

MVP d’un endless runner 2D intégré à `/games/pixel-runner` : le personnage avance automatiquement, saute au clavier ou au toucher, évite des obstacles, récupère des pièces et peut activer un bouclier.

- **Assets needed:** arrière-plan néon original généré pour l’ambiance visuelle ; formes Canvas procédurales pour le joueur, les obstacles et les pickups.
- **Verify:**
  - le bouton Jouer démarre une partie et le bouton Rejouer réinitialise l’état ;
  - Space, flèche haut, clic et tap déclenchent le saut ;
  - les obstacles défilent, la vitesse augmente, les collisions provoquent Game Over ;
  - les pièces et boucliers modifient le score et l’état HUD ;
  - le meilleur score est conservé localement ;
  - l’interface reste lisible sur desktop et mobile, sans débordement ;
  - aucune erreur de build ou de console pendant le chargement et une partie.
