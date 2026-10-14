# 12 — Le décor 3D de la table

La table du duel reste une **peinture plein cadre sous des cartes en DOM**
(voir `04-progression-da.md`). Le décor 3D ne la remplace pas : un canvas
Three.js se glisse **entre la peinture CSS et les cartes** et lui donne du
relief, de la lumière et du mouvement. Rien de ce qui se joue n'y est dessiné :
glisser-déposer, tactile, flèches de blocage, compteurs et tests existants ne
changent pas.

## Ce que fait la 3D

- **Relief** : un plan portant la peinture du plateau, avec une carte de relief
  tirée de sa luminance (joints de dalles, dunes, fissures, veines de braise) ;
  le bord de la table se relève vers la caméra, le centre reste plat.
- **Lumière vivante** : bougies qui vacillent (Table des Heures), soleil rasant
  qui dérive (Erg, Gourara, Tipaza), aurore (Îles Célestes), lumières qui
  glissent (Désert de Verre, Abysses).
- **Surface** : ombres de nuages qui défilent, ou caustiques sous la mer.
- **Particules** à plusieurs hauteurs : poussière, sable soufflé, neige, bulles,
  braises, éclats de verre.
- **Parallaxe** : la caméra respire et suit la souris (jamais le doigt).

Les huit plateaux ont leur ambiance (`rpgTableSceneThemes.js`). Un identifiant
inconnu retombe sur celle de la Table des Heures.

## Objets 3D posés sur le plateau

Certains objets peints du plateau sont reconstruits en vrais objets 3D
(`src/games/rpgTableObjects.js`) : ils reçoivent la lumière, projettent une
ombre portée sur la table et reflètent un environnement doux. Plateaux livrés :

