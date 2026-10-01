# Mirage Rush — miniatures des terrains

Dix illustrations originales générées par IA pour le sélecteur de terrain.
Elles reprennent les décors et la direction artistique low-poly du jeu ; ce
sont des illustrations d’ambiance, pas des captures de parties.

| Fichier | Terrain | Ambiance |
| --- | --- | --- |
| `desert.webp` | Dunes de l’Écho | Dunes dorées, oasis turquoise et palais dans le mirage |
| `western.webp` | Dust Creek | Rue du Far West, façades en bois et soleil couchant |
| `prairie.webp` | Plaines d’Or | Champs de blé, clôtures, ferme et lumière dorée |
| `sardinia.webp` | Costa Omertà | Village pastel, terrasses et baie turquoise |
| `alger.webp` | Alger la Blanche | Corniche, façades blanches, palmiers et baie bleue |
| `japan.webp` | Plaines de Yōtei | Mont enneigé, torii et herbes d’argent au clair de lune |
| `ramparts.webp` | Remparts d’Ocre | Remparts crénelés, portes du Mid grandes ouvertes, portes bleues et container |
| `infinity.webp` | Château de l’Infini | Pont de bois laqué, cloisons shōji ambrées, pagodes renversées et lanternes flottantes |
| `airbase.webp` | Thunder Airbase | Piste de base aérienne, F-16 garé, tour de contrôle, drapeau américain et gradins |
| `snakeway.webp` | Chemin du Serpent | Route dorée en S, nuages orange et planète de Kaio à l’horizon |

Chaque image est un panorama WebP **768 × 256**, sans texte intégré. Les noms
restent du texte HTML, avec les états de sélection et de verrouillage habituels.
Les dix fichiers totalisent moins de 330 Ko. Pas de requête vers un hébergeur
externe, pas de rendu WebGL supplémentaire pour les miniatures.

Les imports dans `MirageCoursePicker.jsx` permettent à Vite de versionner les
fichiers et de respecter le chemin de base, y compris `/Let-s-Play/`. Le cadre
conserve sa hauteur compacte sur bureau et mobile pour ne pas repousser le
bouton de lancement. Les images sont décoratives pour les lecteurs d’écran,
chargées dès l’affichage du sélecteur et non glissables au toucher. Le zoom au
survol reste désactivé avec la préférence « animations réduites ».
