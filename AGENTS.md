# Instructions pour les contributions

## Direction artistique du Sablier

Pour toute nouvelle illustration du jeu Le Sablier, adopter par défaut une esthétique de dark fantasy inspirée d’Elden Ring et de Dark Souls : ambiance sombre, détails soignés et mise en scène cinématographique. Adapter le sujet, le cadrage et les couleurs à la carte ou à l’élément demandé.

Si l’utilisateur demande explicitement un autre style pour une illustration, sa demande prime sur cette règle. Cette règle ne demande pas de modifier les illustrations existantes.

## Traduction obligatoire à la publication

Chaque nouvel article doit être traduit intégralement en anglais et en arabe dans le même lot de modifications que sa version française, avant d’être considéré comme prêt à publier. Ne pas différer les traductions à une édition ou une PR ultérieure.

Inclure les métadonnées des cartes (titre, accroche, résumé, catégorie, texte alternatif et temps de lecture), le corps complet et les textes éditoriaux des médias (notes, crédits et mentions d’absence). Utiliser le système existant dans `src/news/localized/{en,ar}` et vérifier que les traductions sont effectivement chargées dans les deux langues. Conserver les faits, dates, réserves et crédits officiels de la version source.

Le repli en français est un mécanisme de secours, pas un état acceptable pour un nouvel article livré. Un build ou un contrôle de rendu réussi ne suffit pas à démontrer que les traductions sont présentes. Signaler explicitement toute traduction manquante et ne pas annoncer l’édition comme terminée tant que les deux langues ne sont pas couvertes.

## Visuels sociaux à chaque édition

À chaque nouvelle édition quotidienne (demande du type « ajoute les news du jour »), produire aussi les **visuels sociaux**, en plus des trois articles et de leurs traductions :

1. **Le récapitulatif** — `scripts/visuels/make_social_3_actus.py` : une image 1080 × 1350 par langue (`-fr`, `-en`, `-ar`), trois blocs d’actus, un bandeau illustré effacé derrière chacun.
2. **Les slides** — `scripts/visuels/make_social_actu_slides.py` : un slide 1080 × 1350 par actu et par langue (vignette en haut, rubrique, titre, accroche, trois points clés précédés d’un **losange** — jamais de numéros, source officielle en pied).

Règles à respecter :

- **Charte** : fond violet `#4F3494`, jaune `#f7d900`, vert acide `#e7fd52`, filet lilas `#8C76D0`, logo `public/lets-play-logo.png`. Pas d’adresse de site en pied, seulement les sources officielles.
- **Trois langues** : FR, EN et AR, avec les mêmes faits et les mêmes réserves que les articles publiés. L’arabe est en RTL (logo et barre jaune à droite, texte composé en Tajawal via `arabic_text.py`).
- **Vignettes** : déposées dans `scripts/visuels/assets/` avec leurs crédits, puis recadrées, assombries, voilées vers le violet et effacées en dégradé. Si une vignette manque, le bloc retombe sur le fond uni plutôt que d’inventer une image.
- **Sortie** : les PNG vont dans `visuels/social/`, **hors dépôt** (`/visuels/` est ignoré) : l’utilisateur les télécharge et les publie lui-même. Seuls les scripts, les vignettes sources et le README de l’atelier sont commités.
- **Mode d’emploi** : dupliquer les dictionnaires de textes du script pour la nouvelle date, mettre à jour la liste `SLIDES` (slug, visuel, textes), régénérer, puis vérifier chaque image à l’œil avant de livrer.

## Sources des articles

Ne jamais afficher de références à des médias tiers dans les blocs de sources en fin d’article ou les liens de sources des galeries. Seules les sources officielles (constructeurs, studios, éditeurs, diffuseurs, organismes concernés) peuvent y apparaître. Cette règle vaut pour les archives et les futurs articles. Le rendu utilise `src/lib/articleSources.js`, avec une liste de domaines vérifiés : tout nouveau domaine doit être contrôlé avant ajout ; ne jamais autoriser un média ou une plateforme entière de contenus utilisateurs. Conserver les métadonnées de recherche en interne et les crédits de droits des images/vidéos. Ne pas transformer une estimation ou une information de presse en confirmation officielle.
