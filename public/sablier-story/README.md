# La Dernière Liste — illustrations canoniques

Trois portraits IA générés une fois pour l’épisode I : `scribe.jpg`,
`puisatier.jpg`, `mahieddine.jpg`. Le quatrième fichier, `greffe.jpg`, est un
**décor sans personnages**, composé séparément derrière les dialogues.

Le registre de référence est `src/games/rpgStoryCast.js`. Toutes les
apparitions d’un personnage réutilisent son même fichier. Ne pas créer de
portraits indépendants pour chaque scène et ne pas remplacer les cartes
existantes des compagnons.

Références de style : les peintures de `public/sablier-tours/tour-des-listes.jpg`,
`public/cards/yamina.jpg` et `public/cards/guetteur-du-beffroi.jpg`.
Les portraits existants de Salem, Yamina, Fériel, Tarek et Boualem restent
inchangés dans `public/cards/`.

## `stands/` — les personnages découpés du plateau

`stands/stand-<id>.webp` est le **sprite détouré** (fond transparent) du
personnage `<id>` du registre : c’est lui que la scène pose sur le décor, à
gauche et à droite de la boîte de dialogue. Les fichiers sont dérivés de la
**peinture canonique** du personnage — même visage, même tenue, mêmes
accessoires — par `tools/make-stands.py`, à partir des sources à fond magenta
de `tools/stands-raw/`.

**Tout personnage qui parle a son sprite** : les cinq héros, la Scribe, le
Guetteur, le Puisatier des Cendres, Mahieddine, et les figures des actes II à V
(le Marchand de sable, la Gardienne des ksour, le Djinn du tournant, la Reine
des étals, le Pêcheur de perles, la Nageuse des puits, le Sonneur d’écume, le
Dévoreur de l’abîme, la Garde du fjord, la Meute des neiges, la Valkyrie du
fjord, le Maître des Neuf Hivers, le Dernier Fennec, l’Ifrit des ergs,
l’Horloger du Zénith). Le **narrateur** n’en a pas : Bab El parle sans corps,
le décor porte la scène.

### `stand-<id>-<pose>.webp` — les poses selon la situation

Un personnage peut avoir, en plus de sa pose de référence, des **variantes de
situation** : `affrontement` (garde du dernier échange avant un duel),
`apaisement` (détente du dernier échange après un duel) — et `decision` pour
les figures qui posent une décision au lecteur. Elles se déclarent dans le
registre, sous `poses` :

```js
salem: { …, stand: '…/stand-salem.webp', poses: {
  duel: 'sablier-story/stands/stand-salem-affrontement.webp',
  choix: 'sablier-story/stands/stand-salem-decision.webp',
  apres: 'sablier-story/stands/stand-salem-apaisement.webp',
} }
```

Recette d’une variante : même peinture, même visage, même tenue que la pose de
référence (elle sert de **source de composition**), mais une autre posture —
puis la même chaîne `tools/make-stands.py <id>-<pose> --debug`.

Livrées : la garde et la détente de **toutes les figures détourées** — les cinq
héros, les figures de la Chambre (Scribe, Guetteur, Puisatier des Cendres) et
tous les antagonistes des actes I à V (Marchand de sable, Gardienne des ksour,
Djinn du tournant, Reine des étals, Pêcheur de perles, Nageuse des puits,
Sonneur d’écume, Dévoreur de l’abîme, Garde du fjord, Meute des neiges,
Valkyrie du fjord, Maître des Neuf Hivers, Dernier Fennec, Ifrit des ergs,
Horloger du Zénith) — plus la **pose de décision** des sept figures qui posent
une question au lecteur : Salem, Yamina, la Scribe, le Djinn du tournant,
Boualem, Mahieddine et la Valkyrie du fjord.

Le **nom du fichier** dit la situation : `stand-<id>-<suffixe>.webp`, avec le
suffixe déclaré par la situation (`affrontement`, `decision`, `apaisement`).
Une situation sans variante garde la pose de référence : aucune figure n’est
obligée d’en avoir une, et une variante ne se partage jamais entre deux
personnages.

Recette d’un contour propre : l’outil **étale la couleur du personnage sous ses
pixels transparents** avant la plume (`etaler_couleur`) et désincruste à
`DESPILL = 22`. Sans cette étape, le magenta du fond survit sous le bord et le
flou d’alpha le révèle : tous les sprites portaient un liseré rose. Après toute
régénération, `python3 tools/check-stands.py` mesure le liseré et le gabarit
(un sprite plus court que 900 px vient d’une source cadrée trop large ou basse
résolution : régénérer la source en cadrage portrait) et nomme les fichiers à
reprendre.

Recette d’une nouvelle figure :

1. générer la source `tools/stands-raw/<id>.jpg` **à partir de la peinture
   canonique** (le visage et la tenue ne changent pas), sur fond magenta uni,
   figure entière, des pieds à la tête ;
2. `python3 tools/make-stands.py <id> --debug` — le fond est retiré par
   inondation, le halo magenta désincrusté, le sprite rogné puis écrit en WebP
   transparent (900 px de haut au plus) ;
3. vérifier l’aperçu composite de `tools/stands-raw/debug/` sur le bleu nuit
   du jeu : aucun liseré rose, aucun morceau de fond resté collé ;
4. déclarer le fichier dans `RPG_STORY_CAST` (`stand: 'sablier-story/stands/…'`).

Les tests refusent un personnage sans sprite, un sprite annoncé mais non livré,
et un WebP sans canal alpha. Toute nouvelle passe de détourage doit incrémenter
la révision `?v=` de `standHistoire()` pour qu’aucun cache ne resserve
l’ancienne image.

Voir `docs/rpg/11-bible-visuelle.md` pour les références, les tenues et les
règles de continuité des futurs chapitres.
