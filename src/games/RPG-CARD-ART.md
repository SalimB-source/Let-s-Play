# Direction artistique des cartes RPG

Toute nouvelle carte du duel doit recevoir une illustration **full art** avant d’être ajoutée au catalogue.

## Format des fichiers

- Fichier local `public/cards/<identifiant>.jpg`, au ratio **exact 4:5** de la
  face (1024×1280 livrés), illustration plein cadre jusqu'aux bords : aucune
  marge, aucun liseré blanc, aucun fond rapporté. Les peintures livrées dans un
  autre cadrage sont recadrées **puis** validées par le garde-fou
  `PLEIN_ART_45` de `tests/rpg-duel.test.js`, qui mesure le ratio dans le JPEG.
- Le champ `art` d’une carte ne sert qu’à pointer vers une illustration dédiée existante (`cardArtId`). Pour une nouvelle carte, utiliser son propre identifiant et livrer le JPG correspondant.
- Pas de cadre, bordure, bannière, cartouche vide, nom, texte, coût, symbole d’élément, statistique ou autre interface dessinée dans l’image. L’interface du jeu superpose elle-même les repères lisibles.
- Illustration peinte, détaillée et cinématographique, avec un cadrage conçu pour rester clair dans une carte portrait et un aperçu réduit.

## Direction picturale — refonte adulte

La collection adopte une fantasy adulte, sobre et incarnée, peinte comme une huile sur toile : modelés naturalistes, gestes et matières crédibles, clair-obscur maîtrisé, glacis profonds, touches de pinceau visibles et texture de toile discrète. Favoriser les compositions cinématographiques, les visages mûrs et expressifs, les palettes terreuses nuancées et les détails de matière plutôt que le spectaculaire facile.

Éviter l’esthétique cartoon, anime, jeunesse, le rendu 3D lisse, le concept art numérique trop brillant, les poses de catalogue et les effets magiques envahissants. Les personnages, vêtements, paysages, architectures et objets doivent rester dignes et documentés, avec une inspiration amazighe et nord-africaine respectueuse, sans clichés d’exotisme.

Cette direction s’applique à toute la collection sans exception — Sable, Eau, Braise, terrains, créatures, héros et magies. Chaque carte garde sa propre scène et son sujet clairement identifiable même en petit aperçu. La couleur de l’élément peut influencer la lumière et la palette, mais ne doit pas devenir un badge dessiné dans l’image. L’illustration reste une peinture plein cadre sans texte intégré; l’interface HTML/CSS superpose séparément types, coûts, icônes et statistiques.

Les terrains gardent une illustration plein cadre, mais ne reçoivent ni coût ni badge élémentaire.

## Les créatures-jetons

Un effet peut faire entrer en jeu des créatures **créées sur-le-champ**, sans
carte en main ni sable payé : les **créatures-jetons**. Elles sont déclarées
dans `RPG_JETON_CARDS` (`rpgCards.js`), hors de `RPG_DUEL_CARDS` — le catalogue
sait donc les peindre (`cardById`) sans les rendre collectionnables ni
jouables dans un deck.

- **Chien de sable** (`chien-de-sable.jpg`) — le jeton de Tarek : quand il
  arrive en jeu, il crée deux chiens de sable 1/1 sans coût. La peinture est
  livrée en plein art 4:5 (1024×1280), dans la palette, la lumière de fin de
  jour et la matière de sable sculpté de l'illustration de Tarek
  (`public/cards/tarek.jpg`), sans texte ni interface : deux chiens de sable
  debout sur une crête rocheuse, les ruines de la côte dans le lointain.

Une créature-jeton suit les règles communes de l'illustration : sujet unique et
lisible même en vignette, cadre et statistiques superposés par l'interface.

## Variantes illustrées des terrains

Chaque variante est une carte autonome à peinture dédiée, mais reprend strictement
le type, le coût nul et la production de mana de son terrain d’origine. Les
paquets préconstruits mélangent les deux versions pour renouveler les terrains
visibles en main et sur la table ; la campagne reprend aussi les variantes du
Sable et de la Neige dans ses decks personnalisés.

- **Dunes du Ténéré** (`dunes-du-tenere.jpg`) — variante Sable du Désert ;
- **Crêtes de cendre** (`cretes-de-cendre.jpg`) — variante Braise de la Montagne ;
- **Lagune des salines** (`lagune-des-salines.jpg`) — variante Eau de la Mer ;
- **Pétra des deux sources** (`petra-des-deux-sources.jpg`) — variante rare
  hybride de Pétra, déblocable avec Pétra à l’étage `listes-4` ;
