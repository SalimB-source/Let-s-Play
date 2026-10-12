# Direction artistique des cartes RPG

Toute nouvelle carte du duel doit recevoir une illustration **full art** avant d’être ajoutée au catalogue.

## Format des fichiers

- Fichier local `public/cards/<identifiant>.jpg`, en portrait proche du ratio 4:5.
- Le champ `art` d’une carte ne sert qu’à pointer vers une illustration dédiée existante (`cardArtId`). Pour une nouvelle carte, utiliser son propre identifiant et livrer le JPG correspondant.
- Pas de cadre, bordure, bannière, cartouche vide, nom, texte, coût, symbole d’élément, statistique ou autre interface dessinée dans l’image. L’interface du jeu superpose elle-même les repères lisibles.
- Illustration peinte, détaillée et cinématographique, avec un cadrage conçu pour rester clair dans une carte portrait et un aperçu réduit.

## Direction picturale — refonte adulte

La collection adopte une fantasy adulte, sobre et incarnée, peinte comme une huile sur toile : modelés naturalistes, gestes et matières crédibles, clair-obscur maîtrisé, glacis profonds, touches de pinceau visibles et texture de toile discrète. Favoriser les compositions cinématographiques, les visages mûrs et expressifs, les palettes terreuses nuancées et les détails de matière plutôt que le spectaculaire facile.

Éviter l’esthétique cartoon, anime, jeunesse, le rendu 3D lisse, le concept art numérique trop brillant, les poses de catalogue et les effets magiques envahissants. Les personnages, vêtements, paysages, architectures et objets doivent rester dignes et documentés, avec une inspiration amazighe et nord-africaine respectueuse, sans clichés d’exotisme.

Cette direction s’applique à toute la collection sans exception — Sable, Eau, Braise, terrains, créatures, héros et magies. Chaque carte garde sa propre scène et son sujet clairement identifiable même en petit aperçu. La couleur de l’élément peut influencer la lumière et la palette, mais ne doit pas devenir un badge dessiné dans l’image. L’illustration reste une peinture plein cadre sans texte intégré; l’interface HTML/CSS superpose séparément types, coûts, icônes et statistiques.

Les terrains gardent une illustration plein cadre, mais ne reçoivent ni coût ni badge élémentaire.

## État du set Neige

Le **Serment des Neuf Hivers** (couleur Neige, cadre bleu clair `#a9e0f5`,
badge ❄️) est entièrement peint : ses dix-neuf cartes — Glacier, Guerrier au
bouclier rond, Loup des neiges, Scalde des runes, Valkyrie au corbeau, Berserk
des trois hivers, Jarl au marteau de guerre, Valkyrie des glaces, Géant des
banquises, Drakkar à tête de dragon, Éclair du marteau, Mur de boucliers,
Festin des vaillants, Brume du fjord, Hurlement du blizzard, le Père des
corbeaux, le Maître du marteau, la Dame des neuf mondes et le Serpent du monde
— ont leur plein art dédié dans `public/cards/`.

Les **figures du Nord** sont peintes comme des personnes, chacune avec son
attribut, parce que leur sujet ne doit jamais se réduire à un objet :

- le **Maître du marteau** (le Tonnerre) — un colosse à la chevelure et à la
  barbe rousses, gantelets de fer et large ceinture cloutée, marteau runique
  levé sous l’orage. C’est le seul moyen de ne pas le confondre avec
  l’Éclair du marteau, la magie du set, qui montre le marteau seul fendant le
  ciel ;
- le **Père des corbeaux** — un vieux marcheur à large chapeau de voyage,
  corbeaux sur les épaules et vol de corbeaux dans la tempête (et non un
  sorcier à chapeau pointu, qui n’aurait rien du Nord) ;
- la **Dame des neuf mondes** — une femme au foyer de bois, le fil à la main ;
- le **Serpent du monde** — le corps en anneau qui entoure les eaux.

Chaque peinture garde son sujet propre même en vignette de 60 px. Une carte dont la peinture resterait à faire se déclare dans
`RPG_ART_PROVISOIRE` (`rpgCards.js`) : elle affiche alors le recadrage étalonné
d'une illustration voisine, et `npm run check:rpg` vérifie que la liste ne
contient que des cartes réellement livrées, image comprise. Les types, coûts, icônes et statistiques de jeu restent des éléments HTML/CSS séparés de l’illustration.
