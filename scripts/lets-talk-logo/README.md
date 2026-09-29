# Logo « Let’s Talk »

La messagerie (fenêtre flottante, page `/messages`, entrée du menu mobile) a son
propre logo. C’est un cousin du logo Let’s Play : même lettrage italique très
gras, même extrusion violette vers le bas à droite, même liseré. Deux choses
le distinguent :

- « Talk » passe au cyan du site (#22D3EE), là où « Play » est jaune ;
- son emblème est une bulle de discussion avec les trois points
  « en train d’écrire ».

Le script `build_logo.py` vectorise le lettrage (Poppins Black Italic, OFL)
et produit :

| Fichier | Contenu | Usage dans le site |
| --- | --- | --- |
| `public/lets-talk-logo.svg` | bulle + « Let’s Talk » sur une ligne | lanceur, en-têtes, menu mobile |
| `public/lets-talk-logo-stacked.svg` | « Let’s » au-dessus de « Talk », comme le logo Let’s Play | invitation à se connecter |
| `public/lets-talk-mark.svg` | la bulle seule, carrée | onglets, menu profil, volet vide |
| `src/social/letsTalkLogoData.js` | tracés et réglages des trois variantes | composant `LetsTalkLogo` |

Dans l’application, le logo est rendu en ligne par
`src/social/LetsTalkLogo.jsx`, qui lit `letsTalkLogoData.js`. Les SVG de
`public/` sont des fichiers autonomes (réseaux sociaux, presse, icône…).

Les couleurs sont les mêmes sur les deux thèmes. Le liseré et l’extrusion
violets gardent le contraste sur fond sombre comme sur fond clair.

## Régénérer

```bash
python3 -m pip install -r scripts/lets-talk-logo/requirements.txt
python3 scripts/lets-talk-logo/build_logo.py
```

Les réglages (rotation de chaque variante, taille de la bulle, approche des
lettres, couleurs) sont en tête du script.

Pour essayer un réglage sans toucher au dépôt, passez un dossier de sortie :
`--out /tmp/lets-talk`.

La fonte est embarquée dans `fonts/`, avec sa licence (`OFL.txt`), pour que le
rendu reste déterministe.