| Plateau | Objets 3D |
| --- | --- |
| Erg du Sahara | lanterne (vraie lumière), gourde, galets, bol, corde |
| Caravane de Gourara | tapis roulé (motif kilim), corde, compas de laiton à couvercle ouvert, outre |
| Ruines de Tipaza | la pièce de monnaie et les quatre escargots (fûts, chapiteau, amphore et tessons restent peints) |
| Fjord des Neuf Hivers | lanterne de fer, cor à boire, hache, corde, bâton de runes |
| Désert de Verre | les cinq roses de verre, l'astrolabe de laiton, la corde et l'outre |
| Abysses Phosphorescentes | la raie manta (battement d'ailes) et l'anneau de coquillages |
| Îles Célestes | les douze sapins et les sept rochers des berges, la corde (berges de roche et lanterne restent peintes) |

Les autres plateaux n'ont pas d'objets (`objets: []`) et gardent leur peinture
inchangée.

- **Plaque vide.** Pour ne pas voir l'objet en double, le thème déclare une
  `plaque` : la peinture sans ces objets (`public/plateau-erg-du-sahara-vide.jpg`,
  2048 px). Elle n'alimente que la 3D ; le fond CSS (et donc le repli sans
  WebGL) garde la peinture d'origine avec ses objets peints. Elle est fabriquée
  par un script de `scripts/plaque-vide/` : de la matière prélevée ailleurs dans
  la peinture (ou d'une image donneuse) comble uniquement la zone des objets, le
  reste de la peinture est inchangé au pixel près. Deux procédés selon le fond :
  polygones manuels relevés sur la peinture, comblés par fusion de gradient sur
  le sable, la roche ou les volutes (`caravane-de-gourara.py`,
  `fjord-des-neuf-hivers.py`, `desert-de-verre.py`) ; comblement par le pourtour
  quand le fond est lisse et l'objet petit ou opaque, sapins et coquillages
  compris (`ruines-de-tipaza.py`, `abysses-phosphorescentes.py`,
  `iles-celestes.py`).
- **Placement.** Chaque objet est déclaré en coordonnées de l'image
  (`u`, `v` en fraction de largeur/hauteur, `v` vers le bas ; `size` = largeur
  de l'objet en fraction de l'image ; `angle` en degrés). `tableObjectTransform`
  applique le même cadrage « cover » que la peinture : l'objet reste collé à son
  emplacement peint à tout redimensionnement.
- **Pose à plat.** Les objets sont posés à plat, à la hauteur maximale du relief
  sous leur emprise (`rimHeight`) et pivotent seulement autour de Z. Ne pas les
  incliner sur la normale du rebord : la table y est une cuvette convexe, le
  plan tangent passe sous la surface et la moitié de l'objet est avalée.
- **Lumière.** La lanterne porte une vraie `PointLight` (vacillement lent) ;
  les ombres (PCFSoft) sont désactivées par le budget sur les petits écrans
  (`objects`, `shadows`, `shadowSide`).
- **Libération.** `disposeTableObject` libère géométries, matériaux et lumière
  quand le décor est coupé ou le plateau change ; le canvas expose
  `data-objects` (nombre d'objets posés) pour les vérifications.

Ajouter les objets d'un autre plateau : lister ses objets dans le thème
(`objets`), produire sa plaque vide sur le modèle du script, puis vérifier les
alignements avec `tableObjectTransform` aux formats 1, 3:2, 16:9 et 2,4:1.
Objets peints repérés pour la suite : Fjord (lanterne, cor, corde, hache), Tipaza
(fûts, chapiteau), Désert de Verre (roses de verre, astrolabe, outre, corde),
Abysses (coraux, colonnes, amphores), Îles (sapins, rochers, lanterne, corde).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgTableSceneThemes.js` | Données pures : ambiances, budgets, particules (testable sous Node) |
| `src/games/rpgTableScene.js` | La scène Three.js (chargée à la demande) |
| `src/games/rpgTableObjects.js` | Modèles 3D procéduraux des objets (bol, galets, corde, gourde, lanterne, amas de cristaux) |
| `scripts/plaque-vide/` | Fabrication des plaques sans objets peints (un script par plateau) |
| `src/games/RpgTableScene3D.jsx` | La vue React, premier enfant de `.card-table` |
| `tests/rpg-table-3d.test.js` | Catalogue, bornes, particules, budget, cadrage, géométrie, bruits, objets 3D |
| `scripts/rpg-table-3d-check.mjs` | Vrai rendu WebGL (Chromium) |

## Garde-fous

- **Repli** : la peinture CSS reste le fond. Sans WebGL2, sans peinture, ou si le
  contexte est perdu, c'est elle qu'on voit, comme avant.
- **Sous le chrome** : `z-index: -1` dans l'isolat de `.card-table`,
  `pointer-events: none`, `aria-hidden`.
- **Budget** : 900 000 pixels (520 000 au doigt), 36 images/s (30 au doigt),
  moins de particules sur écran tactile, textures bornées à 2048 px (1536).
- **Pause** : onglet caché, glisser ou vol de carte. `prefers-reduced-motion`
  garde une vraie vue 3D mais fixe, sans boucle.
- **Dégradation** : sous 18 images/s en moyenne, le décor perd des pixels, puis
  ses particules, puis rend la main à la peinture CSS.
- **Réglage** : bouton « 3D » dans la barre du duel, mémorisé
  (`letsplay_sablier_decor3d_v1`), actif par défaut.
- **Rien d'externe** : bruits et sprites sont générés localement, la peinture
  est celle déjà chargée par le fond CSS.

## Vérifications

- `npm run check:rpg-table-3d` : catalogue, bornes, particules, budgets.
- `npm run check:rpg-table-3d-ui` (serveur Vite + Chromium) : rendu réel, couches,
  pause pendant un glisser, bouton, repli sans WebGL2, `reduced-motion`,
  téléphone en paysage, chaque plateau à objets (plaque vide chargée, objets posés, repli CSS intact).
  Le test attend l'image suivante (au plus 15 s) : le rendu logiciel de CI est lent.

## Limites connues

- La peinture est un peu plus cadrée qu'en CSS (≈ 3,5 % de marge pour la
  parallaxe) : les objets de bord peuvent être légèrement rognés.
- Sur 568 px de large, la barre du duel déborde déjà sur la plaque du sorcier ;
  le bouton 3D y est réduit au minimum.
- Aux formats très larges (2,4:1) ou carrés, le cadrage « cover » rogne les
  objets de coin, comme leur peinture : c'est voulu.
- Les objets sont procéduraux (formes simples) : à distance de jeu ils
  se confondent avec la peinture, de près on les reconnaît comme des maquettes.
- Pistes : objets des autres plateaux, décor 3D
  pour le mode Histoire.