- **Glacier des arches** (`glacier-des-arches.jpg`) — variante Neige du Glacier.

Ces cinq peintures sont des pleins arts verticaux au ratio de face 4:5, sans
texte ni symbole incrusté. Le champ `varianteDe` de `rpgCards.js` garde la
correspondance de règles explicite ; chaque variante reste une référence
cataloguée afin que le deck puisse réellement la jouer.

## État du set Neige

Le **Serment des Neuf Hivers** (couleur Neige, cadre bleu clair `#a9e0f5`,
badge ❄️) est entièrement peint : ses dix-neuf cartes originales — Glacier,
Guerrier au bouclier rond, Loup des neiges, Scalde des runes, Valkyrie au
corbeau, Berserk des trois hivers, Jarl au marteau de guerre, Valkyrie des
glaces, Géant des banquises, Drakkar à tête de dragon, Éclair du marteau, Mur
de boucliers, Festin des vaillants, Brume du fjord, Hurlement du blizzard, le
Père des corbeaux, le Maître du marteau, la Dame des neuf mondes et le Serpent
du monde — ont leur plein art dédié dans `public/cards/`. Le Glacier possède
aussi une seconde peinture jouable, **Glacier des arches**, qui partage sa
production de Neige.

Les **figures du Nord** sont peintes comme des personnes, chacune avec son
attribut, parce que leur sujet ne doit jamais se réduire à un objet :

- le **Maître du marteau** (le Tonnerre) — un colosse à la chevelure et à la
  barbe rousses, gantelets de fer et large ceinture cloutée, marteau runique
  levé sous l’orage. C’est le seul moyen de ne pas le confondre avec
  l’Éclair du marteau, la magie du set, qui montre le marteau seul fendant le
  ciel ;
- le **Père des corbeaux** — un vieux marcheur à large chapeau de voyage,
  corbeaux sur les épaules et vol de corbeaux dans la tempête (et non un
  sorcier à chapeau pointu, qui n’aurait rien du Nord). Depuis sa refonte
  (coût 6, 5/5, foudre activée), sa peinture est une **illustration
  photoréaliste** — direction demandée explicitement pour cette figure,
  tranchant sur l’huile du reste de la collection ;
- la **Dame des neuf mondes** — une femme au foyer de bois, le fil à la main ;
- le **Serpent du monde** — le corps en anneau qui entoure les eaux.

## État des sept magies reprises en plein art 4:5

Sept sorts du catalogue portaient une illustration prêtée, ou un cadrage qui
n'était pas celui de la face. Ils ont chacun leur peinture 4:5 depuis cette
passe (`public/cards/<identifiant>.jpg`) :

- **Eau de la source** — la vasque cachée sous la roche, coupe d'argile au bord
  de l'eau calme ; elle ne regarde plus la peinture du terrain Mer ;
- **Lame de mer** — la crête d'une vague effilée en lame de fond, un cotre au
  large pour l'échelle ;
- **Brisure de verre** — le voile d'eau vitrifiée saisi à l'instant où il se
  fend, éclats vers le spectateur ;
- **Parade de verre** — la muraille de sable fondu, lance et flamme prises dans
  la vitre, gardiens épaule contre épaule ;
- **Déflection** (fichier `maree-contraire.jpg`) — zoom sur le visage du
  sorcier en méditation, anneaux bleus d'ultrason qui renvoient le sort ;
- **Ressac** — le djinn noir aspiré par le tourbillon, saisi de près ;
- **Courant de retour** — le même geste vu du rivage : le courant remporte le
  djinn au large, une lanterne échouée revient seule vers le sable.

Le terrain **Mer** n'est plus partagé par aucune autre carte : la liste des
partages tolérés dans `tests/rpg-duel.test.js` est vide. Toute repeinture d'un
fichier existant se déclare dans `CARD_ART_CACHE_VERSIONS`
(`RpgDuelPage.jsx`) — sans ce `?v=`, le cache resservirait l'ancienne peinture
sous le même nom.

Chaque peinture garde son sujet propre même en vignette de 60 px. Une carte dont la peinture resterait à faire se déclare dans
`RPG_ART_PROVISOIRE` (`rpgCards.js`) : elle affiche alors le recadrage étalonné
d'une illustration voisine, et `npm run check:rpg` vérifie que la liste ne
contient que des cartes réellement livrées, image comprise. Les types, coûts, icônes et statistiques de jeu restent des éléments HTML/CSS séparés de l’illustration.
